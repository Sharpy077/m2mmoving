import { Suspense } from "react"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import {
  Bot,
  Users,
  Calendar,
  BarChart3,
  Settings,
  TrendingUp,
  DollarSign,
  Phone,
  ArrowRight,
  Activity,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Dashboard | M&M Admin",
  description: "Admin dashboard overview",
}

async function DashboardStats() {
  const supabase = await createClient()

  // Fetch stats
  const [leadsResult, bookingsResult, voicemailsResult] = await Promise.all([
    supabase.from("leads").select("id, status, estimated_total, deposit_paid", { count: "exact" }),
    supabase.from("leads").select("id").eq("status", "confirmed"),
    supabase.from("voicemails").select("id").eq("status", "new"),
  ])

  const leads = leadsResult.data || []
  const totalLeads = leadsResult.count || 0
  const confirmedBookings = bookingsResult.data?.length || 0
  const newVoicemails = voicemailsResult.data?.length || 0
  const totalRevenue = leads.filter((l) => l.deposit_paid).reduce((sum, l) => sum + (l.estimated_total || 0), 0)
  const paidDeposits = leads.filter((l) => l.deposit_paid).length

  const stats = [
    { label: "Total Leads", value: totalLeads, icon: Users, color: "cyan", href: "/admin/leads" },
    {
      label: "Confirmed Bookings",
      value: confirmedBookings,
      icon: Calendar,
      color: "emerald",
      href: "/admin/bookings",
    },
    {
      label: "Revenue Pipeline",
      value: `$${(totalRevenue / 1000).toFixed(0)}K`,
      icon: DollarSign,
      color: "violet",
      href: "/admin/analytics",
    },
    { label: "Paid Deposits", value: paidDeposits, icon: TrendingUp, color: "amber", href: "/admin/leads" },
    { label: "New Voicemails", value: newVoicemails, icon: Phone, color: "rose", href: "/admin/voicemails" },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <Link
          key={stat.label}
          href={stat.href}
          className={`
            p-4 rounded-xl border bg-gradient-to-b transition-all hover:scale-[1.02]
            from-${stat.color}-500/20 to-${stat.color}-500/5 
            border-${stat.color}-500/30 text-${stat.color}-400
          `}
        >
          <stat.icon className="w-5 h-5 mb-2 opacity-60" />
          <div className="text-2xl font-bold">{stat.value}</div>
          <div className="text-xs text-white/40">{stat.label}</div>
        </Link>
      ))}
    </div>
  )
}

function QuickActions() {
  const actions = [
    { label: "AI Salesforce", description: "Monitor AI agents", href: "/admin/agents", icon: Bot, color: "cyan" },
    { label: "Leads", description: "View all leads", href: "/admin/leads", icon: Users, color: "emerald" },
    { label: "Bookings", description: "Manage bookings", href: "/admin/bookings", icon: Calendar, color: "violet" },
    { label: "Analytics", description: "View reports", href: "/admin/analytics", icon: BarChart3, color: "amber" },
    { label: "Voicemails", description: "Listen to messages", href: "/admin/voicemails", icon: Phone, color: "rose" },
    { label: "Settings", description: "System config", href: "/admin/settings", icon: Settings, color: "slate" },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className="group p-6 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all"
        >
          <div className="flex items-start justify-between">
            <div className={`p-3 rounded-xl bg-${action.color}-500/10 text-${action.color}-400`}>
              <action.icon className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-white/60 transition-colors" />
          </div>
          <h3 className="font-semibold mt-4">{action.label}</h3>
          <p className="text-sm text-white/40 mt-1">{action.description}</p>
        </Link>
      ))}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-8 animate-pulse">
      <div className="grid grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-white/5 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 bg-white/5 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-white/50 mt-1">Overview of your business operations</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
          <Activity className="w-4 h-4 animate-pulse" />
          <span>System Online</span>
        </div>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardStats />
      </Suspense>

      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <QuickActions />
      </div>
    </div>
  )
}
