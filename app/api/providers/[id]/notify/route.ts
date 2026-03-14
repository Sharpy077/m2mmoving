import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { sendSMS } from '@/lib/twilio'
import { resend, EMAIL_FROM_ADDRESS } from '@/lib/email'
import { buildJobNotificationSMS, buildJobNotificationEmail } from '@/lib/marketplace/notifications'

const notifySchema = z.object({
  job_id: z.string().min(1),
  job_type: z.string().min(1),
  suburb: z.string().min(1),
  scheduled_date: z.string().min(1),
  customer_price: z.number().positive(),
  matching_mode: z.enum(['instant', 'bidding']),
  bid_deadline: z.string().optional().nullable(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch provider
  const { data: provider, error: providerError } = await supabase
    .from('providers')
    .select('id, company_name, email, phone, verification_status')
    .eq('id', id)
    .single()

  if (providerError?.code === 'PGRST116' || !provider) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = notifySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const ctx = {
    ...parsed.data,
    provider_name: provider.company_name,
    provider_email: provider.email,
  }

  // Send SMS (skip if no phone)
  let smsSent = false
  if (provider.phone) {
    smsSent = await sendSMS(provider.phone, buildJobNotificationSMS(ctx))
  }

  // Send email
  let emailSent = false
  if (resend && provider.email) {
    const emailPayload = buildJobNotificationEmail(ctx)
    const { error: emailError } = await resend.emails.send({
      from: EMAIL_FROM_ADDRESS,
      to: emailPayload.to,
      subject: emailPayload.subject,
      html: emailPayload.html,
    })
    emailSent = !emailError
  }

  return NextResponse.json({ sms_sent: smsSent, email_sent: emailSent })
}
