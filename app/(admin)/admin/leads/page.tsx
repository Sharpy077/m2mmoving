import { Suspense } from "react"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import {
  Users,
  Filter,
  Download,
  Mail,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Leads | M&M Admin",
  description: "Manage customer leads",
}

async function LeadsTable() {
  const supabase = await createClient()

  const { data: leads, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("[v0] Error fetching leads:", error)
    return <div className="text-red-400">Error loading leads</div>
  }

  const statusColors: Record<string, string> = {
    new: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    contacted: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    qualified: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    confirmed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    completed: "bg-green-500/20 text-green-400 border-green-500/30",
    cancelled: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  }

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case "confirmed":
      case "completed":
        return <CheckCircle2 className="w-3 h-3" />
      case "cancelled":
        return <AlertCircle className="w-3 h-3" />
      default:
        return <Clock className="w-3 h-3" />
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-3 px-4 text-xs font-medium text-white/40 uppercase tracking-wider">Company</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-white/40 uppercase tracking-wider">Contact</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-white/40 uppercase tracking-wider">Move</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-white/40 uppercase tracking-wider">Date</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-white/40 uppercase tracking-wider">Value</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-white/40 uppercase tracking-wider">Deposit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {leads?.map((lead) => (
            <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
              <td className="py-4 px-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/5">
                    <Building2 className="w-4 h-4 text-white/40" />
                  </div>
                  <div>
                    <div className="font-medium">{lead.company_name || "N/A"}</div>
                    <div className="text-xs text-white/40">{lead.move_type || "Commercial"}</div>
                  </div>
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="text-sm">{lead.contact_name || "N/A"}</div>
                <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                  {lead.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {lead.email}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-1 text-sm">
                  <MapPin className="w-3 h-3 text-white/40" />
                  <span>{lead.origin_suburb || "?"}</span>
                  <span className="text-white/20">→</span>
                  <span>{lead.destination_suburb || "?"}</span>
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-1 text-sm">
                  <Calendar className="w-3 h-3 text-white/40" />
                  {lead.target_move_date
                    ? new Date(lead.target_move_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })
                    : "TBC"}
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-1 text-sm font-medium">
                  <DollarSign className="w-3 h-3 text-white/40" />
                  {lead.estimated_total ? `${lead.estimated_total.toLocaleString()}` : "TBC"}
                </div>
              </td>
              <td className="py-4 px-4">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusColors[lead.status] || statusColors.new}`}
                >
                  <StatusIcon status={lead.status} />
                  {lead.status || "new"}
                </span>
              </td>
              <td className="py-4 px-4">
                {lead.deposit_paid ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    Paid
                  </span>
                ) : (
                  <span className="text-white/40 text-sm">Pending</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {(!leads || leads.length === 0) && (
        <div className="text-center py-12 text-white/40">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p>No leads found</p>
        </div>
      )}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-white/5 rounded-lg" />
      ))}
    </div>
  )
}

function SearchControls() {
  return (
    <div className="flex items-center gap-3">
      <button className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
        <Filter className="w-5 h-5" />
      </button>
      <button className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
        <Download className="w-5 h-5" />
      </button>
    </div>
  )
}

export default function LeadsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-white/50 mt-1">Manage and track customer leads</p>
        </div>
        <SearchControls />
      </div>

      <div className="bg-white/[0.02] rounded-2xl border border-white/10 overflow-hidden">
        <Suspense fallback={<TableSkeleton />}>
          <LeadsTable />
        </Suspense>
      </div>
    </div>
  )
}
