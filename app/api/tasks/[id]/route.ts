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
