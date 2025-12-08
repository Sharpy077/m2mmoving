import { Buffer } from "node:buffer"

import { NextResponse, type NextRequest } from "next/server"
import type Stripe from "stripe"

import { stripe } from "@/lib/stripe"
import { reportMonitoring, type MonitoringSeverity } from "@/lib/monitoring"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
const MONITORING_SOURCE = "stripe.webhook"

export async function POST(req: NextRequest) {
  if (!WEBHOOK_SECRET) {
    console.error("[stripe] Missing STRIPE_WEBHOOK_SECRET environment variable")
    await notifyStripeAlert("STRIPE_WEBHOOK_SECRET is not configured", "critical")
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    await notifyStripeAlert("Missing stripe-signature header", "warning")
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
  }

  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(Buffer.from(body), signature, WEBHOOK_SECRET)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[stripe] Webhook signature verification failed:", message)
    await notifyStripeAlert("Stripe webhook signature verification failed", "error", {
      reason: message,
    })
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
        await handleCheckoutSessionFailed(event.data.object as Stripe.Checkout.Session)
        break
      default:
        break
    }
  } catch (error) {
    console.error("[stripe] Error handling webhook event:", error)
    await notifyStripeAlert("Stripe webhook handler failed", "critical", {
      eventType: event.type,
      error: error instanceof Error ? error.message : "Unknown error",
    })
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const leadId = session.metadata?.lead_id
  if (!leadId) {
    console.warn(`[stripe] checkout.session.completed ${session.id} is missing lead_id metadata`)
    return
  }

  const depositAmount = resolveDepositAmount(session)
  const supabase = getSupabaseAdmin()
  const update: Record<string, unknown> = {
    payment_status: "paid",
    deposit_paid: true,
    status: "quoted",
  }

  if (depositAmount !== undefined) {
    update.deposit_amount = depositAmount
  }

  const { error } = await supabase.from("leads").update(update).eq("id", leadId)
  if (error) {
    throw new Error(`[stripe] Failed to mark deposit paid for lead ${leadId}: ${error.message}`)
  }
}

async function handleCheckoutSessionFailed(session: Stripe.Checkout.Session) {
  const leadId = session.metadata?.lead_id
  if (!leadId) {
    console.warn(`[stripe] checkout.session failure ${session.id} is missing lead_id metadata`)
    return
  }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from("leads")
    .update({
      payment_status: "failed",
      deposit_paid: false,
    })
    .eq("id", leadId)

  if (error) {
    throw new Error(`[stripe] Failed to record failed payment for lead ${leadId}: ${error.message}`)
  }
}

function resolveDepositAmount(session: Stripe.Checkout.Session) {
  const metadataAmount = session.metadata?.deposit_amount
  if (metadataAmount) {
    const parsed = Number(metadataAmount)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  if (typeof session.amount_total === "number") {
    return Math.round(session.amount_total / 100)
  }

  return undefined
}

async function notifyStripeAlert(message: string, severity: MonitoringSeverity, details?: Record<string, unknown>) {
  await reportMonitoring({
    source: MONITORING_SOURCE,
    message,
    severity,
    details,
  })
}

