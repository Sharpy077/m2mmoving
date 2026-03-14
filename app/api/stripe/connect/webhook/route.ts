import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

/**
 * Stripe Connect Webhook
 * Handles events for connected provider accounts:
 * - account.updated: provider completes Stripe onboarding
 * - payout.paid: provider payout confirmed by Stripe
 */
export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[stripe/connect/webhook] STRIPE_CONNECT_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('[stripe/connect/webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account)
        break
      case 'payout.paid':
        await handlePayoutPaid(event.data.object as Stripe.Payout, event.account)
        break
      default:
        // Ignore unhandled event types
        break
    }
  } catch (err) {
    console.error(`[stripe/connect/webhook] Error handling ${event.type}:`, err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleAccountUpdated(account: Stripe.Account) {
  const isComplete =
    account.charges_enabled &&
    account.payouts_enabled &&
    account.details_submitted

  if (!isComplete) return

  const supabase = await createClient()
  const { error } = await supabase
    .from('providers')
    .update({ stripe_onboarding_complete: true })
    .eq('stripe_account_id', account.id)

  if (error) {
    console.error('[stripe/connect/webhook] Failed to update provider stripe_onboarding_complete:', error)
  }
}

async function handlePayoutPaid(payout: Stripe.Payout, connectedAccountId?: string | null) {
  if (!connectedAccountId) return

  const supabase = await createClient()

  // Find the marketplace_payout record by stripe_transfer_id
  const { data: payoutRecord, error: fetchError } = await supabase
    .from('marketplace_payouts')
    .select('id, job_id')
    .eq('stripe_transfer_id', payout.id)
    .single()

  if (fetchError || !payoutRecord) {
    console.warn('[stripe/connect/webhook] No marketplace_payout found for payout:', payout.id)
    return
  }

  // Mark payout as paid
  await supabase
    .from('marketplace_payouts')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', payoutRecord.id)

  // Update job payment_status to released
  await supabase
    .from('marketplace_jobs')
    .update({ payment_status: 'released', payout_released_at: new Date().toISOString() })
    .eq('id', payoutRecord.job_id)
}
