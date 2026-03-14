/**
 * Health Check Endpoint for Quote Assistant
 * Used by the client to verify the service is operational
 */

import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Check if OpenAI API key is configured
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY

    // Basic health check
    const health = {
      status: hasOpenAIKey ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks: {
        openai: hasOpenAIKey,
        supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      },
    }

    if (!hasOpenAIKey) {
      return NextResponse.json(health, { status: 503 })
    }

    return NextResponse.json(health, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
      },
      { status: 500 },
    )
  }
}
