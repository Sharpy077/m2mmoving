import "server-only"
import Stripe from "stripe"

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
