import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"
import { resend, EMAIL_FROM_ADDRESS, buildPaymentReceiptEmail } from "@/lib/email"

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

          // Fetch the lead to get move details for the receipt email
          const { data: lead } = await supabase
            .from("leads")
            .select("*")
            .eq("id", session.metadata.lead_id)
            .single()

          // Calculate final balance amount
          const depositAmount = lead?.deposit_amount ?? (session.amount_total ? session.amount_total / 100 : 0)
          const totalAmount = lead?.estimated_total ?? depositAmount
          const finalBalanceAmount = totalAmount - depositAmount

          // Update lead with payment info, stripe IDs, and final balance
          await supabase
            .from("leads")
            .update({
              deposit_paid: true,
              payment_status: "paid",
              stripe_session_id: session.id,
              stripe_payment_intent_id: session.payment_intent ?? null,
              final_balance_amount: finalBalanceAmount > 0 ? finalBalanceAmount : null,
            })
            .eq("id", session.metadata.lead_id)

          // Send payment receipt email
          if (lead) {
            const customerEmail = session.customer_email ?? lead.email
            if (customerEmail && resend) {
              try {
                const receipt = buildPaymentReceiptEmail({
                  customerName: lead.contact_name ?? "Valued Customer",
                  customerEmail,
                  moveType: lead.move_type ?? "Commercial Move",
                  origin: lead.origin_suburb ?? lead.current_location ?? "TBD",
                  destination: lead.destination_suburb ?? lead.new_location ?? "TBD",
                  scheduledDate: lead.scheduled_date ?? lead.target_move_date ?? "TBD",
                  depositAmount,
                  totalAmount,
                  referenceId: lead.id,
                })

                await resend.emails.send({
                  from: EMAIL_FROM_ADDRESS,
                  to: [customerEmail],
                  subject: receipt.subject,
                  html: receipt.html,
                  text: receipt.text,
                })

                console.log("[v0] Payment receipt email sent to:", customerEmail)
              } catch (emailErr) {
                console.error("[v0] Failed to send payment receipt email:", emailErr)
              }
            }
          }
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
