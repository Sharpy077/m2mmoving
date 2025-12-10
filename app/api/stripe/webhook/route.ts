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
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!webhookSecret) {
      console.error("[v0] STRIPE_WEBHOOK_SECRET is not set")
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
    }

    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
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
              stripe_payment_intent_id: session.payment_intent ?? null,
            })
            .eq("id", session.metadata.lead_id)
        }

        // Trigger Notifications
        try {
          const {
            customer_name,
            customer_email,
            customer_phone,
            scheduled_date,
            deposit_amount,
            move_type,
            origin,
            destination,
          } = session.metadata || {}

          if (customer_email && customer_name) {
            const { sendClientConfirmation, sendStaffNotification, formatCurrency } = await import("@/lib/email")
            const { sendBookingConfirmationSMS } = await import("@/lib/sms")

            // 1. Send Client Email
            await sendClientConfirmation(
              customer_email,
              customer_name,
              scheduled_date || "TBD",
              parseInt(deposit_amount || "0"),
              "Calculated on completion", // Total estimate wasn't in metadata, using placeholder
              move_type || "Commercial Move"
            )

            // 2. Send SMS (if phone available)
            if (customer_phone) {
              await sendBookingConfirmationSMS(customer_phone, customer_name, scheduled_date || "TBD")
            }

            // 3. Send Staff Alert
            await sendStaffNotification({
              name: customer_name,
              email: customer_email,
              phone: customer_phone || "Not provided",
              date: scheduled_date || "TBD",
              type: move_type || "N/A",
              origin: origin || "N/A",
              destination: destination || "N/A",
              amount: parseInt(deposit_amount || "0"),
            })
          }
        } catch (notifyError) {
          console.error("[v0] Notification trigger failed:", notifyError)
        }

        break
      }

      case "checkout.session.expired": {
        const session = event.data.object
        console.log("[v0] Checkout session expired:", session.id)

        if (session.metadata?.lead_id) {
          const supabase = await createClient()
          await supabase
            .from("leads")
            .update({
              payment_status: "abandoned",
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

        if (paymentIntent.metadata?.lead_id) {
          const supabase = await createClient()
          await supabase
            .from("leads")
            .update({
              payment_status: "failed",
            })
            .eq("id", paymentIntent.metadata.lead_id)
        }
        break
      }

      case "charge.refunded": {
        const charge = event.data.object
        console.log("[v0] Charge refunded:", charge.id)

        if (charge.payment_intent) {
          const paymentIntent = await stripe.paymentIntents.retrieve(charge.payment_intent as string)
          const leadId = paymentIntent.metadata?.lead_id

          if (leadId) {
            const supabase = await createClient()
            await supabase
              .from("leads")
              .update({
                payment_status: "refunded",
                deposit_paid: false,
              })
              .eq("id", leadId)
          }
        }
        break
      }

      case "charge.dispute.created": {
        const dispute = event.data.object
        console.log("[v0] Charge dispute created:", dispute.id)

        if (dispute.payment_intent) {
          const paymentIntent = await stripe.paymentIntents.retrieve(dispute.payment_intent as string)
          const leadId = paymentIntent.metadata?.lead_id

          if (leadId) {
            const supabase = await createClient()
            await supabase
              .from("leads")
              .update({
                payment_status: "disputed",
              })
              .eq("id", leadId)
          }
        }
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
