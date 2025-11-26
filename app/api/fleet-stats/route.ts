import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const defaults = {
    totalVehicles: 1,
    activeDeployments: 0,
    pipelineCount: 0,
    trackingUptime: 100,
    securityBreaches: 0,
  }

  try {
    const supabase = await createClient()

    let pipelineCount = 0
    let activeDeployments = 0

    try {
      const { data: pipelineLeads } = await supabase
        .from("leads")
        .select("id, status")
        .in("status", ["new", "contacted", "quoted"])

      pipelineCount = pipelineLeads?.length || 0

      // Check for active deployments (leads marked as won/in-progress)
      const { data: activeJobs } = await supabase.from("leads").select("id").eq("status", "won")

      activeDeployments = activeJobs?.length || 0
    } catch (e) {
      // Leads table doesn't exist yet, use defaults
      console.log("[v0] Leads table not ready yet")
    }

    let totalVehicles = 1
    let trackingUptime = 100

    try {
      const { data: vehicles, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("id, status, gps_last_ping")

      if (!vehiclesError && vehicles) {
        totalVehicles = vehicles.length || 1

        // Calculate tracking uptime based on GPS pings
        const now = new Date()
        const onlineVehicles = vehicles.filter((v) => {
          if (!v.gps_last_ping) return true
          const lastPing = new Date(v.gps_last_ping)
          const diffMinutes = (now.getTime() - lastPing.getTime()) / 1000 / 60
          return diffMinutes < 10
        })
        trackingUptime = totalVehicles > 0 ? Math.round((onlineVehicles.length / totalVehicles) * 100) : 100
      }
    } catch (e) {
      // Vehicles table doesn't exist yet, use defaults
      console.log("[v0] Vehicles table not ready yet")
    }

    return NextResponse.json({
      totalVehicles,
      activeDeployments,
      pipelineCount,
      trackingUptime,
      securityBreaches: 0,
    })
  } catch (error) {
    console.error("[v0] Fleet stats error:", error)
    return NextResponse.json(defaults)
  }
}
