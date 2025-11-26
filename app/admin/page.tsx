import { getLeads } from "@/app/actions/leads"
import { AdminDashboard } from "@/components/admin-dashboard"
import { AdminHeader } from "@/components/admin-header"
import { Phone, Users, Settings } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const { leads } = await getLeads()

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">M</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground font-mono">ADMIN_DASHBOARD</h1>
                <p className="text-sm text-muted-foreground">M&M Commercial Moving - Lead Management</p>
              </div>
            </div>
            <nav className="flex items-center gap-2">
              <Link
                href="/admin"
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-mono text-sm"
              >
                <Users className="w-4 h-4" />
                LEADS
              </Link>
              <Link
                href="/admin/voicemails"
                className="flex items-center gap-2 px-4 py-2 border border-border hover:bg-muted transition-colors font-mono text-sm"
              >
                <Phone className="w-4 h-4" />
                VOICEMAILS
              </Link>
              <Link
                href="/admin/settings"
                className="flex items-center gap-2 px-4 py-2 border border-border hover:bg-muted transition-colors font-mono text-sm"
              >
                <Settings className="w-4 h-4" />
                SETTINGS
              </Link>
            </nav>
          </div>
        </div>
      </div>
      <AdminDashboard initialLeads={leads || []} />
    </div>
  )
}
