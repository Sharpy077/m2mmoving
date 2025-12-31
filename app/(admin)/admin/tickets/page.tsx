import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Ticket, Clock, AlertTriangle, CheckCircle, MessageSquare } from "lucide-react"

const priorityColors: Record<string, string> = {
  low: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  medium: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  high: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  urgent: "bg-red-500/20 text-red-300 border-red-500/30",
}

const statusColors: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  pending: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  in_progress: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  waiting_customer: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  resolved: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  closed: "bg-slate-500/20 text-slate-300 border-slate-500/30",
}

const categoryIcons: Record<string, React.ReactNode> = {
  inquiry: <MessageSquare className="h-4 w-4" />,
  booking: <Ticket className="h-4 w-4" />,
  complaint: <AlertTriangle className="h-4 w-4" />,
  damage: <AlertTriangle className="h-4 w-4" />,
  refund: <Clock className="h-4 w-4" />,
  billing: <Clock className="h-4 w-4" />,
  other: <MessageSquare className="h-4 w-4" />,
}

export default async function TicketsPage() {
  const supabase = await createClient()

  // Fetch tickets
  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)

  // Fetch stats
  const { count: openCount } = await supabase
    .from("support_tickets")
    .select("*", { count: "exact", head: true })
    .in("status", ["open", "pending", "in_progress"])

  const { count: urgentCount } = await supabase
    .from("support_tickets")
    .select("*", { count: "exact", head: true })
    .eq("priority", "urgent")
    .in("status", ["open", "pending", "in_progress"])

  const { count: resolvedToday } = await supabase
    .from("support_tickets")
    .select("*", { count: "exact", head: true })
    .eq("status", "resolved")
    .gte("resolved_at", new Date().toISOString().split("T")[0])

  const stats = [
    { label: "Open Tickets", value: openCount || 0, icon: Ticket, color: "text-blue-400" },
    { label: "Urgent", value: urgentCount || 0, icon: AlertTriangle, color: "text-red-400" },
    { label: "Resolved Today", value: resolvedToday || 0, icon: CheckCircle, color: "text-emerald-400" },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Support Tickets</h1>
        <p className="text-white/60">Manage customer support requests handled by Sentinel</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60">{stat.label}</p>
                  <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color} opacity-50`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tickets Table */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Recent Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {!tickets || tickets.length === 0 ? (
            <div className="text-center py-12 text-white/40">
              <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No support tickets yet</p>
              <p className="text-sm mt-1">Tickets created by Sentinel will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-white/10">
                        {categoryIcons[ticket.category] || <Ticket className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-white/40">{ticket.ticket_number}</span>
                          <Badge variant="outline" className={priorityColors[ticket.priority]}>
                            {ticket.priority}
                          </Badge>
                          <Badge variant="outline" className={statusColors[ticket.status]}>
                            {ticket.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <h3 className="font-medium text-white">{ticket.subject}</h3>
                        <p className="text-sm text-white/60 line-clamp-1 mt-1">{ticket.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
                          {ticket.customer_email && <span>{ticket.customer_email}</span>}
                          <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
