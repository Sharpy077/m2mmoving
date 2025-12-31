"use client"

import { useEffect, useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"

const getStripePromise = () => {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!key) {
    console.error("[v0] Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY")
    return null
  }
  return loadStripe(key)
}

interface StripeCheckoutWrapperProps {
  clientSecret: string
  onComplete?: () => void
}

export default function StripeCheckoutWrapper({ clientSecret, onComplete }: StripeCheckoutWrapperProps) {
  const [mounted, setMounted] = useState(false)
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    const promise = getStripePromise()
    if (promise) {
      setStripePromise(promise)
    } else {
      setError("Stripe is not configured. Please check environment variables.")
    }
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !stripePromise) {
    return (
      <div className="flex items-center justify-center p-8 text-destructive">
        <p>{error || "Failed to load Stripe"}</p>
      </div>
    )
  }

  return (
    <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret, onComplete }}>
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  )
}
