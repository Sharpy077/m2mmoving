import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { AdminHeader } from "@/components/admin/admin-header"

import type { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    default: "Admin | M&M Commercial Moving",
    template: "%s | M&M Admin",
  },
  description: "M&M Commercial Moving Admin Dashboard",
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get admin user details
  let adminUser = null
  if (user) {
    const { data } = await supabase.from("admin_users").select("full_name, role, email").eq("id", user.id).single()
    adminUser = data
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <AdminHeader user={user} adminUser={adminUser} />
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
    </div>
  )
}
