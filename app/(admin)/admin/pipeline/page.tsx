/**
 * Sales Pipeline - Deal Kanban Board
 * Drag-and-drop deal stages: New → Contacted → Quoted → Negotiation → Won/Lost
 */

import type { Metadata } from "next"
import { PipelineClient } from "./pipeline-client"

export const metadata: Metadata = {
  title: "Sales Pipeline | M&M Commercial Moving",
  description: "Manage deals through the sales pipeline",
}

export default function PipelinePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <PipelineClient />
    </div>
  )
}
