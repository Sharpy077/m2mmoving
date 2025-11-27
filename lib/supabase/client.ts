import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

const SUPABASE_CLIENT_KEY = "__SUPABASE_CLIENT__"

declare global {
  interface Window {
    [SUPABASE_CLIENT_KEY]?: SupabaseClient
  }
}

let browserClient: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  if (browserClient) {
    return browserClient
  }

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!,
    {
      // Suppress multiple instance warning - we ensure singleton at module level
      isSingleton: true,
    },
  )

  return browserClient
}
