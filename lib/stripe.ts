import "server-only"
import Stripe from "stripe"

let stripeInstance: Stripe | null = null

export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    if (!stripeInstance) {
      const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
      if (!STRIPE_SECRET_KEY) {
        // Return a mock that throws helpful errors at runtime instead of build time
        if (prop === "checkout") {
          return {
            sessions: {
              create: async () => {
                throw new Error("STRIPE_SECRET_KEY is not configured")
              },
            },
          }
        }
        console.warn("[stripe] STRIPE_SECRET_KEY not configured - Stripe features disabled")
        return undefined
      }
      stripeInstance = new Stripe(STRIPE_SECRET_KEY, {
        typescript: true,
      })
    }
    return (stripeInstance as Record<string, unknown>)[prop as string]
  },
})
