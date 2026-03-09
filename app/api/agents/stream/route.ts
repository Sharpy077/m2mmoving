/**
 * Streaming Chat API Route
 * Enables real-time streaming responses from AI agents via Vercel AI SDK
 */

import { streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { getCortex, initializeAISalesforce } from "@/lib/agents"

export const runtime = "edge"
export const maxDuration = 60

let initialized = false

function ensureInitialized() {
  if (!initialized) {
    initializeAISalesforce()
    initialized = true
  }
}

export async function POST(request: Request) {
  try {
    ensureInitialized()

    const { messages, agentId, context } = await request.json()

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      })
    }

    const openai = createOpenAI({ apiKey })

    // Determine agent identity for system prompt
    let agentName = "Maya"
    let agentCodename = "MAYA_SALES"

    try {
      const cortex = getCortex()
      const lastMessage = messages[messages.length - 1]?.content || ""
      if (agentId) {
        const agent = cortex.getAgent(agentId)
        if (agent) {
          const identity = agent.getAgentIdentity()
          agentName = identity.name
          agentCodename = String(identity.codename)
        }
      } else {
        const determinedAgent = await cortex.determineAgent(lastMessage)
        if (determinedAgent) {
          const identity = determinedAgent.getAgentIdentity()
          agentName = identity.name
          agentCodename = String(identity.codename)
        }
      }
    } catch {
      // Use defaults if agent system unavailable
    }

    const systemPrompt = `You are ${agentName}, an AI assistant for M&M Commercial Moving, a Melbourne-based commercial moving company.

Be helpful, professional, and concise. Focus on understanding the customer's commercial moving needs and providing accurate information about our services.

Context: ${context ? JSON.stringify(context) : "General inquiry"}`

    const result = streamText({
      model: openai("gpt-4o"),
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
      maxTokens: 1024,
    })

    return result.toDataStreamResponse({
      headers: {
        "X-Agent-Id": agentCodename,
        "X-Agent-Name": agentName,
      },
    })
  } catch (error) {
    console.error("Streaming error:", error)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
