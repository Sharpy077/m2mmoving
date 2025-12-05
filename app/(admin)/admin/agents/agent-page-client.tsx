"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const AgentDashboard = dynamic(() => import("@/components/admin/agent-dashboard").then((mod) => mod.AgentDashboard), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  ),
})

export function AgentPageClient() {
  return <AgentDashboard />
}
