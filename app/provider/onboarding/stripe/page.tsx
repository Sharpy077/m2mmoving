'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ExternalLink, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function StripeOnboardingContent() {
  const searchParams = useSearchParams()
  const isRefresh = searchParams.get('refresh') === '1'

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null)

  const startOnboarding = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/stripe/connect/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // provider_id will be extracted server-side from session
          provider_id: 'current', // placeholder — real implementation uses auth session
        }),
      })

      const body = await res.json()
      if (!res.ok) {
        setError(body.error || 'Failed to start Stripe onboarding')
        return
      }

      setOnboardingUrl(body.onboarding_url)
      window.location.href = body.onboarding_url
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isRefresh ? (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Complete your Stripe setup
                </>
              ) : (
                'Connect your bank account'
              )}
            </CardTitle>
            <CardDescription>
              {isRefresh
                ? "It looks like your Stripe setup wasn't completed. Please restart the process."
                : "You'll be redirected to Stripe to set up your account for receiving payouts."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Secure — powered by Stripe Connect Express</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Payouts within 24h of job completion</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Australian bank accounts (BSB + Account Number)</span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <Button onClick={startOnboarding} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Preparing Stripe...
                </>
              ) : (
                <>
                  {isRefresh ? 'Restart Stripe Setup' : 'Connect Bank Account'}
                  <ExternalLink className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>

            <Button variant="ghost" size="sm" className="w-full" asChild>
              <Link href="/provider/dashboard">Skip for now</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function StripeOnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <StripeOnboardingContent />
    </Suspense>
  )
}
