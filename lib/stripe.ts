import Stripe from "stripe"

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY

if (!STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable")
}

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20",
  typescript: true,
})
import "server-only"
import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
