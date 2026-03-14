import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Building2, Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Provider Verification | Admin',
}

const STATUS_COLOURS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  verified: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  suspended: 'bg-gray-100 text-gray-800 border-gray-200',
}

export default async function ProvidersAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('providers')
    .select('id, company_name, email, phone, verification_status, created_at, rejection_notes, commission_rate, rating, is_platform_default')
    .order('created_at', { ascending: false })

  if (status && ['pending', 'verified', 'rejected', 'suspended'].includes(status)) {
    query = query.eq('verification_status', status) as typeof query
  }

  const { data: providers, error } = await query

  // Counts for stat cards
  const { data: counts } = await supabase
    .from('providers')
    .select('verification_status')

  const pendingCount = counts?.filter((p) => p.verification_status === 'pending').length ?? 0
  const verifiedCount = counts?.filter((p) => p.verification_status === 'verified').length ?? 0
  const rejectedCount = counts?.filter((p) => p.verification_status === 'rejected').length ?? 0

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Provider Verification</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review and verify moving company applications
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <Link href="/admin/providers?status=pending">
          <Card className="cursor-pointer hover:shadow-md transition-shadow border-yellow-200">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-yellow-600" />
                Pending Review
              </CardDescription>
              <CardTitle className="text-3xl text-yellow-700">{pendingCount}</CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/providers?status=verified">
          <Card className="cursor-pointer hover:shadow-md transition-shadow border-green-200">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Verified
              </CardDescription>
              <CardTitle className="text-3xl text-green-700">{verifiedCount}</CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/providers?status=rejected">
          <Card className="cursor-pointer hover:shadow-md transition-shadow border-red-200">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-600" />
                Rejected
              </CardDescription>
              <CardTitle className="text-3xl text-red-700">{rejectedCount}</CardTitle>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { label: 'All', value: '' },
          { label: 'Pending', value: 'pending' },
          { label: 'Verified', value: 'verified' },
          { label: 'Rejected', value: 'rejected' },
        ].map(({ label, value }) => (
          <Link key={value} href={value ? `/admin/providers?status=${value}` : '/admin/providers'}>
            <Button
              variant={status === value || (!status && value === '') ? 'default' : 'outline'}
              size="sm"
            >
              {label}
            </Button>
          </Link>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {error ? (
            <p className="text-red-600 p-6">{error.message}</p>
          ) : !providers || providers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Building2 className="h-10 w-10 mb-3 opacity-30" />
              <p>No providers found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.company_name}
                      {p.is_platform_default && (
                        <span className="ml-2 text-xs text-blue-600 font-normal">(M&M default)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.email}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLOURS[p.verification_status] ?? ''}`}
                      >
                        {p.verification_status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.commission_rate != null ? `${(p.commission_rate * 100).toFixed(0)}%` : '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.rating != null ? `${p.rating.toFixed(1)} ★` : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString('en-AU')}
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/providers/${p.id}`}>
                        <Button variant="ghost" size="sm" className="gap-1">
                          Review <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
