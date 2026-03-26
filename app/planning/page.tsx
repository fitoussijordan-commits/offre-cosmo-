import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import PlanningClient from './PlanningClient'

export default async function PlanningPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: offres } = await supabase
    .from('offres')
    .select('*, tasks(*)')
    .order('start_date', { ascending: true })

  return <PlanningClient profile={profile} offres={offres || []} />
}
