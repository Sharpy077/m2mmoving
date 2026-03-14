/**
 * AI Salesforce Admin Dashboard
 * Monitor, manage, and analyze all AI agents
 */

import type { Metadata } from "next"
import { AgentPageClient } from "./agent-page-client"

export const metadata: Metadata = {
  title: "AI Salesforce | M&M Commercial Moving",
  description: "Monitor and manage the AI salesforce agents",
}

export default function AgentsAdminPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <AgentPageClient />
    </div>
  )
}
