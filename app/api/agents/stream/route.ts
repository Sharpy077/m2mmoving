/**
 * Streaming Chat API Route
 * Enables real-time streaming responses from AI agents
 */

import { getCortex } from "@/lib/agents"

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

    const agentIdentity = targetAgent.getAgentIdentity()
    
    // Process the message through the agent
    const result = await targetAgent.process({
      type: "message",
      content: messages[messages.length - 1].content,
      messages: messages.map((m: { role: string; content: string }, i: number) => ({
        id: `msg-${i}`,
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
        timestamp: new Date(),
      })),
      conversationId,
    })

    // Simulate streaming by sending the response in chunks
    const responseText = result.response || "I'm here to help with your commercial moving needs. How can I assist you today?"
    
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        
        try {
          // Simulate streaming by sending words with small delays
          const words = responseText.split(" ")
          for (let i = 0; i < words.length; i++) {
            const word = words[i] + (i < words.length - 1 ? " " : "")
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: word, agent: agentIdentity.codename })}\n\n`)
            )
            // Small delay to simulate streaming (edge runtime compatible)
            await new Promise(resolve => setTimeout(resolve, 20))
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
