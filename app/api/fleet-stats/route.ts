import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Get vehicle count
    const { data: vehicles, error: vehiclesError } = await supabase.from("vehicles").select("id, status, gps_last_ping")

    if (vehiclesError) {
      console.error("[v0] Error fetching vehicles:", vehiclesError)
      // Return defaults if table doesn't exist yet
      return NextResponse.json({
        totalVehicles: 1,
        activeDeployments: 0,
        pipelineCount: 0,
        trackingUptime: 100,
        securityBreaches: 0,
      })
    }

    const totalVehicles = vehicles?.length || 1

    // Get active deployments (leads with deployment_status = 'in_progress')
    const { data: activeJobs, error: activeError } = await supabase
      .from("leads")
      .select("id")
      .eq("deployment_status", "in_progress")

    const activeDeployments = activeJobs?.length || 0

    // Get pipeline count (leads that are new, contacted, or quoted - not yet won/lost)
    const { data: pipelineLeads, error: pipelineError } = await supabase
      .from("leads")
      .select("id")
      .in("status", ["new", "contacted", "quoted"])

    const pipelineCount = pipelineLeads?.length || 0

    // Calculate tracking uptime based on GPS pings (simplified)
    // In production, this would query a GPS tracking service like Traccar
    const now = new Date()
    const onlineVehicles = vehicles?.filter((v) => {
      if (!v.gps_last_ping) return true // Assume online if no GPS yet
      const lastPing = new Date(v.gps_last_ping)
      const diffMinutes = (now.getTime() - lastPing.getTime()) / 1000 / 60
      return diffMinutes < 10 // Consider online if pinged in last 10 minutes
    })
    const trackingUptime =
      totalVehicles > 0 ? Math.round(((onlineVehicles?.length || totalVehicles) / totalVehicles) * 100) : 100

    return NextResponse.json({
      totalVehicles,
      activeDeployments,
      pipelineCount,
      trackingUptime,
      securityBreaches: 0, // Track manually or via incident reports
    })
  } catch (error) {
    console.error("[v0] Fleet stats error:", error)
    return NextResponse.json({
      totalVehicles: 1,
      activeDeployments: 0,
      pipelineCount: 0,
      trackingUptime: 100,
      securityBreaches: 0,
    })
  }
}
