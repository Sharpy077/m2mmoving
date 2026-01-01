import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
      },
    },
  })

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (request.nextUrl.pathname.startsWith("/admin")) {
      // Check if user is authenticated
      if (!user) {
        const url = request.nextUrl.clone()
        url.pathname = "/auth/login"
        url.searchParams.set("redirect", request.nextUrl.pathname)
        return NextResponse.redirect(url)
      }

      try {
        // Check if user has admin access (check admin_users table)
        const { data: adminUser } = await supabase
          .from("admin_users")
          .select("role, is_active")
          .eq("id", user.id)
          .single()

        // If no admin record exists, auto-create one for the first admin user
        if (!adminUser) {
          // Check if any admin users exist
          const { count } = await supabase.from("admin_users").select("*", { count: "exact", head: true })

          if (count === 0) {
            // First user becomes admin - auto-create record
            await supabase.from("admin_users").insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.email?.split("@")[0],
              role: "admin",
              is_active: true,
              last_login_at: new Date().toISOString(),
            })
          } else {
            // Deny access - user not in admin_users
            const url = request.nextUrl.clone()
            url.pathname = "/auth/unauthorized"
            return NextResponse.redirect(url)
          }
        } else if (!adminUser.is_active) {
          // User is deactivated
          const url = request.nextUrl.clone()
          url.pathname = "/auth/unauthorized"
          return NextResponse.redirect(url)
        } else {
          // Update last login (fire and forget)
          supabase
            .from("admin_users")
            .update({ last_login_at: new Date().toISOString() })
            .eq("id", user.id)
            .then(() => {})
            .catch(() => {})
        }
      } catch {
        // admin_users table may not exist yet - allow access for initial setup
        console.warn("[middleware] admin_users table not accessible - allowing access for setup")
      }
    }
  } catch {
    // Auth failed - continue without user
    console.warn("[middleware] Auth check failed - continuing without user")
  }

  return supabaseResponse
}
