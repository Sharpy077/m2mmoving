import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('provider_id, role')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    user_id: user.id,
    provider_id: profile?.provider_id ?? null,
    role: profile?.role ?? null,
  })
}
