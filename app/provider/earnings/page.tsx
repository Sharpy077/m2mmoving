import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DollarSign, TrendingUp, Clock, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { calculateProviderEarnings, getCommissionTier } from '@/lib/marketplace/earnings'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Earnings | M2M Provider',
}

const TIER_COLOURS: Record<string, string> = {
  Standard: 'text-blue-700 bg-blue-50 border-blue-200',
  Growth: 'text-purple-700 bg-purple-50 border-purple-200',
  Pro: 'text-emerald-700 bg-emerald-50 border-emerald-200',
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(n)
}

export default async function ProviderEarningsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('provider_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'provider_admin' || !profile.provider_id) {
    redirect('/provider')
  }

  const { data: provider } = await supabase
    .from('providers')
    .select('company_name, commission_rate, completed_jobs')
    .eq('id', profile.provider_id)
    .single()

  const { data: payouts } = await supabase
    .from('marketplace_payouts')
    .select('id, provider_payout, platform_fee, customer_price, status, created_at, job_id')
    .eq('provider_id', profile.provider_id)
    .order('created_at', { ascending: false })

  const summary = calculateProviderEarnings(payouts ?? [])

  // Determine this month's job count for tier
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const thisMonthJobs = (payouts ?? []).filter(
    (p) => p.status === 'released' && p.created_at >= firstOfMonth
  ).length

  const tier = getCommissionTier(thisMonthJobs)
  const tierColour = TIER_COLOURS[tier.label] ?? 'text-gray-600 bg-gray-50 border-gray-200'

  const nextTier = tier.label === 'Standard'
    ? { label: 'Growth', rate: 0.12, jobs_needed: 11 - thisMonthJobs }
    : tier.label === 'Growth'
    ? { label: 'Pro', rate: 0.10, jobs_needed: 26 - thisMonthJobs }
    : null

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/provider/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Earnings</h1>
            <p className="text-sm text-muted-foreground">{provider?.company_name}</p>
          </div>
        </div>

        {/* Commission tier */}
        <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${tierColour}`}>
          <div>
            <div className="text-sm font-medium opacity-75">Your current tier</div>
            <div className="text-2xl font-bold">{tier.label}</div>
            <div className="text-sm">{(tier.rate * 100).toFixed(0)}% commission this month</div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-75">This month</div>
            <div className="text-3xl font-bold">{thisMonthJobs}</div>
            <div className="text-sm">jobs completed</div>
          </div>
        </div>

        {/* Tier upgrade hint */}
        {nextTier && nextTier.jobs_needed > 0 && (
          <div className="text-sm bg-muted/50 rounded-lg p-3 border">
            💡 Complete <strong>{nextTier.jobs_needed} more job{nextTier.jobs_needed !== 1 ? 's' : ''}</strong> this month
            to unlock the <strong>{nextTier.label}</strong> tier ({(nextTier.rate * 100).toFixed(0)}% commission).
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <span className="text-sm text-muted-foreground">Total Released</span>
              </div>
              <div className="text-2xl font-bold text-emerald-700">{fmt(summary.total_released)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">Pending</span>
              </div>
              <div className="text-2xl font-bold text-amber-600">{fmt(summary.total_pending)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-muted-foreground">Jobs Completed</span>
              </div>
              <div className="text-2xl font-bold">{summary.jobs_completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Payout history */}
        <Card>
          <CardHeader>
            <CardTitle>Payout History</CardTitle>
          </CardHeader>
          <CardContent>
            {!payouts || payouts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>No payouts yet. Complete jobs to start earning.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payouts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-3 border-b last:border-0"
                  >
                    <div>
                      <div className="text-sm font-medium">Job #{p.job_id?.slice(-8)}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                        {' · '}
                        Platform fee: {fmt(p.platform_fee)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-base font-bold ${p.status === 'released' ? 'text-emerald-700' : 'text-amber-600'}`}>
                        {fmt(p.provider_payout)}
                      </div>
                      <div className={`text-xs px-2 py-0.5 rounded-full ${
                        p.status === 'released'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {p.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
