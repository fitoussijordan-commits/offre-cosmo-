#!/bin/bash
# Script de setup OffreCosmo
# Lance depuis la racine du projet : bash setup.sh

echo "📦 Création des fichiers..."

# ─── lib/notifications.ts ───────────────────────────────────────────────────
cat > lib/notifications.ts << 'EOF'
const TEAMS_WEBHOOK = process.env.TEAMS_WEBHOOK_URL

export async function notifyTeams({
  title,
  message,
  color = 'FFB347',
}: {
  title: string
  message: string
  color?: string
}) {
  if (!TEAMS_WEBHOOK) return
  try {
    await fetch(TEAMS_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: color,
        summary: title,
        sections: [{ activityTitle: title, activitySubtitle: message }],
      }),
    })
  } catch (e) {
    console.error('Teams webhook error:', e)
  }
}

export async function notifyEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  if (!process.env.RESEND_API_KEY) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'offres@wala-france.com',
        to,
        subject,
        html,
      }),
    })
  } catch (e) {
    console.error('Resend error:', e)
  }
}
EOF

# ─── app/api/tasks/[id]/route.ts ────────────────────────────────────────────
mkdir -p "app/api/tasks/[id]"
cat > "app/api/tasks/[id]/route.ts" << 'EOF'
import { createServerClient } from '@/lib/supabase-server'
import { notifyTeams, notifyEmail } from '@/lib/notifications'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { status, note } = body

  const { data: profile } = await supabase
    .from('profiles')
    .select('department, full_name')
    .eq('id', user.id)
    .single()

  const { data: task } = await supabase
    .from('tasks')
    .select('*, offres(name), profiles!assigned_to(email, full_name)')
    .eq('id', id)
    .single()

  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const canEdit =
    task.assigned_to === user.id ||
    task.department === profile?.department ||
    profile?.department === 'Admin'

  if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  }
  if (status !== undefined) updates.status = status
  if (note !== undefined) updates.note = note

  const { error } = await supabase.from('tasks').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error }, { status: 500 })

  // Notifications si changement de statut
  if (status && status !== task.status) {
    const color = status === 'Bloqué' ? 'EF4444' : status === 'Fait' ? '10B981' : 'FFB347'
    const offreName = task.offres?.name || ''
    const updatedBy = profile?.full_name || 'Quelqu\'un'

    await notifyTeams({
      title: `${task.label} → ${status}`,
      message: `Offre : ${offreName} • Par : ${updatedBy}`,
      color,
    })

    if ((status === 'Bloqué' || status === 'Fait') && task.profiles?.email) {
      await notifyEmail({
        to: task.profiles.email,
        subject: `[${offreName}] Tâche ${status} : ${task.label}`,
        html: `
          <p>Bonjour,</p>
          <p>La tâche <strong>${task.label}</strong> (offre <strong>${offreName}</strong>) 
          est passée à <strong>${status}</strong> par ${updatedBy}.</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Voir le dashboard</a></p>
        `,
      })
    }
  }

  return NextResponse.json({ success: true })
}
EOF

# ─── app/api/offres/route.ts ────────────────────────────────────────────────
mkdir -p app/api/offres
cat > app/api/offres/route.ts << 'EOF'
import { createServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('department')
    .eq('id', user.id)
    .single()

  if (profile?.department !== 'Admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, color, start_date, end_date, priority } = body

  const { data: offre, error } = await supabase
    .from('offres')
    .insert({ name, color, start_date, end_date, priority, status: 'En prépa', created_by: user.id })
    .select()
    .single()

  if (error || !offre) return NextResponse.json({ error }, { status: 500 })

  // Générer les tâches depuis les templates
  const { data: templates } = await supabase
    .from('task_templates')
    .select('*')
    .order('order_index')

  if (templates?.length) {
    const tasks = templates.map(t => ({
      offre_id: offre.id,
      label: t.label,
      department: t.department,
      deadline: new Date(
        new Date(start_date).getTime() + t.delay_days * 86400000
      ).toISOString().split('T')[0],
      status: 'À faire',
      order_index: t.order_index,
      is_custom: false,
    }))
    const { data: tasksData } = await supabase.from('tasks').insert(tasks).select()
    offre.tasks = tasksData || []
  }

  return NextResponse.json(offre)
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('department')
    .eq('id', user.id)
    .single()

  if (profile?.department !== 'Admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase.from('offres').delete().eq('id', id)
  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ success: true })
}
EOF

# ─── app/api/users/route.ts ─────────────────────────────────────────────────
mkdir -p app/api/users
cat > app/api/users/route.ts << 'EOF'
import { createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('department').eq('id', user.id).single()
  if (profile?.department !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: profiles } = await supabase.from('profiles').select('*').order('full_name')
  return NextResponse.json(profiles || [])
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('department').eq('id', user.id).single()
  if (profile?.department !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, password, full_name, department } = await req.json()

  const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error || !newUser.user) return NextResponse.json({ error }, { status: 500 })

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({ id: newUser.user.id, full_name, department, email })

  if (profileError) return NextResponse.json({ error: profileError }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('department').eq('id', user.id).single()
  if (profile?.department !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await supabaseAdmin.auth.admin.deleteUser(id)
  return NextResponse.json({ success: true })
}
EOF

# ─── app/api/cron/deadlines/route.ts ────────────────────────────────────────
mkdir -p app/api/cron/deadlines
cat > app/api/cron/deadlines/route.ts << 'EOF'
import { createClient } from '@supabase/supabase-js'
import { notifyEmail } from '@/lib/notifications'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const threeDaysFromNow = new Date()
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
  const today = new Date().toISOString().split('T')[0]
  const limit = threeDaysFromNow.toISOString().split('T')[0]

  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('*, offres(name), profiles!assigned_to(email, full_name)')
    .neq('status', 'Fait')
    .gte('deadline', today)
    .lte('deadline', limit)

  if (!tasks?.length) return NextResponse.json({ sent: 0 })

  let sent = 0
  for (const task of tasks) {
    if (!task.profiles?.email) continue
    await notifyEmail({
      to: task.profiles.email,
      subject: `⚠️ Deadline J-3 : ${task.label}`,
      html: `
        <p>Bonjour ${task.profiles.full_name},</p>
        <p>La tâche <strong>${task.label}</strong> doit être terminée avant le <strong>${task.deadline}</strong>.</p>
        <p>Offre : ${task.offres?.name}</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Voir le dashboard</a></p>
      `,
    })
    sent++
  }

  return NextResponse.json({ sent })
}
EOF

