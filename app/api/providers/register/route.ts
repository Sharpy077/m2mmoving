import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { providerSchema } from '@/lib/marketplace/schemas'

const NEW_ENTRANT_COMMISSION_RATE = 0.10
const STANDARD_COMMISSION_RATE = 0.15

function calculateNewEntrantExpiry(from: Date): string {
  const expiry = new Date(from)
  expiry.setMonth(expiry.getMonth() + 1)
  return expiry.toISOString()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const parsed = providerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join('; ') },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const isNewEntrant = parsed.data.is_new_entrant === true

    const { data, error } = await supabase
      .from('providers')
      .insert({
        ...parsed.data,
        verification_status: 'pending',
        // Server-side enforcement: entrant onboarding gets 10% commission until new_entrant_expires_at.
        // Ongoing rate transitions should reference this expiry window, not client-supplied values.
        // Source of truth: this /api/providers/register route.
        commission_rate: isNewEntrant ? NEW_ENTRANT_COMMISSION_RATE : STANDARD_COMMISSION_RATE,
        is_new_entrant: isNewEntrant,
        new_entrant_expires_at: isNewEntrant ? calculateNewEntrantExpiry(new Date()) : null,
      })
      .select()
      .single()

    if (error) {
      // Unique constraint violation (duplicate email / ABN)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A provider with this email or ABN already exists.' },
          { status: 409 }
        )
      }
      console.error('[providers/register] DB error:', error)
      return NextResponse.json({ error: 'Failed to register provider.' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[providers/register] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
