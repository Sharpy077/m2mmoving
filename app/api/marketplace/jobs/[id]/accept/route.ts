import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const OFFER_WINDOW_MS = 10 * 60 * 1000 // 10 minutes

const acceptSchema = z.object({
  provider_id: z.string().min(1),
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

  const parsed = acceptSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { provider_id } = parsed.data
  const supabase = await createClient()

  // Fetch job
  const { data: job, error: jobError } = await supabase
    .from('marketplace_jobs')
    .select('id, status, assigned_provider_id, offer_sent_at')
    .eq('id', id)
    .single()

  if (jobError?.code === 'PGRST116' || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // Check the provider matches
  if (job.assigned_provider_id !== provider_id) {
    return NextResponse.json({ error: 'Forbidden: this job was not offered to you' }, { status: 403 })
  }

  // Check offer window
  if (job.offer_sent_at) {
    const sentAt = new Date(job.offer_sent_at).getTime()
    if (Date.now() - sentAt > OFFER_WINDOW_MS) {
      return NextResponse.json({ error: 'Offer window has expired' }, { status: 409 })
    }
  }

  // Accept: confirm job
  const { data: updated, error: updateError } = await supabase
    .from('marketplace_jobs')
    .update({
      status: 'confirmed',
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(updated ?? { status: 'confirmed' })
}
