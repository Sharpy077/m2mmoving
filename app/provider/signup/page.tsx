'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, CheckCircle, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

const JOB_TYPES = ['office', 'warehouse', 'datacenter', 'retail', 'industrial', 'it_equipment'] as const
const JOB_TYPE_LABELS: Record<string, string> = {
  office: 'Office Relocations',
  warehouse: 'Warehouse Moves',
  datacenter: 'Datacenter Migrations',
  retail: 'Retail Fit-outs',
  industrial: 'Industrial Moves',
  it_equipment: 'IT Equipment',
}

const providerSignupSchema = z.object({
  company_name: z.string().min(2, 'Company name is required'),
  abn: z.string().optional(),
  email: z.string().email('Valid email required'),
  phone: z.string().min(8, 'Phone number required'),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  description: z.string().max(2000).optional(),
  service_areas_text: z.string().min(5, 'Enter at least one service area'),
  move_types: z.array(z.string()).min(1, 'Select at least one move type'),
  accepts_terms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms' }) }),
})

type ProviderSignupForm = z.infer<typeof providerSignupSchema>

export default function ProviderSignupPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const form = useForm<ProviderSignupForm>({
    resolver: zodResolver(providerSignupSchema),
    defaultValues: {
      move_types: [],
      accepts_terms: undefined,
    },
  })

  const onSubmit = async (data: ProviderSignupForm) => {
    setSubmitting(true)
    setError(null)

    try {
      const serviceAreas = data.service_areas_text
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      const res = await fetch('/api/providers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: data.company_name,
          abn: data.abn || undefined,
          email: data.email,
          phone: data.phone,
          website: data.website || undefined,
          description: data.description || undefined,
          service_areas: serviceAreas,
          move_types: data.move_types,
        }),
      })

      const body = await res.json()

      if (!res.ok) {
        setError(body.error || 'Registration failed. Please try again.')
        return
      }

      setSubmitted(true)
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Application submitted!</h2>
            <p className="text-muted-foreground mb-6">
              We&apos;ll review your application and contact you within 1 business day to complete verification
              and connect your bank account.
            </p>
            <Button onClick={() => router.push('/')}>Return to home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Join M2M Marketplace</h1>
            <p className="text-muted-foreground">Register your moving company</p>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Company Details */}
          <Card>
            <CardHeader>
              <CardTitle>Company Details</CardTitle>
              <CardDescription>Your business information for verification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input id="company_name" {...form.register('company_name')} placeholder="Fast Movers Pty Ltd" />
                {form.formState.errors.company_name && (
                  <p className="text-sm text-destructive">{form.formState.errors.company_name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="abn">ABN (optional)</Label>
                  <Input id="abn" {...form.register('abn')} placeholder="51 824 753 556" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input id="phone" {...form.register('phone')} placeholder="03 9876 5432" />
                  {form.formState.errors.phone && (
                    <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Business Email *</Label>
                <Input id="email" type="email" {...form.register('email')} placeholder="ops@yourcompany.com.au" />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website (optional)</Label>
                <Input id="website" {...form.register('website')} placeholder="https://yourcompany.com.au" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">About your company (optional)</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Tell customers about your experience, fleet size, and specialisations..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Service Areas */}
          <Card>
            <CardHeader>
              <CardTitle>Service Coverage</CardTitle>
              <CardDescription>Where you can operate and what types of moves you do</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="service_areas_text">Service Areas *</Label>
                <Input
                  id="service_areas_text"
                  {...form.register('service_areas_text')}
                  placeholder="Melbourne CBD, Southbank, Richmond, St Kilda (comma separated)"
                />
                {form.formState.errors.service_areas_text && (
                  <p className="text-sm text-destructive">{form.formState.errors.service_areas_text.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Move Types You Handle *</Label>
                <div className="grid grid-cols-2 gap-3">
                  {JOB_TYPES.map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={form.watch('move_types')?.includes(type)}
                        onCheckedChange={(checked) => {
                          const current = form.getValues('move_types') ?? []
                          form.setValue(
                            'move_types',
                            checked ? [...current, type] : current.filter((t) => t !== type)
                          )
                        }}
                      />
                      <span className="text-sm">{JOB_TYPE_LABELS[type]}</span>
                    </label>
                  ))}
                </div>
                {form.formState.errors.move_types && (
                  <p className="text-sm text-destructive">{form.formState.errors.move_types.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Terms */}
          <Card>
            <CardContent className="pt-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={form.watch('accepts_terms') === true}
                  onCheckedChange={(checked) => {
                    form.setValue('accepts_terms', checked ? true : (undefined as unknown as true))
                  }}
                />
                <span className="text-sm text-muted-foreground">
                  I agree to the M2M Marketplace{' '}
                  <a href="/terms" className="text-primary underline">Provider Terms & Conditions</a>
                  {' '}and acknowledge the 15% platform commission on each completed job.
                </span>
              </label>
              {form.formState.errors.accepts_terms && (
                <p className="text-sm text-destructive mt-2">{form.formState.errors.accepts_terms.message}</p>
              )}
            </CardContent>
          </Card>

          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting application...
              </>
            ) : (
              <>
                Submit Application
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
