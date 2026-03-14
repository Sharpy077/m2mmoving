import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockRpc } = vi.hoisted(() => {
  const mockRpc = vi.fn()
  return { mockRpc }
})

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
  })),
}))

describe("createHandoff()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it("inserts a handoff record and returns the handoff ID", async () => {
    mockRpc.mockResolvedValue({ data: "handoff_abc123", error: null })

    const { createHandoff } = await import("@/lib/agents/db")
    const result = await createHandoff({
      fromAgent: "MAYA_SALES",
      toAgent: "NEXUS_OPS",
      reason: "Customer booked, needs scheduling",
      context: { leadId: "lead_123" },
      conversationId: "conv_456",
    })

    expect(result).toBe("handoff_abc123")
    expect(mockRpc).toHaveBeenCalledWith("create_agent_handoff", {
      p_from_agent: "MAYA_SALES",
      p_to_agent: "NEXUS_OPS",
      p_reason: "Customer booked, needs scheduling",
      p_context: { leadId: "lead_123" },
      p_conversation_id: "conv_456",
      p_priority: "medium",
    })
  })

  it("uses custom priority when provided", async () => {
    mockRpc.mockResolvedValue({ data: "handoff_xyz", error: null })

    const { createHandoff } = await import("@/lib/agents/db")
    await createHandoff({
      fromAgent: "HUNTER_LG",
      toAgent: "MAYA_SALES",
      reason: "Hot lead",
      context: { score: 95 },
      priority: "high",
    })

    expect(mockRpc).toHaveBeenCalledWith("create_agent_handoff", expect.objectContaining({
      p_priority: "high",
    }))
  })

  it("defaults optional fields when not provided", async () => {
    mockRpc.mockResolvedValue({ data: "handoff_def", error: null })

    const { createHandoff } = await import("@/lib/agents/db")
    await createHandoff({
      fromAgent: "SENTINEL_CS",
      toAgent: "PHOENIX_RET",
      reason: "Retention opportunity",
      context: {},
    })

    expect(mockRpc).toHaveBeenCalledWith("create_agent_handoff", expect.objectContaining({
      p_conversation_id: null,
      p_priority: "medium",
    }))
  })

  it("throws when database returns an error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "DB connection failed" } })

    const { createHandoff } = await import("@/lib/agents/db")
    await expect(
      createHandoff({
        fromAgent: "MAYA_SALES",
        toAgent: "NEXUS_OPS",
        reason: "Test",
        context: {},
      })
    ).rejects.toThrow("Failed to create handoff")
  })
})
