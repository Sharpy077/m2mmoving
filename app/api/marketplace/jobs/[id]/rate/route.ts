import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const rateSchema = z.object({
  rater: z.enum(['customer', 'provider'], {
    errorMap: () => ({ message: 'rater must be "customer" or "provider"' }),
  }),
  rating: z
    .number()
    .int()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5'),
  review: z.string().max(2000).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const parsed = rateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join('; ') },
        { status: 400 }
      )
    }

    const { rater, rating, review } = parsed.data

    const updateFields =
      rater === 'customer'
        ? { customer_rating: rating, customer_review: review ?? null }
        : { provider_rating: rating, provider_review: review ?? null }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('marketplace_jobs')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to save rating.' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[jobs/rate POST] Error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
