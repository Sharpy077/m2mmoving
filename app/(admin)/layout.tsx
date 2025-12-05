/**
 * Admin Layout
 * Provides consistent layout for admin pages
 */

import { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    default: "Admin | M&M Commercial Moving",
    template: "%s | M&M Admin",
  },
  description: "M&M Commercial Moving Admin Dashboard",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Admin Navigation */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <a href="/admin" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">M²</span>
              </div>
              <span className="font-semibold text-white">Admin</span>
            </a>
            
            <nav className="hidden md:flex items-center gap-4">
              <a 
                href="/admin/agents" 
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                AI Salesforce
              </a>
              <a 
                href="/admin/leads" 
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                Leads
              </a>
              <a 
                href="/admin/bookings" 
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                Bookings
              </a>
              <a 
                href="/admin/analytics" 
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                Analytics
              </a>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <a 
              href="/"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              View Site
            </a>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="min-h-[calc(100vh-4rem)]">
        {children}
      </main>
    </div>
  )
}
