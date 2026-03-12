/**
 * Conversation Analytics Endpoint
 * Stores conversation metrics for analysis
 */

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
  try {
    const metrics = await req.json()

    // Store in Supabase if available
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

      await supabase.from("conversation_analytics").insert({
        conversation_id: metrics.conversationId,
        start_time: new Date(metrics.startTime).toISOString(),
        end_time: metrics.endTime ? new Date(metrics.endTime).toISOString() : null,
        duration_ms: metrics.duration,
        message_count: metrics.messageCount,
        user_message_count: metrics.userMessageCount,
        assistant_message_count: metrics.assistantMessageCount,
        error_count: metrics.errorCount,
        retry_count: metrics.retryCount,
        stage_progression: metrics.stageProgression,
        completion_status: metrics.completionStatus,
        conversion_funnel: metrics.conversionFunnel,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ConversationAnalytics] Error storing metrics:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const period = searchParams.get("period") || "7d"

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    // Calculate date range
    const days = period === "30d" ? 30 : period === "24h" ? 1 : 7
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from("conversation_analytics")
      .select("*")
      .gte("start_time", startDate.toISOString())
      .order("start_time", { ascending: false })

    if (error) throw error

    // Aggregate metrics
    const totalConversations = data?.length || 0
    const completed = data?.filter((c) => c.completion_status === "completed").length || 0
    const abandoned = data?.filter((c) => c.completion_status === "abandoned").length || 0
    const escalated = data?.filter((c) => c.completion_status === "escalated").length || 0
    const totalErrors = data?.reduce((sum, c) => sum + (c.error_count || 0), 0) || 0

    return NextResponse.json({
      period,
      metrics: {
        totalConversations,
        completionRate: totalConversations > 0 ? (completed / totalConversations) * 100 : 0,
        abandonmentRate: totalConversations > 0 ? (abandoned / totalConversations) * 100 : 0,
        escalationRate: totalConversations > 0 ? (escalated / totalConversations) * 100 : 0,
        totalErrors,
        avgMessagesPerConversation:
          totalConversations > 0 ? data!.reduce((sum, c) => sum + (c.message_count || 0), 0) / totalConversations : 0,
      },
    })
  } catch (error) {
    console.error("[ConversationAnalytics] Error fetching metrics:", error)
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 })
  }
}
