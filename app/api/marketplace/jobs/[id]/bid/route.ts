import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { jobBidSchema } from '@/lib/marketplace/schemas'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: job_id } = await params
    const body = await req.json()

    const parsed = jobBidSchema.safeParse({ ...body, job_id })
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join('; ') },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('job_bids')
      .insert({
        ...parsed.data,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'You have already submitted a bid for this job.' },
          { status: 409 }
        )
      }
      console.error('[jobs/bid POST] DB error:', error)
      return NextResponse.json({ error: 'Failed to submit bid.' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[jobs/bid POST] Error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
