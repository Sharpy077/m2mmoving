/**
 * Business Intelligence Dashboard
 * Revenue, pipeline, conversion charts powered by Oracle agent
 */

import type { Metadata } from "next"
import { AnalyticsClient } from "./analytics-client"

export const metadata: Metadata = {
  title: "Analytics | M&M Commercial Moving",
  description: "Business intelligence and performance analytics",
}

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <AnalyticsClient />
    </div>
  )
}
