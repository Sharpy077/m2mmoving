'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Package,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  Ruler,
  Truck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface Job {
  id: string
  job_type: string
  status: string
  matching_mode: string
  origin_suburb: string | null
  destination_suburb: string | null
  square_meters: number | null
  scheduled_date: string
  customer_price: number
  provider_payout: number
  platform_fee: number
  special_requirements: string | null
  offer_sent_at: string | null
  assigned_provider_id: string | null
  bid_deadline: string | null
  customer_rating: number | null
}

const OFFER_WINDOW_MS = 10 * 60 * 1000

function fmt(n: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(n)
}

function StatusBadge({ status }: { status: string }) {
  const colours: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    assigned: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-indigo-100 text-indigo-700',
    in_progress: 'bg-amber-100 text-amber-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    bidding: 'bg-purple-100 text-purple-700',
  }
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${colours[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

export default function ProviderJobDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [job, setJob] = useState<Job | null>(null)
  const [fetching, setFetching] = useState(true)
  const [providerId, setProviderId] = useState<string | null>(null)
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  useEffect(() => {
    // Fetch job data
    fetch(`/api/marketplace/jobs/${params.id}`)
      .then((r) => r.json())
      .then((body) => {
        setJob(body.data ?? null)
        setFetching(false)
      })
      .catch(() => setFetching(false))

    // Fetch provider ID from profile
    fetch('/api/providers/me')
      .then((r) => r.json())
      .then((body) => setProviderId(body.provider_id ?? null))
      .catch(() => {})
  }, [params.id])

  // Countdown timer for offer window
  useEffect(() => {
    if (!job?.offer_sent_at) return
    const interval = setInterval(() => {
      const elapsed = Date.now() - new Date(job.offer_sent_at!).getTime()
      const remaining = Math.max(0, OFFER_WINDOW_MS - elapsed)
      setTimeLeft(remaining)
      if (remaining === 0) clearInterval(interval)
    }, 1000)
    return () => clearInterval(interval)
  }, [job?.offer_sent_at])

  async function handleAccept() {
    if (!providerId) return
    setLoading('accept')
    setError(null)
    try {
      const res = await fetch(`/api/marketplace/jobs/${params.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: providerId }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Failed to accept job')
      router.push('/provider/jobs?accepted=1')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(null)
    }
  }

  async function handleDecline() {
    if (!providerId) return
    setLoading('decline')
    setError(null)
    try {
      const res = await fetch(`/api/marketplace/jobs/${params.id}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: providerId }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Failed to decline job')
      router.push('/provider/jobs')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(null)
    }
  }

  if (fetching) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-6 bg-muted rounded w-32" />
        <div className="h-32 bg-muted rounded" />
        <div className="h-20 bg-muted rounded" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-muted-foreground">Job not found.</p>
        <Link href="/provider/jobs">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Jobs
          </Button>
        </Link>
      </div>
    )
  }

  const isOffered = job.assigned_provider_id === providerId && job.status === 'assigned'
  const offerExpired = timeLeft !== null && timeLeft === 0

  const minutesLeft = timeLeft !== null ? Math.floor(timeLeft / 60000) : null
  const secondsLeft = timeLeft !== null ? Math.floor((timeLeft % 60000) / 1000) : null

  return (
    <div className="min-h-screen pb-32 px-4 py-6 max-w-lg mx-auto">
      {/* Back */}
      <Link href="/provider/jobs">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Jobs
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold capitalize">
            {job.job_type.replace('_', ' ')} Move
          </h1>
          <p className="text-sm text-muted-foreground">#{job.id.slice(-8)}</p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      {/* Offer timer */}
      {isOffered && !offerExpired && timeLeft !== null && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border-2 border-amber-300 flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-600 shrink-0 animate-pulse" />
          <div>
            <p className="font-semibold text-amber-900 text-sm">Offer window closing</p>
            <p className="text-2xl font-bold text-amber-800 tabular-nums">
              {minutesLeft}:{String(secondsLeft).padStart(2, '0')}
            </p>
          </div>
        </div>
      )}
      {isOffered && offerExpired && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border-2 border-red-200 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium">Offer window has expired</p>
        </div>
      )}

      {/* Details card */}
      <Card className="mb-4">
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">
                {job.origin_suburb ?? 'TBC'} → {job.destination_suburb ?? 'TBC'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-sm">
              {new Date(job.scheduled_date).toLocaleDateString('en-AU', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>

          {job.square_meters && (
            <div className="flex items-center gap-3">
              <Ruler className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-sm">{job.square_meters} m²</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-sm capitalize">{job.matching_mode === 'instant' ? 'Instant Match' : 'Open Bidding'}</p>
          </div>

          {job.special_requirements && (
            <div className="flex items-start gap-3">
              <Package className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">{job.special_requirements}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Earnings breakdown */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            Your Payout
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Job value</span>
            <span>{fmt(job.customer_price)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Platform fee</span>
            <span className="text-red-500">−{fmt(job.platform_fee)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>Your take-home</span>
            <span className="text-emerald-700">{fmt(job.provider_payout)}</span>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Accept / Decline — fixed bottom bar on mobile */}
      {isOffered && !offerExpired && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg safe-area-pb">
          <div className="max-w-lg mx-auto flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              onClick={handleDecline}
              disabled={loading !== null}
            >
              {loading === 'decline' ? (
                <span className="animate-pulse">Declining…</span>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline
                </>
              )}
            </Button>
            <Button
              className="flex-[2] bg-green-600 hover:bg-green-700"
              onClick={handleAccept}
              disabled={loading !== null}
            >
              {loading === 'accept' ? (
                <span className="animate-pulse">Accepting…</span>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Accept Job — {fmt(job.provider_payout)}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
