"use client"

import { useState, useEffect } from "react"
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
} from "lucide-react"

interface Metric {
  label: string
  value: string
  change: string
  trend: "up" | "down"
  icon: any
  color: string
}

interface Insight {
  id: string
  title: string
  summary: string
  type: "trend" | "anomaly" | "recommendation"
  severity: "info" | "warning" | "positive"
}

export function AnalyticsClient() {
  const [metrics] = useState<Metric[]>([
    { label: "Monthly Revenue", value: "$127K", change: "+18%", trend: "up", icon: DollarSign, color: "emerald" },
    { label: "Total Leads", value: "234", change: "+12%", trend: "up", icon: Users, color: "cyan" },
    { label: "Conversion Rate", value: "38%", change: "+5%", trend: "up", icon: Target, color: "violet" },
    { label: "Avg Deal Size", value: "$8.4K", change: "-3%", trend: "down", icon: BarChart3, color: "amber" },
  ])

  const [insights] = useState<Insight[]>([
    { id: "1", title: "Conversion rate improving", summary: "Lead-to-quote conversion up 12% month-over-month, driven by Maya's improved quote accuracy.", type: "trend", severity: "positive" },
    { id: "2", title: "Weekend moves underpriced", summary: "Weekend jobs convert 40% higher but margins are 15% lower than weekday. Consider adjusting weekend rates.", type: "recommendation", severity: "warning" },
    { id: "3", title: "Data center moves growing", summary: "Data center migration inquiries up 25% — consider dedicated marketing campaign for this segment.", type: "trend", severity: "info" },
  ])

  const colorClasses: Record<string, string> = {
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400",
    cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-400",
    violet: "from-violet-500/20 to-violet-500/5 border-violet-500/30 text-violet-400",
    amber: "from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400",
  }

  const severityStyles: Record<string, string> = {
    info: "border-cyan-500/30 bg-cyan-500/10",
    warning: "border-amber-500/30 bg-amber-500/10",
    positive: "border-emerald-500/30 bg-emerald-500/10",
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">
          Business Intelligence
        </h1>
        <p className="text-white/50 mt-1">AI-powered analytics and insights from Oracle</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <div key={metric.label} className={`p-5 rounded-2xl border bg-gradient-to-b ${colorClasses[metric.color]}`}>
            <metric.icon className="w-5 h-5 mb-3 opacity-60" />
            <div className="text-3xl font-bold">{metric.value}</div>
            <div className="text-xs text-white/40 mt-1">{metric.label}</div>
            <div className={`flex items-center gap-1 mt-2 text-xs ${metric.trend === "up" ? "text-emerald-400" : "text-rose-400"}`}>
              {metric.trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {metric.change} vs last month
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white/[0.02] rounded-2xl border border-white/10 p-6">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Revenue Trend
          </h2>
          <div className="h-48 flex items-end gap-2">
            {Array.from({ length: 12 }, (_, i) => {
              const height = 30 + Math.random() * 70
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-gradient-to-t from-emerald-500/50 to-emerald-400/20 rounded-t"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] text-white/30">
                    {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][i]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pipeline Funnel */}
        <div className="bg-white/[0.02] rounded-2xl border border-white/10 p-6">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
            <Target className="w-5 h-5 text-violet-400" />
            Pipeline Funnel
          </h2>
          <div className="space-y-4">
            {[
              { stage: "New Leads", count: 234, width: "100%" },
              { stage: "Contacted", count: 187, width: "80%" },
              { stage: "Quoted", count: 142, width: "60%" },
              { stage: "Negotiation", count: 68, width: "30%" },
              { stage: "Won", count: 45, width: "20%" },
            ].map((item) => (
              <div key={item.stage} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{item.stage}</span>
                  <span className="text-white/40">{item.count}</span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all"
                    style={{ width: item.width }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-white/[0.02] rounded-2xl border border-white/10 p-6">
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
          <Lightbulb className="w-5 h-5 text-amber-400" />
          Oracle Insights
        </h2>
        <div className="space-y-4">
          {insights.map((insight) => (
            <div key={insight.id} className={`p-4 rounded-xl border ${severityStyles[insight.severity]}`}>
              <div className="font-semibold">{insight.title}</div>
              <div className="text-sm text-white/60 mt-1">{insight.summary}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-white/30 capitalize bg-white/10 px-2 py-0.5 rounded-full">
                  {insight.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
