"use server"

import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"

interface CreateCheckoutParams {
  amount: number
  customerEmail: string
  customerName: string
  description?: string
  moveType?: string
  origin?: string
  destination?: string
  scheduledDate?: string
  leadId?: string
  paymentType?: "deposit" | "full_payment" | "additional_charge"
}

interface CheckoutResult {
  success: boolean
  clientSecret?: string
  leadId?: string
  error?: string
}

export async function createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutResult> {
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
          name: customerName,
          email: customerEmail,
          move_type: moveType || "commercial",
          origin_address: origin || "",
          destination_address: destination || "",
          preferred_date: scheduledDate,
          status: "pending_deposit",
        })
        .select("id")
        .single()

      if (leadError) {
        console.error("Error creating lead:", leadError)
        return { success: false, error: "Failed to create booking record" }
      }
      leadId = newLead.id
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: description || `Moving Service ${paymentType === "deposit" ? "Deposit" : "Payment"}`,
              description: `${moveType || "Commercial"} move from ${origin || "TBD"} to ${destination || "TBD"}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        leadId: leadId || "",
        paymentType,
        customerName,
        moveType: moveType || "",
        origin: origin || "",
        destination: destination || "",
        scheduledDate: scheduledDate || "",
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://m2mmoving.vercel.app"}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://m2mmoving.vercel.app"}/quote?canceled=true`,
    })

    return {
      success: true,
      clientSecret: session.id,
      leadId,
    }
  } catch (error) {
    console.error("Checkout session error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create checkout session",
    }
  }
}
