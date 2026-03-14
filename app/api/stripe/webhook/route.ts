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
    console.error("[v0] Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        console.log("[v0] Checkout session completed:", session.id)

        await supabase
          .from("payments")
          .update({
            status: "succeeded",
            stripe_payment_intent_id: session.payment_intent,
          })
          .eq("stripe_checkout_session_id", session.id)

        if (session.metadata?.lead_id) {
          const { data: lead } = await supabase
            .from("leads")
            .update({
              deposit_paid: true,
              payment_status: "paid",
              stripe_payment_intent_id: session.payment_intent,
              status: "confirmed",
            })
            .eq("id", session.metadata.lead_id)
            .select()
            .single()

          if (lead && resend) {
            // Customer confirmation email
            if (lead.email) {
              await resend.emails.send({
                from: EMAIL_FROM_ADDRESS,
                to: lead.email,
                subject: `Booking Confirmed - M&M Commercial Moving`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #16a34a;">Booking Confirmed!</h1>
                    <p>Dear ${lead.contact_name || "Valued Customer"},</p>
                    <p>Thank you for your deposit payment. Your commercial move is now confirmed.</p>
                    
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                      <h3 style="margin-top: 0;">Booking Details</h3>
                      <p><strong>Reference:</strong> ${lead.id.slice(0, 8).toUpperCase()}</p>
                      <p><strong>Company:</strong> ${lead.company_name || "N/A"}</p>
                      <p><strong>Move Type:</strong> ${lead.move_type || "Commercial Relocation"}</p>
                      <p><strong>From:</strong> ${lead.origin_suburb || "TBC"}</p>
                      <p><strong>To:</strong> ${lead.destination_suburb || "TBC"}</p>
                      <p><strong>Scheduled Date:</strong> ${lead.scheduled_date || lead.target_move_date || "To be confirmed"}</p>
                      <p><strong>Deposit Paid:</strong> $${(lead.deposit_amount || 200).toFixed(2)}</p>
                    </div>
                    
                    <h3>What Happens Next?</h3>
                    <ol>
                      <li>Our operations team will contact you within 24 hours to confirm details</li>
                      <li>You'll receive a detailed move plan 48 hours before your move</li>
                      <li>On move day, our crew will arrive at the scheduled time</li>
                    </ol>
                    
                    <p>If you have any questions, please contact us:</p>
                    <ul>
                      <li>Phone: (03) 8820 1801</li>
                      <li>Email: operations@m2mmoving.au</li>
                    </ul>
                    
                    <p>Thank you for choosing M&M Commercial Moving!</p>
                  </div>
                `,
              })
            }

            // Internal notification email
            if (LEAD_NOTIFICATION_RECIPIENTS.length > 0) {
              await resend.emails.send({
                from: EMAIL_FROM_ADDRESS,
                to: LEAD_NOTIFICATION_RECIPIENTS,
                subject: `[PAID] New Booking Confirmed - ${lead.company_name || lead.contact_name}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #16a34a;">Payment Received - Booking Confirmed</h1>
                    
                    <div style="background: #dcfce7; padding: 15px; border-radius: 8px; margin: 15px 0;">
                      <strong>Deposit:</strong> $${(lead.deposit_amount || 200).toFixed(2)} PAID
                    </div>
                    
                    <h3>Customer Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Company:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${lead.company_name || "N/A"}</td></tr>
                      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Contact:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${lead.contact_name || "N/A"}</td></tr>
                      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Email:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${lead.email || "N/A"}</td></tr>
                      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Phone:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${lead.phone || "N/A"}</td></tr>
                    </table>
                    
                    <h3>Move Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Type:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${lead.move_type || "Commercial"}</td></tr>
                      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>From:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${lead.origin_suburb || "TBC"}</td></tr>
                      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>To:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${lead.destination_suburb || "TBC"}</td></tr>
                      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Date:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${lead.scheduled_date || lead.target_move_date || "TBC"}</td></tr>
                      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Estimated Total:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">$${lead.estimated_total?.toFixed(2) || "TBC"}</td></tr>
                    </table>
                    
                    <p style="margin-top: 20px;"><strong>Action Required:</strong> Contact customer within 24 hours to confirm move details.</p>
                  </div>
                `,
              })
            }
          }
        }
        break
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object
        console.log("[v0] Payment intent succeeded:", paymentIntent.id)

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
        console.log("[v0] Payment intent failed:", paymentIntent.id)

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
        console.log("[v0] Charge refunded:", charge.id)

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
        console.log("[v0] Dispute created:", dispute.id)

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
        console.log(`[v0] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error("[v0] Webhook handler error:", err)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
