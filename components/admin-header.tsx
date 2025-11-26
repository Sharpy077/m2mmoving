"use client"

import { createClient } from "@/lib/supabase/server"
import { LogoutButton } from "@/components/logout-button"
import { User } from "lucide-react"

export async function AdminHeader() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const userEmail = data.user?.email || null

  return (
    <div className="flex items-center justify-between p-4 border-b border-border bg-card">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-secondary animate-pulse" />
          <span className="font-mono text-xs text-muted-foreground">ADMIN PORTAL ACTIVE</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {userEmail && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            <span className="font-mono text-xs">{userEmail}</span>
          </div>
        )}
        <LogoutButton />
      </div>
    </div>
  )
}
