import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resend, EMAIL_FROM_ADDRESS } from '@/lib/email'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('Authorization')
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  // Find verified providers with expired insurance
  const { data: expired, error } = await supabase
    .from('providers')
    .select('id, company_name, email, insurance_expiry')
    .lte('insurance_expiry', today)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!expired || expired.length === 0) {
    return NextResponse.json({ suspended_count: 0, suspended_ids: [] })
  }

  const ids = expired.map((p) => p.id)

  // Suspend all at once
  await supabase
    .from('providers')
    .update({
      is_active: false,
      verification_status: 'suspended',
      updated_at: new Date().toISOString(),
    })
    .in('id', ids)

  // Notify each provider by email
  if (resend) {
    await Promise.allSettled(
      expired.map((provider) =>
        resend!.emails.send({
          from: EMAIL_FROM_ADDRESS,
          to: provider.email,
          subject: '[M&M Platform] Your insurance has expired — account suspended',
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
              <h2 style="color:#dc2626">Account Suspended — Insurance Expired</h2>
              <p>Hi ${provider.company_name},</p>
              <p>
                Your public liability insurance expired on
                <strong>${provider.insurance_expiry}</strong>.
                Your M&amp;M platform account has been temporarily suspended until you
                provide updated insurance documentation.
              </p>
              <p>To reinstate your account, please contact us at
                <a href="mailto:providers@m2mmoving.com.au">providers@m2mmoving.com.au</a>
                with your renewed certificate of currency.
              </p>
              <p style="margin-top:24px;font-size:12px;color:#888">
                M&amp;M Commercial Moving Platform
              </p>
            </div>
          `,
        })
      )
    )
  }

  return NextResponse.json({ suspended_count: expired.length, suspended_ids: ids })
}
