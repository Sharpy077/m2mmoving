import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockExecuteHandoff, mockGetAgentIdentities } = vi.hoisted(() => {
  const mockExecuteHandoff = vi.fn()
  const mockGetAgentIdentities = vi.fn().mockReturnValue([])
  return { mockExecuteHandoff, mockGetAgentIdentities }
})

vi.mock("@/lib/agents/cortex/orchestrator", () => ({
  getCortex: vi.fn(() => ({
    executeHandoff: mockExecuteHandoff,
    getAgentIdentities: mockGetAgentIdentities,
  })),
  resetCortex: vi.fn(),
}))

vi.mock("@/lib/agents/db", () => ({
  createConversation: vi.fn(),
  addMessage: vi.fn(),
  createEscalation: vi.fn(),
  createHandoff: vi.fn(),
}))

describe("POST /api/agents/handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it("returns 200 with handoff result on valid request", async () => {
    mockExecuteHandoff.mockResolvedValue({
      success: true,
      handoffId: "handoff_abc",
      targetAgent: "NEXUS_OPS",
    })

    const { POST } = await import("@/app/api/agents/handoff/route")
    const req = new NextRequest("http://localhost/api/agents/handoff", {
      method: "POST",
      body: JSON.stringify({
        fromAgent: "MAYA_SALES",
        toAgent: "NEXUS_OPS",
        reason: "Customer booked, needs scheduling",
        context: { leadId: "lead_123" },
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.handoffId).toBe("handoff_abc")
    expect(body.targetAgent).toBe("NEXUS_OPS")
  })

  it("returns 400 when required fields are missing", async () => {
    const { POST } = await import("@/app/api/agents/handoff/route")
    const req = new NextRequest("http://localhost/api/agents/handoff", {
      method: "POST",
      body: JSON.stringify({ fromAgent: "MAYA_SALES" }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 500 when handoff execution fails", async () => {
    mockExecuteHandoff.mockResolvedValue({
      success: false,
      error: "Target agent not found",
    })

    const { POST } = await import("@/app/api/agents/handoff/route")
    const req = new NextRequest("http://localhost/api/agents/handoff", {
      method: "POST",
      body: JSON.stringify({
        fromAgent: "MAYA_SALES",
        toAgent: "NONEXISTENT",
        reason: "Test",
        context: {},
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain("not found")
  })

  it("passes conversationId when provided", async () => {
    mockExecuteHandoff.mockResolvedValue({
      success: true,
      handoffId: "handoff_xyz",
      targetAgent: "SENTINEL_CS",
    })

    const { POST } = await import("@/app/api/agents/handoff/route")
    const req = new NextRequest("http://localhost/api/agents/handoff", {
      method: "POST",
      body: JSON.stringify({
        fromAgent: "HUNTER_LG",
        toAgent: "MAYA_SALES",
        reason: "Qualified lead",
        context: { score: 90 },
        conversationId: "conv_789",
      }),
    })

    await POST(req)

    expect(mockExecuteHandoff).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: "conv_789" })
    )
  })
})
