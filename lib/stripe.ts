import Stripe from "stripe"
import "server-only"
import "@/lib/env" // Validates required env vars at module load time

let stripeInstance: Stripe | null = null

export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    if (!stripeInstance) {
      const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
      if (!STRIPE_SECRET_KEY) {
        throw new Error("Missing STRIPE_SECRET_KEY environment variable")
      }
      stripeInstance = new Stripe(STRIPE_SECRET_KEY, {
        apiVersion: "2024-11-20",
        typescript: true,
      })
    }
    return (stripeInstance as any)[prop]
  },
})
