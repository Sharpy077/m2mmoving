/**
 * Crew Scheduling Dashboard
 * Weekly view of jobs, crew assignments, vehicle allocation
 */

import type { Metadata } from "next"
import { SchedulingClient } from "./scheduling-client"

export const metadata: Metadata = {
  title: "Scheduling | M&M Commercial Moving",
  description: "Manage crew scheduling and job assignments",
}

export default function SchedulingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <SchedulingClient />
    </div>
  )
}
