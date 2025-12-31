import { Suspense } from "react"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { BarChart3, TrendingUp, DollarSign, Users, Calendar, Target, ArrowUpRight, ArrowDownRight } from "lucide-react"

export const metadata: Metadata = {
  title: "Analytics | M&M Admin",
  description: "Business analytics and reports",
}

async function AnalyticsOverview() {
  const supabase = await createClient()

  // Fetch analytics data
  const [leadsResult, conversationsResult] = await Promise.all([
    supabase.from("leads").select("*"),
    supabase.from("conversation_analytics").select("*").order("created_at", { ascending: false }).limit(100),
  ])

  const leads = leadsResult.data || []
  const conversations = conversationsResult.data || []

  // Calculate metrics
  const totalLeads = leads.length
  const paidLeads = leads.filter((l) => l.deposit_paid).length
  const conversionRate = totalLeads > 0 ? ((paidLeads / totalLeads) * 100).toFixed(1) : "0"
  const totalRevenue = leads.filter((l) => l.deposit_paid).reduce((sum, l) => sum + (l.estimated_total || 0), 0)
  const avgDealSize = paidLeads > 0 ? totalRevenue / paidLeads : 0

  // Conversation metrics
  const avgMessageCount =
    conversations.length > 0
      ? (conversations.reduce((sum, c) => sum + (c.message_count || 0), 0) / conversations.length).toFixed(1)
      : "0"
  const completedConversations = conversations.filter((c) => c.completion_status === "completed").length
  const conversationCompletionRate =
    conversations.length > 0 ? ((completedConversations / conversations.length) * 100).toFixed(1) : "0"

  const metrics = [
    {
      label: "Total Leads",
      value: totalLeads.toLocaleString(),
      change: "+12%",
      positive: true,
      icon: Users,
      color: "cyan",
    },
    {
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      change: "+3.2%",
      positive: true,
      icon: Target,
      color: "emerald",
    },
    {
      label: "Total Revenue",
      value: `$${(totalRevenue / 1000).toFixed(0)}K`,
      change: "+18%",
      positive: true,
      icon: DollarSign,
      color: "violet",
    },
    {
      label: "Avg Deal Size",
      value: `$${avgDealSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      change: "+5%",
      positive: true,
      icon: TrendingUp,
      color: "amber",
    },
    {
      label: "Avg Messages/Conv",
      value: avgMessageCount,
      change: "-2",
      positive: true,
      icon: BarChart3,
      color: "blue",
    },
    {
      label: "Completion Rate",
      value: `${conversationCompletionRate}%`,
      change: "+8%",
      positive: true,
      icon: Calendar,
      color: "fuchsia",
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className={`p-4 rounded-xl border bg-gradient-to-b from-${metric.color}-500/20 to-${metric.color}-500/5 border-${metric.color}-500/30`}
        >
          <metric.icon className={`w-5 h-5 mb-2 text-${metric.color}-400 opacity-60`} />
          <div className="text-2xl font-bold">{metric.value}</div>
          <div className="text-xs text-white/40 mt-1">{metric.label}</div>
          <div
            className={`flex items-center gap-1 text-xs mt-2 ${metric.positive ? "text-emerald-400" : "text-rose-400"}`}
          >
            {metric.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {metric.change}
          </div>
        </div>
      ))}
    </div>
  )
}

async function LeadSourceChart() {
  const supabase = await createClient()
  const { data: leads } = await supabase.from("leads").select("lead_type, move_type")

  // Group by move type
  const moveTypes: Record<string, number> = {}
  leads?.forEach((lead) => {
    const type = lead.move_type || "Other"
    moveTypes[type] = (moveTypes[type] || 0) + 1
  })

  const maxValue = Math.max(...Object.values(moveTypes), 1)

  return (
    <div className="bg-white/[0.02] rounded-2xl border border-white/10 p-6">
      <h3 className="text-lg font-semibold mb-6">Leads by Move Type</h3>
      <div className="space-y-4">
        {Object.entries(moveTypes)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([type, count]) => (
            <div key={type} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{type}</span>
                <span className="text-white/40">{count} leads</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all"
                  style={{ width: `${(count / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

async function ConversationFunnel() {
  const supabase = await createClient()
  const { data: conversations } = await supabase
    .from("conversation_analytics")
    .select("stage_progression, completion_status")

  // Analyze funnel stages
  const stages = {
    greeting: 0,
    service_selected: 0,
    business_info: 0,
    addresses: 0,
    datetime: 0,
    contact: 0,
    payment: 0,
    completed: 0,
  }

  conversations?.forEach((conv) => {
    const progression = conv.stage_progression || []
    progression.forEach((stage: string) => {
      if (stage in stages) {
        stages[stage as keyof typeof stages]++
      }
    })
    if (conv.completion_status === "completed") {
      stages.completed++
    }
  })

  const maxStage = Math.max(...Object.values(stages), 1)

  return (
    <div className="bg-white/[0.02] rounded-2xl border border-white/10 p-6">
      <h3 className="text-lg font-semibold mb-6">Conversation Funnel</h3>
      <div className="space-y-3">
        {Object.entries(stages).map(([stage, count], i) => (
          <div key={stage} className="flex items-center gap-4">
            <div className="w-24 text-sm text-white/60 capitalize">{stage.replace("_", " ")}</div>
            <div className="flex-1 h-8 bg-white/5 rounded-lg overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-violet-500/50 to-fuchsia-500/50 rounded-lg transition-all"
                style={{ width: `${(count / maxStage) * 100}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">{count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-28 bg-white/5 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="h-80 bg-white/5 rounded-2xl" />
        <div className="h-80 bg-white/5 rounded-2xl" />
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-white/50 mt-1">Business performance and insights</p>
      </div>

      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsOverview />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<div className="h-80 bg-white/5 rounded-2xl animate-pulse" />}>
          <LeadSourceChart />
        </Suspense>
        <Suspense fallback={<div className="h-80 bg-white/5 rounded-2xl animate-pulse" />}>
          <ConversationFunnel />
        </Suspense>
      </div>
    </div>
  )
}
