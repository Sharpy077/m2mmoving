import { getLeads } from "@/app/actions/leads"
import { AdminDashboard } from "@/components/admin-dashboard"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const { leads } = await getLeads()

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">M</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-mono">ADMIN_DASHBOARD</h1>
              <p className="text-sm text-muted-foreground">M&M Commercial Moving - Lead Management</p>
            </div>
          </div>
        </div>
      </div>
      <AdminDashboard initialLeads={leads || []} />
    </div>
  )
}
