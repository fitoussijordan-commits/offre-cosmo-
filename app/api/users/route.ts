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
