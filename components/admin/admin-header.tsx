"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { LogOut, UserIcon, ChevronDown, Menu, X, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { logoutAction } from "@/app/actions/auth"

interface AdminHeaderProps {
  user: User | null
  adminUser: {
    full_name: string | null
    role: string
    email: string
  } | null
}

const navLinks = [
  { href: "/admin/agents", label: "AI Salesforce" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/prospects", label: "Prospects" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/tickets", label: "Support" },
  { href: "/admin/operations", label: "Operations" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/voicemails", label: "Voicemails" },
  { href: "/admin/webhook-test", label: "Webhook Test" },
  { href: "/admin/settings", label: "Settings" },
]

const roleColors: Record<string, string> = {
  admin: "text-cyan-400",
  manager: "text-violet-400",
  agent: "text-emerald-400",
  viewer: "text-white/60",
}

export function AdminHeader({ user, adminUser }: AdminHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    await logoutAction()
    router.push("/")
  }

  const displayName = adminUser?.full_name || user?.email?.split("@")[0] || "Admin"
  const roleLabel = adminUser?.role?.toUpperCase() || "USER"

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <a href="/admin" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">M²</span>
            </div>
            <span className="font-semibold text-white">Admin</span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-4">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="text-sm text-white/60 hover:text-white transition-colors">
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* View Site Link */}
          <a href="/" className="hidden sm:block text-sm text-white/60 hover:text-white transition-colors">
            View Site
          </a>

          {/* User Dropdown */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-white/80 hover:text-white hover:bg-white/10"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/20 flex items-center justify-center">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-medium">{displayName}</span>
                    <span className={`text-xs ${roleColors[adminUser?.role || "viewer"]}`}>{roleLabel}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-white/40" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#0a0a0f] border-white/10 text-white">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{displayName}</p>
                    <p className="text-xs text-white/60">{user.email}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Shield className="h-3 w-3 text-white/40" />
                      <span className={`text-xs ${roleColors[adminUser?.role || "viewer"]}`}>{roleLabel}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  className="text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                  onClick={() => router.push("/admin/settings")}
                >
                  <UserIcon className="mr-2 h-4 w-4" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/10 bg-[#0a0a0f]">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-white/60 hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-white/5"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a
              href="/"
              className="text-sm text-white/60 hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-white/5"
            >
              View Site
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
