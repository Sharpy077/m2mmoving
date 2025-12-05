/**
 * AI Salesforce API - Main Agent Endpoint
 * POST /api/agents - Interact with the AI salesforce
 */

import { NextRequest, NextResponse } from "next/server"
import { getCortex, getAgent, initializeAISalesforce, type AgentCodename, type AgentInput } from "@/lib/agents"

// Initialize on first request
let initialized = false

function ensureInitialized() {
  if (!initialized) {
    initializeAISalesforce()
    initialized = true
  }
}

export async function POST(request: NextRequest) {
  try {
    ensureInitialized()
    
    const body = await request.json()
    const {
      agent: agentCodename,
      type = "message",
      content,
      messages,
      event,
      conversationId,
      customerId,
      leadId,
      metadata,
    } = body as {
      agent?: AgentCodename
      type?: "message" | "event" | "scheduled"
      content?: string
      messages?: Array<{ role: string; content: string }>
      event?: { name: string; data: Record<string, unknown> }
      conversationId?: string
      customerId?: string
      leadId?: string
      metadata?: Record<string, unknown>
    }
    
    // If no specific agent, use CORTEX to route
    let targetAgent = agentCodename
    
    if (!targetAgent && content) {
      const cortex = getCortex()
      targetAgent = await cortex.routeIncomingRequest({
        channel: "chat",
        content,
        customerId,
        metadata,
      })
    }
    
    if (!targetAgent) {
      targetAgent = "MAYA_SALES" // Default to Maya
    }
    
    // Get the agent
    const agent = getAgent(targetAgent)
    
    if (!agent) {
      return NextResponse.json(
        { error: `Agent ${targetAgent} not found` },
        { status: 404 }
      )
    }
    
    // Build agent input
    const input: AgentInput = {
      type: type as AgentInput["type"],
      content,
      messages: messages?.map((m, i) => ({
        id: `msg-${i}`,
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
        timestamp: new Date(),
      })),
      event,
      conversationId,
      customerId,
      leadId,
      metadata,
    }
    
    // Process with agent
    const result = await agent.process(input)
    
    return NextResponse.json({
      success: result.success,
      agent: targetAgent,
      response: result.response,
      actions: result.actions,
      data: result.data,
      error: result.error,
    })
    
  } catch (error) {
    console.error("[API] Agent error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/agents - Get agent status
 */
export async function GET(request: NextRequest) {
  try {
    ensureInitialized()
    
    const cortex = getCortex()
    const health = cortex.getHealthStatus()
    
    return NextResponse.json({
      status: health.status,
      agents: health.agents,
      queues: health.queues,
      memory: health.memory,
      timestamp: health.timestamp,
    })
    
  } catch (error) {
    console.error("[API] Status error:", error)
    return NextResponse.json(
      { error: "Failed to get agent status" },
      { status: 500 }
    )
  }
}
