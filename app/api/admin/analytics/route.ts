import { NextRequest, NextResponse } from "next/server"
import { getDashboardMetrics } from "@/lib/operations/analytics"

export async function GET(req: NextRequest) {
  try {
    const metrics = await getDashboardMetrics()
    return NextResponse.json(metrics)
  } catch (error) {
    console.error("[API] Analytics error:", error)
    return NextResponse.json(
      { error: "Failed to get analytics" },
      { status: 500 }
    )
  }
}
