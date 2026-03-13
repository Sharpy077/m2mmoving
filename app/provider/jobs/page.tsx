import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Calendar, Package, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'Available Jobs | M2M Provider Portal',
}

const STATUS_STYLES: Record<string, string> = {
  posted: 'bg-blue-100 text-blue-800',
  matching: 'bg-purple-100 text-purple-800',
  bidding: 'bg-orange-100 text-orange-800',
  assigned: 'bg-cyan-100 text-cyan-800',
  confirmed: 'bg-teal-100 text-teal-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
}

const JOB_TYPE_LABELS: Record<string, string> = {
  office: 'Office',
  warehouse: 'Warehouse',
  datacenter: 'Datacenter',
  retail: 'Retail',
  industrial: 'Industrial',
  it_equipment: 'IT Equipment',
}

export default async function ProviderJobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, provider_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'provider_admin') redirect('/provider')

  // Fetch available marketplace jobs
  const { data: availableJobs } = await supabase
    .from('marketplace_jobs')
    .select('*')
    .in('status', ['posted', 'bidding'])
    .order('scheduled_date', { ascending: true })

  // Fetch jobs assigned to this provider
  const { data: myJobs } = await supabase
    .from('marketplace_jobs')
    .select('*')
    .eq('assigned_provider_id', profile.provider_id)
    .in('status', ['assigned', 'confirmed', 'in_progress'])
    .order('scheduled_date', { ascending: true })

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold">Jobs</h1>

        {/* My Active Jobs */}
        {myJobs && myJobs.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">My Active Jobs ({myJobs.length})</h2>
            <div className="space-y-3">
              {myJobs.map((job: Record<string, unknown>) => (
                <JobCard key={job.id as string} job={job} isAssigned />
              ))}
            </div>
          </section>
        )}

        {/* Available Jobs */}
        <section>
          <h2 className="text-lg font-semibold mb-4">
            Available Jobs ({availableJobs?.length ?? 0})
          </h2>
          {!availableJobs || availableJobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No jobs currently available in your service areas. Check back soon.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {availableJobs.map((job: Record<string, unknown>) => (
                <JobCard key={job.id as string} job={job} isAssigned={false} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function JobCard({ job, isAssigned }: { job: Record<string, unknown>; isAssigned: boolean }) {
  const statusStyle = STATUS_STYLES[job.status as string] ?? 'bg-gray-100 text-gray-700'

  return (
    <Link href={`/provider/jobs/${job.id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {JOB_TYPE_LABELS[job.job_type as string] ?? job.job_type as string}
                </Badge>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle}`}>
                  {(job.status as string).replace('_', ' ')}
                </span>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {job.origin_suburb as string} → {job.destination_suburb as string}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(job.scheduled_date as string).toLocaleDateString('en-AU', {
                    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                  })}
                </span>
                {job.square_meters && (
                  <span className="flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" />
                    {job.square_meters as number} sqm
                  </span>
                )}
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <div className="text-lg font-bold text-green-700">
                <DollarSign className="inline h-4 w-4" />
                {((job.provider_payout as number) ?? (job.customer_price as number) * 0.85)
                  .toLocaleString('en-AU', { minimumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-muted-foreground">
                {isAssigned ? 'Your payout' : 'Est. payout'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
