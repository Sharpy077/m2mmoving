'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Tag,
  Percent,
  AlertCircle,
} from 'lucide-react'

interface Provider {
  id: string
  company_name: string
  email: string
  phone: string | null
  service_areas: string[]
  move_types: string[]
  verification_status: string
  commission_rate: number
  rating: number | null
  rejection_notes: string | null
  created_at: string
  is_platform_default: boolean
  abn: string | null
  stripe_onboarding_complete: boolean
}

// This is a client component that receives provider data via props
// The parent server component (or layout) fetches the data
export default function ProviderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<Provider | null>(null)
  const [fetching, setFetching] = useState(true)

  // Fetch provider on mount
  useState(() => {
    fetch(`/api/providers/${params.id}`)
      .then((r) => r.json())
      .then((body) => {
        setProvider(body.data ?? null)
        setFetching(false)
      })
      .catch(() => setFetching(false))
  })

  async function handleAction(action: 'approve' | 'reject') {
    if (action === 'reject' && !notes.trim()) {
      setError('Please provide rejection notes explaining the reason.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/providers/${params.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: notes.trim() || undefined }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Something went wrong')
      }
      router.push('/admin/providers')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="p-6">
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  if (!provider) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-red-600">Provider not found.</p>
        <Link href="/admin/providers">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
      </div>
    )
  }

  const isPending = provider.verification_status === 'pending'

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/providers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Providers
          </Button>
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">{provider.company_name}</span>
      </div>

      {/* Header card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-muted-foreground" />
              <div>
                <CardTitle>{provider.company_name}</CardTitle>
                <CardDescription>Applied {new Date(provider.created_at).toLocaleDateString('en-AU')}</CardDescription>
              </div>
            </div>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                provider.verification_status === 'verified'
                  ? 'bg-green-100 text-green-800'
                  : provider.verification_status === 'rejected'
                  ? 'bg-red-100 text-red-800'
                  : provider.verification_status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {provider.verification_status}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{provider.email}</span>
            </div>
            {provider.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{provider.phone}</span>
              </div>
            )}
            {provider.abn && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Tag className="h-4 w-4" />
                <span>ABN: {provider.abn}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Percent className="h-4 w-4" />
              <span>Commission: {(provider.commission_rate * 100).toFixed(0)}%</span>
            </div>
          </div>

          <Separator />

          {provider.service_areas?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Service Areas
              </p>
              <div className="flex flex-wrap gap-1">
                {provider.service_areas.map((area) => (
                  <Badge key={area} variant="secondary" className="text-xs">
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {provider.move_types?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Move Types</p>
              <div className="flex flex-wrap gap-1">
                {provider.move_types.map((type) => (
                  <Badge key={type} variant="outline" className="text-xs capitalize">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {provider.stripe_onboarding_complete && (
            <div className="flex items-center gap-2 text-green-700 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              Stripe Connect onboarding complete
            </div>
          )}

          {/* Existing rejection notes */}
          {provider.rejection_notes && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <strong>Previous rejection notes:</strong> {provider.rejection_notes}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action card — only show if pending */}
      {isPending && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Verification Decision</CardTitle>
            <CardDescription>
              Approve to activate this provider on the marketplace, or reject with notes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Notes <span className="text-muted-foreground font-normal">(required for rejection)</span>
              </label>
              <Textarea
                placeholder="e.g. Insurance certificate missing, ABN not verified…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter className="gap-3">
            <Button
              onClick={() => handleAction('approve')}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve Provider
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleAction('reject')}
              disabled={loading}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Already decided */}
      {!isPending && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              This provider has already been {provider.verification_status}.
              {provider.verification_status !== 'verified' && (
                <> To change, use the API directly or re-submit for review.</>
              )}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
