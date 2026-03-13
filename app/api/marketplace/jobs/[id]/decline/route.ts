import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const declineSchema = z.object({
  provider_id: z.string().min(1),
  reason: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = declineSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { provider_id } = parsed.data
  const supabase = await createClient()

  // Fetch job
  const { data: job, error: jobError } = await supabase
    .from('marketplace_jobs')
    .select('id, status, assigned_provider_id')
    .eq('id', id)
    .single()

  if (jobError?.code === 'PGRST116' || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // Only the offered provider may decline
  if (job.assigned_provider_id !== provider_id) {
    return NextResponse.json({ error: 'Forbidden: this job was not offered to you' }, { status: 403 })
  }

  // Reset job to pending so DISPATCH can re-assign
  const { error: updateError } = await supabase
    .from('marketplace_jobs')
    .update({
      status: 'pending',
      assigned_provider_id: null,
      assigned_at: null,
      offer_sent_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Signal that the job has been re-queued for dispatch
  // In production the DISPATCH agent would be triggered here via a background job / queue
  return NextResponse.json({ re_dispatched: true, job_id: id })
}
