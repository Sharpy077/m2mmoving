/**
 * AI Salesforce API - Chat Endpoint
 * POST /api/agents/chat - Chat with an AI agent
 *
 * Designed for real-time chat interactions with agents
 */

import { NextRequest, NextResponse } from "next/server"
import { getCortex, getAgent, initializeAISalesforce, type AgentCodename, type AgentInput } from "@/lib/agents"
import { createConversation, addMessage, getConversation } from "@/lib/agents/db"
import { v4 as uuid } from "uuid"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

// Initialize on first request
let initialized = false

function ensureInitialized() {
  if (!initialized) {
    initializeAISalesforce()
    initialized = true
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rateCheck = checkRateLimit(ip, 30, 60_000)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rateCheck.retryAfterMs ?? 60_000) / 1000)) },
      },
    )
  }

  try {
    ensureInitialized()

    const body = await request.json()
    const {
      message,
      conversationId,
      agent: requestedAgent,
      customerId,
      leadId,
      metadata = {},
    } = body as {
      message: string
      conversationId?: string
      agent?: AgentCodename
      customerId?: string
      leadId?: string
      metadata?: Record<string, unknown>
    }

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    if (message.length > 4000) {
      return NextResponse.json({ error: "Message too long (max 4000 characters)" }, { status: 400 })
    }

    // Determine the agent codename
    let agentCodename: AgentCodename
    let activeConversationId: string

    if (conversationId) {
      // Try to load existing conversation from DB
      try {
        const existing = await getConversation(conversationId)
        agentCodename = existing.agent_codename as AgentCodename
        activeConversationId = conversationId
      } catch {
        // Conversation not found in DB — route a new one with same ID
        const cortex = getCortex()
        agentCodename = requestedAgent || (await cortex.routeIncomingRequest({
          channel: "chat",
          content: message,
          customerId,
          metadata,
        }))
        activeConversationId = conversationId
      }
    } else {
      // Create new conversation
      const cortex = getCortex()
      agentCodename = requestedAgent || (await cortex.routeIncomingRequest({
        channel: "chat",
        content: message,
        customerId,
        metadata,
      }))

      // Persist new conversation to DB
      try {
        activeConversationId = await createConversation({
          agentCodename,
          channel: "chat",
          leadId,
          customerId,
          metadata,
        })
      } catch (dbError) {
        console.warn("[agents/chat] DB unavailable, using ephemeral conversation id:", dbError)
        activeConversationId = uuid()
      }
    }

    // Persist user message and fetch history for context
    let priorMessages: Array<{ id: string; role: "user" | "assistant" | "system"; content: string; timestamp: Date }> = []
    try {
      await addMessage({ conversationId: activeConversationId, role: "user", content: message })
      const conv = await getConversation(activeConversationId)
      priorMessages = (conv.messages || []).map((m: { id: string; role: string; content: string; created_at: string }) => ({
        id: m.id,
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
        timestamp: new Date(m.created_at),
      }))
    } catch {
      // DB unavailable — use only the current message for context
      priorMessages = [{ id: uuid(), role: "user" as const, content: message, timestamp: new Date() }]
    }

    // Get the agent
    const agent = getAgent(agentCodename)
    if (!agent) {
      return NextResponse.json({ error: `Agent ${agentCodename} not available` }, { status: 500 })
    }

    // Build agent input
    const input: AgentInput = {
      type: "message",
      conversationId: activeConversationId,
      content: message,
      messages: priorMessages,
      customerId,
      leadId,
      metadata,
    }

    // Process with agent
    const result = await agent.process(input)

    // Persist assistant response (non-fatal)
    if (result.response) {
      try {
        await addMessage({
          conversationId: activeConversationId,
          role: "assistant",
          content: result.response,
          agentCodename,
        })
      } catch {
        // Non-fatal — response still returned to user
      }
    }

    return NextResponse.json({
      success: result.success,
      conversationId: activeConversationId,
      agent: agentCodename,
      message: result.response,
      actions: result.actions,
      data: result.data,
      escalation: result.escalation
        ? { reason: result.escalation.reason, priority: result.escalation.priority }
        : undefined,
    })
  } catch (error) {
    console.error("[API] Chat error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

/**
 * GET /api/agents/chat?conversationId=xxx - Get conversation history
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get("conversationId")

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 })
    }

    const conversation = await getConversation(conversationId)

    return NextResponse.json({
      conversationId: conversation.id,
      agent: conversation.agent_codename,
      messages: (conversation.messages || []).map((m: { id: string; role: string; content: string; created_at: string }) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.created_at,
      })),
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at,
    })
  } catch (error) {
    console.error("[API] Get conversation error:", error)
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }
}

/**
 * DELETE /api/agents/chat?conversationId=xxx - End conversation
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get("conversationId")

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 })
    }

    try {
      const { endConversation } = await import("@/lib/agents/db")
      await endConversation(conversationId, "ended")
    } catch {
      // Non-fatal — conversation may not exist in DB
    }

    return NextResponse.json({ success: true, conversationId })
  } catch (error) {
    console.error("[API] Delete conversation error:", error)
    return NextResponse.json({ error: "Failed to end conversation" }, { status: 500 })
  }
}
