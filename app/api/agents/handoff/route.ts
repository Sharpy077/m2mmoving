import { NextRequest, NextResponse } from "next/server"
import { getCortex } from "@/lib/agents/cortex/orchestrator"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fromAgent, toAgent, reason, context, conversationId } = body

    if (!fromAgent || !toAgent || !reason || !context) {
      return NextResponse.json(
        { error: "Missing required fields: fromAgent, toAgent, reason, context" },
        { status: 400 }
      )
    }

    const cortex = getCortex()
    const result = await cortex.executeHandoff({
      fromAgent,
      toAgent,
      reason,
      context,
      conversationId,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("[API] Handoff error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
