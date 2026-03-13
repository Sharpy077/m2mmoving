import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { providerSchema } from '@/lib/marketplace/schemas'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Provider not found.' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch provider.' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[providers/[id]] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    // Partial validation — only validate provided fields
    const parsed = providerSchema.partial().safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join('; ') },
        { status: 400 }
      )
    }

    // Strip fields that providers cannot self-update
    const { commission_rate: _c, ...safeUpdate } = parsed.data as typeof parsed.data & { commission_rate?: number }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('providers')
      .update(safeUpdate)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to update provider.' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[providers/[id]] PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
