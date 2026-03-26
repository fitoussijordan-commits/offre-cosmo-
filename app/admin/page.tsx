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
