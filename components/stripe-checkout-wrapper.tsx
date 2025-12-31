"use client"

import { useEffect, useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"

// Initialize Stripe outside component to avoid recreating on each render
const stripePromise =
  typeof window !== "undefined" && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    : null

interface StripeCheckoutWrapperProps {
  clientSecret: string
  onComplete?: () => void
}

export default function StripeCheckoutWrapper({ clientSecret, onComplete }: StripeCheckoutWrapperProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!stripePromise) {
    return (
      <div className="flex items-center justify-center p-8 text-destructive">
        <p>Stripe is not configured. Please check environment variables.</p>
      </div>
    )
  }

  return (
    <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret, onComplete }}>
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  )
}
