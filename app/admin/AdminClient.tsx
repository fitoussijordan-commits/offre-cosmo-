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
