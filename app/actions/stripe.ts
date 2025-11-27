"use server"

import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"

export async function createDepositCheckoutSession(leadId: string, depositAmountCents: number, customerEmail: string) {
  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      redirect_on_completion: "never",
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: "aud",
            product_data: {
              name: "M&M Commercial Moving - 50% Deposit",
              description: `Booking deposit for commercial move (Lead ID: ${leadId})`,
            },
            unit_amount: depositAmountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        lead_id: leadId,
        deposit_amount: depositAmountCents.toString(),
      },
    })

    // Update lead with payment intent info
    const supabase = await createClient()
    await supabase
      .from("leads")
      .update({
        deposit_amount: depositAmountCents / 100,
        payment_status: "processing",
      })
      .eq("id", leadId)

    return { success: true, clientSecret: session.client_secret }
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to create checkout session" }
  }
}

export async function markDepositPaid(leadId: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from("leads")
      .update({
        deposit_paid: true,
        payment_status: "paid",
        status: "quoted",
      })
      .eq("id", leadId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error("Error marking deposit paid:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to update payment status" }
  }
}
