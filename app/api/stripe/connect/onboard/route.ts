import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

const onboardSchema = z.object({
  provider_id: z.string().min(1, 'provider_id is required'),
  email: z.string().email('Invalid email'),
  company_name: z.string().min(1, 'company_name is required'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = onboardSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join('; ') },
        { status: 400 }
      )
    }

    const { provider_id, email, company_name } = parsed.data

    // Create a Stripe Connect Express account for the provider
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'AU',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        name: company_name,
        mcc: '4214', // Motor Freight Carriers and Trucking - Local
      },
      metadata: {
        provider_id,
        platform: 'm2m-marketplace',
      },
    })

    // Persist the Stripe account ID to the provider record
    const supabase = await createClient()
    const { error: dbError } = await supabase
      .from('providers')
      .update({ stripe_account_id: account.id })
      .eq('id', provider_id)

    if (dbError) {
      console.error('[stripe/connect/onboard] DB update error:', dbError)
      // Non-fatal: account created, just log the error
    }

    // Generate the onboarding link (expires in 1 hour)
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${origin}/provider/onboarding/stripe?refresh=1`,
      return_url: `${origin}/provider/onboarding/complete`,
      type: 'account_onboarding',
    })

    return NextResponse.json({
      stripe_account_id: account.id,
      onboarding_url: accountLink.url,
      expires_at: accountLink.expires_at,
    })
  } catch (err) {
    console.error('[stripe/connect/onboard] Error:', err)
    return NextResponse.json({ error: 'Failed to create Stripe Connect account.' }, { status: 500 })
  }
}
