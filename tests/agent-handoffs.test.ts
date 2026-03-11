import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockCreateHandoff, mockCreateConversation, mockAddMessage, mockCreateEscalation } = vi.hoisted(() => {
  const mockCreateHandoff = vi.fn().mockResolvedValue("handoff_123")
  const mockCreateConversation = vi.fn().mockResolvedValue("conv_123")
  const mockAddMessage = vi.fn().mockResolvedValue("msg_123")
  const mockCreateEscalation = vi.fn().mockResolvedValue("esc_123")
  return { mockCreateHandoff, mockCreateConversation, mockAddMessage, mockCreateEscalation }
})

vi.mock("@/lib/agents/db", () => ({
  createConversation: mockCreateConversation,
  addMessage: mockAddMessage,
  createEscalation: mockCreateEscalation,
  createHandoff: mockCreateHandoff,
}))

import { CortexOrchestrator, resetCortex, getCortex } from "@/lib/agents/cortex/orchestrator"

describe("Inter-Agent Handoffs", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetCortex()
  })

  describe("handoff execution", () => {
    it("executes handoff from one agent to another", async () => {
      const cortex = getCortex()
      const result = await cortex.executeHandoff({
        fromAgent: "MAYA_SALES",
        toAgent: "NEXUS_OPS",
        reason: "Customer booked, needs scheduling",
        context: { leadId: "lead_123", moveDate: "2026-04-01" },
        conversationId: "conv_456",
      })

      expect(result.success).toBe(true)
      expect(result.handoffId).toBeTruthy()
      expect(result.targetAgent).toBe("NEXUS_OPS")
    })

    it("passes context snapshot during handoff", async () => {
      const cortex = getCortex()
      const context = {
        leadId: "lead_123",
        customerName: "Acme Corp",
        quoteTotal: 15000,
        services: ["office_relocation", "it_equipment"],
      }

      const result = await cortex.executeHandoff({
        fromAgent: "MAYA_SALES",
        toAgent: "SENTINEL_CS",
        reason: "Customer needs support",
        context,
        conversationId: "conv_789",
      })

      expect(result.success).toBe(true)
      expect(mockCreateHandoff).toHaveBeenCalledWith(
        expect.objectContaining({
          fromAgent: "MAYA_SALES",
          toAgent: "SENTINEL_CS",
          reason: "Customer needs support",
          context: expect.objectContaining({ leadId: "lead_123" }),
        })
      )
    })

    it("returns error when target agent does not exist", async () => {
      const cortex = getCortex()
      const result = await cortex.executeHandoff({
        fromAgent: "MAYA_SALES",
        toAgent: "NONEXISTENT" as any,
        reason: "Test",
        context: {},
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("not found")
    })

    it("records handoff in database", async () => {
      const cortex = getCortex()
      await cortex.executeHandoff({
        fromAgent: "HUNTER_LG",
        toAgent: "MAYA_SALES",
        reason: "Qualified lead ready for sales",
        context: { prospectScore: 85 },
        conversationId: "conv_101",
      })

      expect(mockCreateHandoff).toHaveBeenCalledTimes(1)
    })
  })

  describe("handoff routing patterns", () => {
    it("supports Maya → Nexus handoff for post-sale ops", async () => {
      const cortex = getCortex()
      const result = await cortex.executeHandoff({
        fromAgent: "MAYA_SALES",
        toAgent: "NEXUS_OPS",
        reason: "Booking confirmed, schedule move",
        context: { moveDate: "2026-05-01" },
      })
      expect(result.success).toBe(true)
    })

    it("supports Hunter → Maya handoff for qualified leads", async () => {
      const cortex = getCortex()
      const result = await cortex.executeHandoff({
        fromAgent: "HUNTER_LG",
        toAgent: "MAYA_SALES",
        reason: "Hot lead identified",
        context: { leadScore: 92 },
      })
      expect(result.success).toBe(true)
    })

    it("supports Maya → Sentinel handoff for support issues", async () => {
      const cortex = getCortex()
      const result = await cortex.executeHandoff({
        fromAgent: "MAYA_SALES",
        toAgent: "SENTINEL_CS",
        reason: "Customer has support question",
        context: { issue: "billing" },
      })
      expect(result.success).toBe(true)
    })
  })
})
