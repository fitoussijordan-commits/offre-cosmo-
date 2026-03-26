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
