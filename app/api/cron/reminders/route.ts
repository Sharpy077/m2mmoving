import { NextRequest, NextResponse } from "next/server"
import { processReminders } from "@/lib/service/reminders"

export async function POST(req: NextRequest) {
  try {
    const result = await processReminders()
    return NextResponse.json(result)
  } catch (error) {
    console.error("[CRON] Reminder processing error:", error)
    return NextResponse.json(
      { error: "Failed to process reminders" },
      { status: 500 }
    )
  }
}
