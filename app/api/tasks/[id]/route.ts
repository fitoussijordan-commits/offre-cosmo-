import { createServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { status, note } = body

  const { data: profile } = await supabase
    .from('profiles')
    .select('department')
    .eq('id', user.id)
    .single()

  const { data: task } = await supabase
    .from('tasks')
    .select('*, offres(name)')
    .eq('id', id)
    .single()

  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const canEdit = task.assigned_to === user.id ||
    task.department === profile?.department ||
    profile?.department === 'Admin'

  if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const updates: any = { updated_at: new Date().toISOString(), updated_by: user.id }
  if (status !== undefined) updates.status = status
  if (note !== undefined) updates.note = note

  const { error } = await supabase.from('tasks').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ success: true })
}
