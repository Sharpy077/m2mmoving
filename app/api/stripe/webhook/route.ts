import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
  }

  let event

  try {
    // If you have a webhook secret, verify the signature
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } else {
      // For development without webhook secret
      event = JSON.parse(body)
    }
  } catch (err) {
    console.error("[v0] Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 })
  }

  // Handle different event types
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        console.log("[v0] Checkout session completed:", session.id)

        // Update lead with payment info if metadata contains lead_id
        if (session.metadata?.lead_id) {
          const supabase = await createClient()
          await supabase
            .from("leads")
            .update({
              deposit_paid: true,
              payment_status: "paid",
              stripe_session_id: session.id,
            })
            .eq("id", session.metadata.lead_id)
        }
        break
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object
        console.log("[v0] Payment intent succeeded:", paymentIntent.id)
        break
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object
        console.log("[v0] Payment intent failed:", paymentIntent.id)
        break
      }

      default:
        console.log(`[v0] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error("[v0] Webhook handler error:", err)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
