import { NextRequest, NextResponse } from "next/server"
import { processScheduledCampaigns } from "@/lib/campaigns/engine"

export async function POST(req: NextRequest) {
  try {
    const result = await processScheduledCampaigns()
    return NextResponse.json(result)
  } catch (error) {
    console.error("[CRON] Campaign processing error:", error)
    return NextResponse.json(
      { error: "Failed to process campaigns" },
      { status: 500 }
    )
  }
}
