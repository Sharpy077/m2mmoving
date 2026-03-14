"use server"

import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"

// Types
interface CreateCheckoutParams {
  amount: number // in dollars
  customerEmail: string
  customerName: string
  description?: string
  moveType?: string
  origin?: string
  destination?: string
  scheduledDate?: string
  leadId?: string // Optional - if not provided, we create a new lead
  paymentType?: "deposit" | "full_payment" | "additional_charge"
}

interface CheckoutResult {
  success: boolean
  clientSecret?: string
  leadId?: string
  error?: string
}

/**
 * Create a checkout session for deposit payment
 * This is the main entry point for all payment flows
 */
export async function createDepositCheckout(params: CreateCheckoutParams): Promise<CheckoutResult> {
  const {
    amount,
    customerEmail,
    customerName,
    description,
    moveType,
    origin,
    destination,
    scheduledDate,
    leadId: existingLeadId,
    paymentType = "deposit",
  } = params

  try {
    const supabase = await createClient()
    let leadId = existingLeadId

    if (!leadId) {
      // Create a new lead
      const { data: newLead, error: leadError } = await supabase
        .from("leads")
        .insert({
          contact_name: customerName,
          email: customerEmail,
          move_type: moveType || "commercial",
          origin_suburb: origin,
          destination_suburb: destination,
          target_move_date: scheduledDate,
          deposit_amount: amount,
          payment_status: "pending",
          status: "new",
        })
        .select("id")
        .single()

      if (leadError) {
        console.error("[v0] Error creating lead:", leadError)
        return { success: false, error: "Failed to create booking record" }
      }
      leadId = newLead.id
    } else {
      // Update existing lead
      await supabase
        .from("leads")
        .update({
          deposit_amount: amount,
          payment_status: "pending",
        })
        .eq("id", leadId)
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      redirect_on_completion: "never",
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: "aud",
            product_data: {
              name:
                paymentType === "deposit" ? "M&M Commercial Moving - 50% Deposit" : "M&M Commercial Moving - Payment",
              description: description || `Commercial moving ${paymentType}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        lead_id: leadId,
        customer_name: customerName,
        customer_email: customerEmail,
        move_type: moveType || "",
        origin: origin || "",
        destination: destination || "",
        scheduled_date: scheduledDate || "",
        deposit_amount: amount.toString(),
        payment_type: paymentType,
      },
    })

    await supabase.from("payments").insert({
      lead_id: leadId,
      stripe_checkout_session_id: session.id,
      amount: amount,
      status: "pending",
      payment_type: paymentType,
      customer_email: customerEmail,
      customer_name: customerName,
      description: description || `Commercial moving ${paymentType}`,
      metadata: {
        move_type: moveType,
        origin,
        destination,
        scheduled_date: scheduledDate,
      },
    })

    // Update lead with processing status
    await supabase
      .from("leads")
      .update({
        payment_status: "processing",
      })
      .eq("id", leadId)

    return {
      success: true,
      clientSecret: session.client_secret ?? undefined,
      leadId,
    }
  } catch (error) {
    console.error("[v0] Error creating deposit checkout:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create checkout session",
    }
  }
}

/**
 * Mark a deposit as paid (called after successful payment)
 */
export async function markDepositPaid(leadId: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from("leads")
      .update({
        deposit_paid: true,
        payment_status: "paid",
        status: "confirmed",
      })
      .eq("id", leadId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error("[v0] Error marking deposit paid:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to update payment status" }
  }
}

/**
 * Process a refund for a payment
 */
export async function processRefund(paymentIntentId: string, amount?: number, reason?: string) {
  try {
    const supabase = await createClient()

    // Get the payment record
    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .single()

    if (!payment) {
      return { success: false, error: "Payment not found" }
    }

    // Create refund in Stripe
    const refundParams: {
      payment_intent: string
      amount?: number
      reason?: "duplicate" | "fraudulent" | "requested_by_customer"
    } = {
      payment_intent: paymentIntentId,
    }

    if (amount) {
      refundParams.amount = Math.round(amount * 100) // Convert to cents
    }

    if (reason === "duplicate" || reason === "fraudulent" || reason === "requested_by_customer") {
      refundParams.reason = reason
    }

    const refund = await stripe.refunds.create(refundParams)

    // Update payment record
    const refundAmount = (refund.amount || 0) / 100
    const newRefundTotal = (payment.refund_amount || 0) + refundAmount
    const isFullRefund = newRefundTotal >= payment.amount

    await supabase
      .from("payments")
      .update({
        status: isFullRefund ? "refunded" : "partially_refunded",
        refund_amount: newRefundTotal,
        refund_reason: reason || "Customer requested",
      })
      .eq("id", payment.id)

    // Update lead if full refund
    if (isFullRefund && payment.lead_id) {
      await supabase
        .from("leads")
        .update({
          deposit_paid: false,
          payment_status: "refunded",
          status: "cancelled",
        })
        .eq("id", payment.lead_id)
    }

    return { success: true, refundId: refund.id }
  } catch (error) {
    console.error("[v0] Error processing refund:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to process refund" }
  }
}

/**
 * Get payment history for a lead
 */
export async function getPaymentHistory(leadId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return { success: true, payments: data }
  } catch (error) {
    console.error("[v0] Error fetching payment history:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch payments" }
  }
}

/**
 * Generate a receipt URL for a payment
 */
export async function getPaymentReceipt(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    })

    const charge = paymentIntent.latest_charge as { receipt_url?: string } | null

    if (charge?.receipt_url) {
      // Update our records with the receipt URL
      const supabase = await createClient()
      await supabase
        .from("payments")
        .update({ receipt_url: charge.receipt_url })
        .eq("stripe_payment_intent_id", paymentIntentId)

      return { success: true, receiptUrl: charge.receipt_url }
    }

    return { success: false, error: "Receipt not available" }
  } catch (error) {
    console.error("[v0] Error getting receipt:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to get receipt" }
  }
}
