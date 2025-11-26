"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { LogOut, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export function AdminHeader() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || null)
    })
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

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
        <Button variant="outline" size="sm" onClick={handleLogout} className="font-mono text-xs bg-transparent">
          <LogOut className="w-4 h-4 mr-2" />
          LOGOUT
        </Button>
      </div>
    </div>
  )
}
