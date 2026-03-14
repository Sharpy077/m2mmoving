import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('marketplace_jobs')
    .select('*')
    .eq('id', id)
    .single()

  if (error?.code === 'PGRST116' || !data) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
