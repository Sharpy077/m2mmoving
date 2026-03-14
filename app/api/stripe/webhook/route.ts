import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"
import { resend, EMAIL_FROM_ADDRESS, LEAD_NOTIFICATION_RECIPIENTS } from "@/lib/email"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
  }

  let event

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } else {
      event = JSON.parse(body)
    }
  } catch (err) {
    console.error("[m2mmoving] Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        console.log("[m2mmoving] Checkout session completed:", session.id)

        await supabase
          .from("payments")
          .update({
            status: "succeeded",
            stripe_payment_intent_id: session.payment_intent,
          })
          .eq("stripe_checkout_session_id", session.id)

        if (session.metadata?.lead_id) {
          const supabase = await createClient()

          // Fetch lead details for receipt email when query helpers are available
          const leadsTable = supabase.from("leads") as {
            select?: (columns: string) => {
              eq: (column: string, value: string) => {
                single: () => Promise<{ data: Record<string, unknown> | null }>
              }
            }
          }

          const leadLookup = leadsTable.select?.("*")
          const { data: lead } = leadLookup
            ? await leadLookup.eq("id", session.metadata.lead_id).single()
            : { data: null }

          // Calculate final balance amount
          const depositAmount = (lead?.deposit_amount as number | undefined) ?? (session.amount_total ? session.amount_total / 100 : 0)
          const totalAmount = (lead?.estimated_total as number | undefined) ?? depositAmount
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
            const customerEmail = session.customer_email ?? (lead.email as string | undefined)
            if (customerEmail && resend) {
              try {
                const receipt = buildPaymentReceiptEmail({
                  customerName: (lead.contact_name as string | undefined) ?? "Valued Customer",
                  customerEmail,
                  moveType: (lead.move_type as string | undefined) ?? "Commercial Move",
                  origin: (lead.origin_suburb as string | undefined) ?? (lead.current_location as string | undefined) ?? "TBD",
                  destination: (lead.destination_suburb as string | undefined) ?? (lead.new_location as string | undefined) ?? "TBD",
                  scheduledDate: (lead.scheduled_date as string | undefined) ?? (lead.target_move_date as string | undefined) ?? "TBD",
                  depositAmount,
                  totalAmount,
                  referenceId: lead.id as string,
                })

                await resend.emails.send({
                  from: EMAIL_FROM_ADDRESS,
                  to: [customerEmail],
                  subject: receipt.subject,
                  html: receipt.html,
                  text: receipt.text,
                })

                console.log("[m2mmoving] Payment receipt email sent to:", customerEmail)
              } catch (emailErr) {
                console.error("[m2mmoving] Failed to send payment receipt email:", emailErr)
              }
            }
          }
        }
        break
      }


      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object
        console.log("[m2mmoving] Payment intent succeeded:", paymentIntent.id)

        const charge = paymentIntent.latest_charge
        if (typeof charge === "string") {
          const chargeData = await stripe.charges.retrieve(charge)
          if (chargeData.receipt_url) {
            await supabase
              .from("payments")
              .update({
                status: "succeeded",
                receipt_url: chargeData.receipt_url,
              })
              .eq("stripe_payment_intent_id", paymentIntent.id)
          }
        }
        break
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object
        console.log("[m2mmoving] Payment intent failed:", paymentIntent.id)

        await supabase
          .from("payments")
          .update({
            status: "failed",
            failure_reason: paymentIntent.last_payment_error?.message || "Unknown error",
          })
          .eq("stripe_payment_intent_id", paymentIntent.id)

        // Update lead status
        if (paymentIntent.metadata?.lead_id) {
          await supabase.from("leads").update({ payment_status: "failed" }).eq("id", paymentIntent.metadata.lead_id)
        }

        if (resend && LEAD_NOTIFICATION_RECIPIENTS.length > 0) {
          await resend.emails.send({
            from: EMAIL_FROM_ADDRESS,
            to: LEAD_NOTIFICATION_RECIPIENTS,
            subject: `[ALERT] Payment Failed - ${paymentIntent.id}`,
            html: `
              <div style="font-family: Arial, sans-serif;">
                <h1 style="color: #dc2626;">Payment Failed</h1>
                <p><strong>Payment Intent:</strong> ${paymentIntent.id}</p>
                <p><strong>Amount:</strong> $${((paymentIntent.amount || 0) / 100).toFixed(2)}</p>
                <p><strong>Error:</strong> ${paymentIntent.last_payment_error?.message || "Unknown error"}</p>
                <p>Please follow up with the customer if needed.</p>
              </div>
            `,
          })
        }
        break
      }

      case "charge.refunded": {
        const charge = event.data.object
        console.log("[m2mmoving] Charge refunded:", charge.id)

        const refundAmount = (charge.amount_refunded || 0) / 100
        const isFullRefund = charge.refunded

        await supabase
          .from("payments")
          .update({
            status: isFullRefund ? "refunded" : "partially_refunded",
            refund_amount: refundAmount,
          })
          .eq("stripe_payment_intent_id", charge.payment_intent)

        // If full refund, update lead
        if (isFullRefund && charge.metadata?.lead_id) {
          await supabase
            .from("leads")
            .update({
              deposit_paid: false,
              payment_status: "refunded",
              status: "cancelled",
            })
            .eq("id", charge.metadata.lead_id)
        }

        // Notify team
        if (resend && LEAD_NOTIFICATION_RECIPIENTS.length > 0) {
          await resend.emails.send({
            from: EMAIL_FROM_ADDRESS,
            to: LEAD_NOTIFICATION_RECIPIENTS,
            subject: `[REFUND] ${isFullRefund ? "Full" : "Partial"} Refund Processed - $${refundAmount.toFixed(2)}`,
            html: `
              <div style="font-family: Arial, sans-serif;">
                <h1 style="color: #f59e0b;">${isFullRefund ? "Full" : "Partial"} Refund Processed</h1>
                <p><strong>Charge ID:</strong> ${charge.id}</p>
                <p><strong>Refund Amount:</strong> $${refundAmount.toFixed(2)}</p>
                <p><strong>Original Amount:</strong> $${((charge.amount || 0) / 100).toFixed(2)}</p>
                ${charge.metadata?.lead_id ? `<p><strong>Lead ID:</strong> ${charge.metadata.lead_id}</p>` : ""}
              </div>
            `,
          })
        }
        break
      }

      case "charge.dispute.created": {
        const dispute = event.data.object
        console.log("[m2mmoving] Dispute created:", dispute.id)

        if (resend && LEAD_NOTIFICATION_RECIPIENTS.length > 0) {
          await resend.emails.send({
            from: EMAIL_FROM_ADDRESS,
            to: LEAD_NOTIFICATION_RECIPIENTS,
            subject: `[URGENT] Payment Dispute Created - ${dispute.id}`,
            html: `
              <div style="font-family: Arial, sans-serif;">
                <h1 style="color: #dc2626;">Payment Dispute Created</h1>
                <p><strong>Dispute ID:</strong> ${dispute.id}</p>
                <p><strong>Amount:</strong> $${((dispute.amount || 0) / 100).toFixed(2)}</p>
                <p><strong>Reason:</strong> ${dispute.reason || "Not specified"}</p>
                <p><strong>Status:</strong> ${dispute.status}</p>
                <p style="color: #dc2626;"><strong>Action Required:</strong> Respond to this dispute in your Stripe dashboard immediately.</p>
              </div>
            `,
          })
        }
        break
      }

      default:
        console.log(`[m2mmoving] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error("[m2mmoving] Webhook handler error:", err)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
