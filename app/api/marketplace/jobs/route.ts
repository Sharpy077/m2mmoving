import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { marketplaceJobSchema } from '@/lib/marketplace/schemas'
import { determineMatchingMode, calculateMarketplaceFees } from '@/lib/marketplace'

const POSTED_STATUSES = ['posted', 'matching', 'bidding', 'assigned', 'confirmed', 'in_progress']

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status')
    const jobType = searchParams.get('job_type')

    const supabase = await createClient()

    let query = supabase
      .from('marketplace_jobs')
      .select('*')
      .in('status', statusFilter ? [statusFilter] : POSTED_STATUSES)
      .order('scheduled_date', { ascending: true })

    if (jobType) {
      query = query.eq('job_type', jobType) as typeof query
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch jobs.' }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error('[marketplace/jobs GET] Error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Determine matching mode based on job type and size
    const matching_mode = determineMatchingMode({
      job_type: body.job_type,
      square_meters: body.square_meters,
    })

    // Validate with schema
    const parsed = marketplaceJobSchema.safeParse({
      ...body,
      matching_mode,
      status: 'posted',
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join('; ') },
        { status: 400 }
      )
    }

    // Calculate fees
    const fees = calculateMarketplaceFees({
      customer_price: parsed.data.customer_price,
      commission_rate: parsed.data.platform_fee_pct,
    })

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('marketplace_jobs')
      .insert({
        ...parsed.data,
        platform_fee: fees.platform_fee,
        provider_payout: fees.provider_payout,
        payment_status: 'unpaid',
      })
      .select()
      .single()

    if (error) {
      console.error('[marketplace/jobs POST] DB error:', error)
      return NextResponse.json({ error: 'Failed to create job.' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[marketplace/jobs POST] Error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
