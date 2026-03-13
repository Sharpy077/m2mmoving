import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Briefcase, DollarSign, Star, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Provider Dashboard | M2M Marketplace',
}

export default async function ProviderDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Get the user's provider record
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*, provider:provider_id(*)')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'provider_admin') {
    redirect('/provider')
  }

  const provider = profile.provider as Record<string, unknown> | null

  if (!provider) {
    redirect('/provider/signup')
  }

  // Fetch active jobs assigned to this provider
  const { data: activeJobs } = await supabase
    .from('marketplace_jobs')
    .select('id, job_type, status, origin_suburb, destination_suburb, scheduled_date, customer_price, provider_payout')
    .eq('assigned_provider_id', provider.id as string)
    .in('status', ['assigned', 'confirmed', 'in_progress'])
    .order('scheduled_date', { ascending: true })
    .limit(5)

  // Fetch recent completed jobs for earnings
  const { data: completedJobs } = await supabase
    .from('marketplace_jobs')
    .select('provider_payout, scheduled_date')
    .eq('assigned_provider_id', provider.id as string)
    .eq('status', 'completed')
    .order('scheduled_date', { ascending: false })
    .limit(30)

  const totalEarnings = (completedJobs ?? []).reduce(
    (sum: number, j: Record<string, unknown>) => sum + ((j.provider_payout as number) ?? 0),
    0
  )

  const stats = [
    {
      label: 'Active Jobs',
      value: activeJobs?.length ?? 0,
      icon: Briefcase,
      color: 'text-blue-600',
    },
    {
      label: 'Total Completed',
      value: (provider.completed_jobs as number) ?? 0,
      icon: TrendingUp,
      color: 'text-green-600',
    },
    {
      label: 'Total Earned',
      value: `$${totalEarnings.toLocaleString('en-AU', { minimumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: 'text-emerald-600',
    },
    {
      label: 'Rating',
      value: `${(provider.rating as number)?.toFixed(1) ?? '5.0'} ★`,
      icon: Star,
      color: 'text-amber-500',
    },
  ]

  const verificationBadge = {
    verified: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    suspended: 'bg-red-100 text-red-800',
    rejected: 'bg-gray-100 text-gray-700',
  }[provider.verification_status as string] ?? 'bg-gray-100 text-gray-700'

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{provider.company_name as string}</h1>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${verificationBadge}`}>
              {(provider.verification_status as string).replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/provider/jobs">Browse Jobs</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/provider/earnings">Earnings</Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </div>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stripe Connect Banner */}
        {!provider.stripe_onboarding_complete && (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="pt-4 pb-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">Connect your bank account</p>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Set up Stripe to receive automatic payouts after completed jobs.
                </p>
              </div>
              <Button size="sm" asChild>
                <Link href="/provider/onboarding/stripe">Connect Bank</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Active Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Active Jobs</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/provider/jobs">View all →</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!activeJobs || activeJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>No active jobs. Check the job board for new opportunities.</p>
                <Button variant="outline" className="mt-3" asChild>
                  <Link href="/provider/jobs">Browse Available Jobs</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeJobs.map((job: Record<string, unknown>) => (
                  <Link
                    key={job.id as string}
                    href={`/provider/jobs/${job.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <div className="font-medium capitalize">
                        {(job.job_type as string).replace('_', ' ')} — {job.origin_suburb as string} → {job.destination_suburb as string}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(job.scheduled_date as string).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-700">
                        ${(job.provider_payout as number)?.toLocaleString('en-AU')}
                      </div>
                      <div className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 capitalize">
                        {(job.status as string).replace('_', ' ')}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
