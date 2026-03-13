import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { providerSchema } from '@/lib/marketplace/schemas'

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

    const { data, error } = await supabase
      .from('providers')
      .insert({
        ...parsed.data,
        verification_status: 'pending',
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
