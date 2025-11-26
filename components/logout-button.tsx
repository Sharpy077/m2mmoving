"use client"

import { logoutAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { useTransition } from "react"

export function LogoutButton() {
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction()
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLogout}
      disabled={isPending}
      className="font-mono text-xs bg-transparent"
    >
      <LogOut className="w-4 h-4 mr-2" />
      {isPending ? "LOGGING OUT..." : "LOGOUT"}
    </Button>
  )
}
