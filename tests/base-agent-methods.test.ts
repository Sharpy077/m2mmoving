import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockCreateHandoff, mockCreateEscalation } = vi.hoisted(() => {
  const mockCreateHandoff = vi.fn().mockResolvedValue("handoff_123")
  const mockCreateEscalation = vi.fn().mockResolvedValue("esc_123")
  return { mockCreateHandoff, mockCreateEscalation }
})

vi.mock("@/lib/agents/db", () => ({
  createHandoff: mockCreateHandoff,
  createEscalation: mockCreateEscalation,
}))

import { BaseAgent } from "@/lib/agents/base-agent"
import type { AgentIdentity, AgentInput, AgentOutput } from "@/lib/agents/types"

// Concrete test implementation of BaseAgent
class TestAgent extends BaseAgent {
  protected getIdentity(): AgentIdentity {
    return {
      codename: "MAYA_SALES",
      name: "TestAgent",
      description: "Test agent for unit testing",
      version: "1.0.0",
      capabilities: ["testing"],
    }
  }

  async process(input: AgentInput): Promise<AgentOutput> {
    return this.buildDefaultResponse("OK")
  }

  // Expose protected methods for testing
  async testRequestHandoff(
    targetAgent: string,
    reason: string,
    context: Record<string, unknown>,
    priority: string
  ) {
    return this.requestHandoff(targetAgent, reason, context, priority)
  }

  async testGenerateStructuredResponse<T>(
    prompt: string,
    schema: Record<string, unknown>
  ): Promise<T> {
    return this.generateStructuredResponse<T>(prompt, schema)
  }
}

describe("BaseAgent.requestHandoff()", () => {
  let agent: TestAgent

  beforeEach(() => {
    vi.clearAllMocks()
    agent = new TestAgent({ codename: "MAYA_SALES" })
  })

  it("calls createHandoff with correct parameters", async () => {
    const result = await agent.testRequestHandoff(
      "NEXUS_OPS",
      "Customer needs scheduling",
      { leadId: "lead_123" },
      "high"
    )

    expect(result).toBe("handoff_123")
    expect(mockCreateHandoff).toHaveBeenCalledWith({
      fromAgent: "MAYA_SALES",
      toAgent: "NEXUS_OPS",
      reason: "Customer needs scheduling",
      context: { leadId: "lead_123" },
      priority: "high",
    })
  })

  it("uses agent codename as fromAgent", async () => {
    await agent.testRequestHandoff("SENTINEL_CS", "Support needed", {}, "medium")

    expect(mockCreateHandoff).toHaveBeenCalledWith(
      expect.objectContaining({ fromAgent: "MAYA_SALES" })
    )
  })

  it("returns the handoff ID from createHandoff", async () => {
    mockCreateHandoff.mockResolvedValueOnce("handoff_custom_id")
    const result = await agent.testRequestHandoff("ECHO_REP", "Review", {}, "low")
    expect(result).toBe("handoff_custom_id")
  })

  it("does not throw when createHandoff fails, returns fallback ID", async () => {
    mockCreateHandoff.mockRejectedValueOnce(new Error("DB error"))
    const result = await agent.testRequestHandoff("NEXUS_OPS", "Test", {}, "medium")
    expect(result).toBeTruthy()
    expect(typeof result).toBe("string")
  })
})

describe("BaseAgent.generateStructuredResponse()", () => {
  let agent: TestAgent

  beforeEach(() => {
    vi.clearAllMocks()
    agent = new TestAgent({ codename: "MAYA_SALES" })
  })

  it("is a callable method on BaseAgent", () => {
    expect(typeof agent.testGenerateStructuredResponse).toBe("function")
  })

  it("returns a default structured response when AI is unavailable", async () => {
    const result = await agent.testGenerateStructuredResponse<{ content: string }>(
      "Generate a blog post",
      { type: "object", properties: { content: { type: "string" } } }
    )
    expect(result).toBeDefined()
    expect(typeof result).toBe("object")
  })
})
