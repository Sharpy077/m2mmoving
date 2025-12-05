/**
 * AI Salesforce API - Individual Agent Endpoint
 * POST /api/agents/[agent] - Interact with a specific agent
 * GET /api/agents/[agent] - Get agent info
 */

import { NextRequest, NextResponse } from "next/server"
import { getAgent, initializeAISalesforce, type AgentCodename, type AgentInput } from "@/lib/agents"

// Initialize on first request
let initialized = false

function ensureInitialized() {
  if (!initialized) {
    initializeAISalesforce()
    initialized = true
  }
}

// Map URL-friendly names to agent codenames
const agentMap: Record<string, AgentCodename> = {
  maya: "MAYA_SALES",
  sentinel: "SENTINEL_CS",
  hunter: "HUNTER_LG",
  aurora: "AURORA_MKT",
  oracle: "ORACLE_ANL",
  // Also allow codenames directly
  MAYA_SALES: "MAYA_SALES",
  SENTINEL_CS: "SENTINEL_CS",
  HUNTER_LG: "HUNTER_LG",
  AURORA_MKT: "AURORA_MKT",
  ORACLE_ANL: "ORACLE_ANL",
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agent: string }> }
) {
  try {
    ensureInitialized()
    
    const { agent: agentParam } = await params
    const agentCodename = agentMap[agentParam] || agentMap[agentParam.toUpperCase()]
    
    if (!agentCodename) {
      return NextResponse.json(
        { error: `Unknown agent: ${agentParam}. Available: maya, sentinel, hunter, aurora, oracle` },
        { status: 404 }
      )
    }
    
    const agent = getAgent(agentCodename)
    
    if (!agent) {
      return NextResponse.json(
        { error: `Agent ${agentCodename} not initialized` },
        { status: 500 }
      )
    }
    
    const body = await request.json()
    const {
      type = "message",
      content,
      messages,
      event,
      conversationId,
      customerId,
      leadId,
      metadata,
    } = body
    
    // Build agent input
    const input: AgentInput = {
      type: type as AgentInput["type"],
      content,
      messages: messages?.map((m: any, i: number) => ({
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
      agent: agentCodename,
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agent: string }> }
) {
  try {
    ensureInitialized()
    
    const { agent: agentParam } = await params
    const agentCodename = agentMap[agentParam] || agentMap[agentParam.toUpperCase()]
    
    if (!agentCodename) {
      return NextResponse.json(
        { error: `Unknown agent: ${agentParam}` },
        { status: 404 }
      )
    }
    
    const agent = getAgent(agentCodename)
    
    if (!agent) {
      return NextResponse.json(
        { error: `Agent ${agentCodename} not initialized` },
        { status: 500 }
      )
    }
    
    const identity = agent.getAgentIdentity()
    const status = agent.getStatus()
    
    return NextResponse.json({
      codename: identity.codename,
      name: identity.name,
      description: identity.description,
      version: identity.version,
      capabilities: identity.capabilities,
      status,
    })
    
  } catch (error) {
    console.error("[API] Agent info error:", error)
    return NextResponse.json(
      { error: "Failed to get agent info" },
      { status: 500 }
    )
  }
}
