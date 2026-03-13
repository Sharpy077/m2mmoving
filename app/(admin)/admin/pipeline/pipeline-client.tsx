"use client"

import { useState, useEffect } from "react"
import { ArrowRight, DollarSign, Clock, Users } from "lucide-react"

interface DealCard {
  id: string
  companyName: string
  contactName: string
  estimatedTotal: number
  moveType: string
  daysInStage: number
  stage: string
}

const STAGES = ["new", "contacted", "quoted", "negotiation", "won", "lost"]

const STAGE_COLORS: Record<string, string> = {
  new: "border-blue-500/30 bg-blue-500/10",
  contacted: "border-cyan-500/30 bg-cyan-500/10",
  quoted: "border-violet-500/30 bg-violet-500/10",
  negotiation: "border-amber-500/30 bg-amber-500/10",
  won: "border-emerald-500/30 bg-emerald-500/10",
  lost: "border-rose-500/30 bg-rose-500/10",
}

export function PipelineClient() {
  const [deals, setDeals] = useState<DealCard[]>([])

  useEffect(() => {
    // Fetch leads and group by deal_stage
    loadDeals()
  }, [])

  const loadDeals = async () => {
    try {
      const res = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: "ORACLE_ANL", message: "Get pipeline data" }),
      })
      // Simulated data for now
      setDeals(generateSampleDeals())
    } catch {
      setDeals(generateSampleDeals())
    }
  }

  const getDealsForStage = (stage: string) => deals.filter((d) => d.stage === stage)

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
          Sales Pipeline
        </h1>
        <p className="text-white/50 mt-1">Track deals from lead to close</p>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Deals" value={deals.length.toString()} color="cyan" />
        <StatCard icon={DollarSign} label="Pipeline Value" value={`$${(deals.reduce((s, d) => s + d.estimatedTotal, 0) / 1000).toFixed(0)}K`} color="emerald" />
        <StatCard icon={ArrowRight} label="Conversion Rate" value="38%" color="violet" />
        <StatCard icon={Clock} label="Avg Days to Close" value="12" color="amber" />
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-6 gap-4 overflow-x-auto">
        {STAGES.map((stage) => (
          <div key={stage} className="min-w-[220px]">
            <div className={`rounded-xl border p-3 mb-3 ${STAGE_COLORS[stage]}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold capitalize">{stage}</h3>
                <span className="text-xs text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
                  {getDealsForStage(stage).length}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {getDealsForStage(stage).map((deal) => (
                <div
                  key={deal.id}
                  className="p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
                >
                  <div className="font-medium text-sm truncate">{deal.companyName}</div>
                  <div className="text-xs text-white/40 mt-1">{deal.contactName}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-semibold text-emerald-400">
                      ${deal.estimatedTotal.toLocaleString()}
                    </span>
                    <span className="text-xs text-white/30">{deal.daysInStage}d</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colorClasses: Record<string, string> = {
    cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-400",
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400",
    violet: "from-violet-500/20 to-violet-500/5 border-violet-500/30 text-violet-400",
    amber: "from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400",
  }

  return (
    <div className={`p-4 rounded-2xl border bg-gradient-to-b ${colorClasses[color]}`}>
      <Icon className="w-5 h-5 mb-2 opacity-60" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-white/40 mt-1">{label}</div>
    </div>
  )
}

function generateSampleDeals(): DealCard[] {
  const companies = ["Acme Corp", "TechStart AU", "Melbourne Design", "CBD Lawyers", "Harbour Finance", "DataVault", "GreenOffice", "Metro Logistics"]
  const stages = ["new", "new", "contacted", "contacted", "quoted", "quoted", "negotiation", "won"]

  return companies.map((name, i) => ({
    id: `deal_${i}`,
    companyName: name,
    contactName: `Contact ${i + 1}`,
    estimatedTotal: 5000 + Math.floor(Math.random() * 30000),
    moveType: "office",
    daysInStage: Math.floor(Math.random() * 14),
    stage: stages[i],
  }))
}
