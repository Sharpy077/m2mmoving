import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

const SUPABASE_CLIENT_KEY = "__SUPABASE_CLIENT__"

declare global {
  interface Window {
    [SUPABASE_CLIENT_KEY]?: SupabaseClient
  }
}

let serverSideClient: SupabaseClient | undefined

export function createClient(): SupabaseClient {
  // Check if we're in browser environment
  if (typeof window !== "undefined") {
    // Return existing browser client if it exists
    if (window[SUPABASE_CLIENT_KEY]) {
      return window[SUPABASE_CLIENT_KEY]
    }

    // Create new client and store on window
    const client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!,
    )

    window[SUPABASE_CLIENT_KEY] = client
    return client
  }

  // Server-side fallback (shouldn't normally be called from client.ts)
  if (!serverSideClient) {
    serverSideClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!,
    )
  }

  return serverSideClient
}
