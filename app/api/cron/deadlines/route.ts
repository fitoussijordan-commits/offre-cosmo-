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
