/**
 * AI Salesforce Admin Dashboard
 * Monitor, manage, and analyze all AI agents
 */

import type { Metadata } from "next"
import dynamic from "next/dynamic"

const AgentDashboard = dynamic(
  () => import("@/components/admin/agent-dashboard").then((mod) => ({ default: mod.AgentDashboard })),
  {
    ssr: false,
    loading: () => <DashboardSkeleton />,
  },
)

export const metadata: Metadata = {
  title: "AI Salesforce | M&M Commercial Moving",
  description: "Monitor and manage the AI salesforce agents",
}

export default function AgentsAdminPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <AgentDashboard />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-10 w-64 bg-white/5 rounded-lg" />
        <div className="h-10 w-32 bg-white/5 rounded-lg" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-white/5 rounded-2xl" />
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 h-96 bg-white/5 rounded-2xl" />
        <div className="h-96 bg-white/5 rounded-2xl" />
      </div>
    </div>
  )
}
