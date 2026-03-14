import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const verifySchema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()

  // Require authenticated admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = verifySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { action, notes } = parsed.data

  const updates: Record<string, unknown> = {
    verification_status: action === 'approve' ? 'verified' : 'rejected',
    updated_at: new Date().toISOString(),
  }

  if (action === 'approve') {
    updates.verified_at = new Date().toISOString()
    updates.rejection_notes = null
  } else {
    updates.rejection_notes = notes ?? null
  }

  const { data, error } = await supabase
    .from('providers')
    .update(updates)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? updates)
}
