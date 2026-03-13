import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateProviderEarnings } from '@/lib/marketplace/earnings'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: payouts, error } = await supabase
    .from('marketplace_payouts')
    .select('id, provider_payout, platform_fee, status, created_at')
    .eq('provider_id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const summary = calculateProviderEarnings(payouts ?? [])

  return NextResponse.json({ summary, payouts: payouts ?? [] })
}
