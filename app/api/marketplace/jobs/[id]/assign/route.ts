import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const assignSchema = z.object({
  provider_id: z.string().min(1, 'provider_id is required'),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: job_id } = await params
    const body = await req.json()

    const parsed = assignSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join('; ') },
        { status: 400 }
      )
    }

    const { provider_id } = parsed.data
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('marketplace_jobs')
      .update({
        status: 'assigned',
        assigned_provider_id: provider_id,
        assigned_at: new Date().toISOString(),
      })
      .eq('id', job_id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to assign job.' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[jobs/assign POST] Error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
