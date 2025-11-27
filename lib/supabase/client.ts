import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

const SUPABASE_CLIENT_KEY = Symbol.for("supabase-client-singleton")

type GlobalWithSupabase = typeof globalThis & {
  [SUPABASE_CLIENT_KEY]?: SupabaseClient
}

export function createClient(): SupabaseClient {
  const globalStore = globalThis as GlobalWithSupabase

  if (globalStore[SUPABASE_CLIENT_KEY]) {
    return globalStore[SUPABASE_CLIENT_KEY]
  }

  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!,
  )

  globalStore[SUPABASE_CLIENT_KEY] = client

  return client
}