# ─── app/admin/page.tsx ──────────────────────────────────────────────────────
mkdir -p app/admin
cat > app/admin/page.tsx << 'EOF'
import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.department !== 'Admin') redirect('/dashboard')

  const { data: users } = await supabase.from('profiles').select('*').order('full_name')

  return <AdminClient currentUser={profile} users={users || []} />
}
EOF

cat > app/admin/AdminClient.tsx << 'EOF'
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Profile } from '@/lib/types'

const DEPT_COLORS: Record<string, { bg: string; text: string }> = {
  Achat:      { bg: '#FFF3E0', text: '#E65100' },
  Marketing:  { bg: '#F3E5F5', text: '#6A1B9A' },
  Logistique: { bg: '#E3F2FD', text: '#0D47A1' },
  ESAT:       { bg: '#E8F5E9', text: '#1B5E20' },
  Admin:      { bg: '#F5F5F5', text: '#333' },
}

export default function AdminClient({ currentUser, users: initialUsers }: { currentUser: Profile, users: Profile[] }) {
  const [users, setUsers] = useState<Profile[]>(initialUsers)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', password: '', department: 'Achat' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const createUser = async () => {
    if (!form.full_name || !form.email || !form.password) return
    setLoading(true)
    setError('')
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error?.message || 'Erreur lors de la création')
      setLoading(false)
      return
    }
    setForm({ full_name: '', email: '', password: '', department: 'Achat' })
    setShowNew(false)
    setLoading(false)
    router.refresh()
  }

  const deleteUser = async (id: string) => {
    if (!confirm('Supprimer cet utilisateur ?')) return
    await fetch(`/api/users?id=${id}`, { method: 'DELETE' })
    setUsers(prev => prev.filter(u => u.id !== id))
  }

  return (
    <div style={{ fontFamily: 'system-ui', background: '#F8F7F4', minHeight: '100vh', color: '#1C1B18' }}>

      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFF', borderRadius: 16, padding: 32, width: 400, boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 24px' }}>Nouvel utilisateur</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'NOM COMPLET', key: 'full_name', type: 'text', placeholder: 'Marie Dupont' },
                { label: 'EMAIL', key: 'email', type: 'email', placeholder: 'marie@wala.com' },
                { label: 'MOT DE PASSE', key: 'password', type: 'password', placeholder: '••••••••' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 5 }}>{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E8E4DC', fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 5 }}>DÉPARTEMENT</label>
                <select value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E8E4DC', fontSize: 14 }}>
                  {['Achat', 'Marketing', 'Logistique', 'ESAT', 'Admin'].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              {error && <p style={{ color: '#EF4444', fontSize: 13, margin: 0 }}>{error}</p>}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={() => setShowNew(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E8E4DC', background: 'transparent', fontSize: 14, cursor: 'pointer' }}>
                  Annuler
                </button>
                <button onClick={createUser} disabled={loading}
                  style={{ flex: 2, padding: '10px', borderRadius: 8, background: '#1C1B18', color: '#FFF', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Création...' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: '#1C1B18', color: '#F8F7F4', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, background: '#FFB347', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✦</div>
          <span style={{ fontSize: 16, fontWeight: 700 }}>OffreCosmo</span>
          <span style={{ fontSize: 12, color: '#888' }}>/ Admin</span>
        </div>
        <button onClick={() => router.push('/dashboard')}
          style={{ fontSize: 12, color: '#AAA', background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Dashboard
        </button>
      </div>

      <div style={{ maxWidth: 700, margin: '40px auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Utilisateurs</h1>
          <button onClick={() => setShowNew(true)}
            style={{ padding: '8px 16px', borderRadius: 8, background: '#1C1B18', color: '#FFF', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Nouvel utilisateur
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.map(u => (
            <div key={u.id} style={{ background: '#FFF', border: '1px solid #E8E4DC', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F0EDE6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#666' }}>
                {u.full_name.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{u.full_name}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{u.email}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: DEPT_COLORS[u.department]?.bg, color: DEPT_COLORS[u.department]?.text }}>
                {u.department}
              </span>
              {u.id !== currentUser.id && (
                <button onClick={() => deleteUser(u.id)}
                  style={{ padding: '5px 10px', borderRadius: 6, background: '#FEF2F2', color: '#EF4444', border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                  Supprimer
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
EOF

# ─── vercel.json ─────────────────────────────────────────────────────────────
cat > vercel.json << 'EOF'
{
  "crons": [
    {
      "path": "/api/cron/deadlines",
      "schedule": "0 7 * * *"
    }
  ]
}
EOF

echo ""
echo "✅ Tous les fichiers créés !"
echo ""
echo "Prochaines étapes :"
echo "  git add ."
echo "  git commit -m 'feat: notifications, admin users, cron deadlines'"
echo "  git push"
