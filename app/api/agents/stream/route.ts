/**
 * Streaming Chat API Route
 * Enables real-time streaming responses from AI agents
 */

import { StreamingTextResponse, LangChainStream } from "ai"
import { OpenAI } from "openai"
import { getCortex, AGENT_REGISTRY, type AgentName } from "@/lib/agents"

export const runtime = "edge"
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const { messages, agentId, context, conversationId } = await request.json()

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const cortex = getCortex()

    // Determine which agent should handle this
    const targetAgent = agentId
      ? cortex.getAgent(agentId)
      : await cortex.determineAgent(messages[messages.length - 1].content)

    if (!targetAgent) {
      return new Response(JSON.stringify({ error: "No suitable agent found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const agentIdentity = targetAgent.getIdentity()
    
    // Build system prompt based on agent
    const systemPrompt = buildAgentSystemPrompt(agentIdentity)

    // Create streaming response
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
      ],
      temperature: 0.7,
      max_tokens: 1500,
    })

    // Convert to streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || ""
            if (content) {
              // SSE format
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content, agent: agentIdentity.codename })}\n\n`))
            }
          }
          
          // Send completion message
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, agent: agentIdentity.codename })}\n\n`))
          controller.close()
        } catch (error) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Agent-Id": agentIdentity.codename,
        "X-Agent-Name": agentIdentity.name,
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

function buildAgentSystemPrompt(identity: any): string {
  const baseContext = `You are ${identity.name}, an AI agent for M&M Commercial Moving.

## Your Identity
- Codename: ${identity.codename}
- Role: ${identity.description}
- Capabilities: ${identity.capabilities?.join(", ") || "General assistance"}

## Company Context
- M&M Commercial Moving specializes in commercial relocations in Melbourne
- Services: Office moves, datacenter relocations, warehouse moves, IT equipment
- Values: Professionalism, reliability, care for client assets

## Communication Guidelines
- Be helpful, professional, and friendly
- Use Australian English
- Provide clear, actionable responses
- If unsure, ask clarifying questions
- Never make up information
- Acknowledge when you need to escalate to a human`

  return baseContext
}

