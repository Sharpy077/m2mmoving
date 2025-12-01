/**
 * AI Salesforce API - Chat Endpoint
 * POST /api/agents/chat - Chat with an AI agent
 * 
 * Designed for real-time chat interactions with agents
 */

import { NextRequest, NextResponse } from "next/server"
import { getCortex, getAgent, initializeAISalesforce, type AgentCodename, type AgentInput } from "@/lib/agents"
import { v4 as uuid } from "uuid"

// Initialize on first request
let initialized = false

function ensureInitialized() {
  if (!initialized) {
    initializeAISalesforce()
    initialized = true
  }
}

// In-memory conversation storage (use Redis/database in production)
const conversations = new Map<string, ConversationState>()

interface ConversationState {
  id: string
  agent: AgentCodename
  messages: Array<{
    id: string
    role: "user" | "assistant" | "system"
    content: string
    timestamp: Date
  }>
  customerId?: string
  leadId?: string
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export async function POST(request: NextRequest) {
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
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }
    
    // Get or create conversation
    let conversation: ConversationState
    
    if (conversationId && conversations.has(conversationId)) {
      conversation = conversations.get(conversationId)!
    } else {
      // Determine which agent to use
      const cortex = getCortex()
      const agentCodename = requestedAgent || await cortex.routeIncomingRequest({
        channel: "chat",
        content: message,
        customerId,
        metadata,
      })
      
      conversation = {
        id: conversationId || uuid(),
        agent: agentCodename,
        messages: [],
        customerId,
        leadId,
        metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      conversations.set(conversation.id, conversation)
    }
    
    // Add user message
    const userMessage = {
      id: uuid(),
      role: "user" as const,
      content: message,
      timestamp: new Date(),
    }
    conversation.messages.push(userMessage)
    
    // Get the agent
    const agent = getAgent(conversation.agent)
    
    if (!agent) {
      return NextResponse.json(
        { error: `Agent ${conversation.agent} not available` },
        { status: 500 }
      )
    }
    
    // Build agent input
    const input: AgentInput = {
      type: "message",
      conversationId: conversation.id,
      content: message,
      messages: conversation.messages,
      customerId: conversation.customerId,
      leadId: conversation.leadId,
      metadata: {
        ...conversation.metadata,
        ...metadata,
      },
    }
    
    // Process with agent
    const result = await agent.process(input)
    
    // Add assistant response to conversation
    if (result.response) {
      const assistantMessage = {
        id: uuid(),
        role: "assistant" as const,
        content: result.response,
        timestamp: new Date(),
        agentCodename: conversation.agent,
      }
      conversation.messages.push(assistantMessage)
    }
    
    conversation.updatedAt = new Date()
    
    // Update lead ID if provided in result
    if (result.data?.leadId) {
      conversation.leadId = result.data.leadId as string
    }
    
    return NextResponse.json({
      success: result.success,
      conversationId: conversation.id,
      agent: conversation.agent,
      message: result.response,
      actions: result.actions,
      data: result.data,
      escalation: result.escalation ? {
        reason: result.escalation.reason,
        priority: result.escalation.priority,
      } : undefined,
    })
    
  } catch (error) {
    console.error("[API] Chat error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
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
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      )
    }
    
    const conversation = conversations.get(conversationId)
    
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      conversationId: conversation.id,
      agent: conversation.agent,
      messages: conversation.messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    })
    
  } catch (error) {
    console.error("[API] Get conversation error:", error)
    return NextResponse.json(
      { error: "Failed to get conversation" },
      { status: 500 }
    )
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
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      )
    }
    
    const deleted = conversations.delete(conversationId)
    
    return NextResponse.json({
      success: deleted,
      conversationId,
    })
    
  } catch (error) {
    console.error("[API] Delete conversation error:", error)
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    )
  }
}

