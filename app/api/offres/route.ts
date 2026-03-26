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
