"use server"

import { stripe } from "@/lib/stripe"

export async function createCheckoutSession(data: {
  amount: number
  description: string
  metadata?: Record<string, string>
}) {
  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    redirect_on_completion: "never",
    line_items: [
      {
        price_data: {
          currency: "aud",
          product_data: {
            name: "M&M Moving - 50% Deposit",
            description: data.description,
          },
          unit_amount: data.amount,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    metadata: data.metadata,
    payment_intent_data: {
      metadata: data.metadata,
      description: data.description,
    },
  })

  return { clientSecret: session.client_secret }
}
