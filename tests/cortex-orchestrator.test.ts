import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock DB module before imports
vi.mock("@/lib/agents/db", () => ({
  createConversation: vi.fn().mockResolvedValue("conv_123"),
  addMessage: vi.fn().mockResolvedValue("msg_123"),
  createEscalation: vi.fn().mockResolvedValue("esc_123"),
  createHandoff: vi.fn().mockResolvedValue("handoff_123"),
}))

import { CortexOrchestrator, resetCortex, getCortex } from "@/lib/agents/cortex/orchestrator"

describe("CortexOrchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetCortex()
  })

  describe("initialization", () => {
    it("creates singleton instance via getCortex()", () => {
      const cortex1 = getCortex()
      const cortex2 = getCortex()
      expect(cortex1).toBe(cortex2)
    })

    it("resets singleton when resetCortex is called", () => {
      const cortex1 = getCortex()
      resetCortex()
      const cortex2 = getCortex()
      expect(cortex1).not.toBe(cortex2)
    })

    it("initializes with all 12 agents", () => {
      const cortex = getCortex()
      const identities = cortex.getAgentIdentities()
      expect(identities.length).toBe(12)
    })

    it("uses real agent implementations, not stubs", () => {
      const cortex = getCortex()
      const maya = cortex.getAgent("MAYA_SALES")
      expect(maya).toBeDefined()
      expect(maya!.getAgentIdentity().name).toBe("Maya")
      expect(maya!.getAgentIdentity().capabilities.length).toBeGreaterThan(1)

      const sentinel = cortex.getAgent("SENTINEL_CS")
      expect(sentinel).toBeDefined()
      expect(sentinel!.getAgentIdentity().name).toBe("Sentinel")
    })
  })

  describe("intelligent routing", () => {
    it("routes quote/price requests to Maya (sales)", async () => {
      const cortex = getCortex()
      const agent = await cortex.determineAgent("I need a quote for moving our office")
      expect(agent).toBeDefined()
      expect(agent!.getAgentIdentity().codename).toBe("MAYA_SALES")
    })

    it("routes support/complaint requests to Sentinel", async () => {
      const cortex = getCortex()
      const agent = await cortex.determineAgent("I have a complaint about the damage to our furniture")
      expect(agent).toBeDefined()
      expect(agent!.getAgentIdentity().codename).toBe("SENTINEL_CS")
    })

    it("routes marketing/campaign requests to Aurora", async () => {
      const cortex = getCortex()
      const agent = await cortex.determineAgent("Create a social media campaign for us")
      expect(agent).toBeDefined()
      expect(agent!.getAgentIdentity().codename).toBe("AURORA_MKT")
    })

    it("routes pricing/discount requests to Prism", async () => {
      const cortex = getCortex()
      const agent = await cortex.determineAgent("We need to optimize price and adjust our pricing strategy")
      expect(agent).toBeDefined()
      expect(agent!.getAgentIdentity().codename).toBe("PRISM_PRICE")
    })

    it("routes analytics/report requests to Oracle", async () => {
      const cortex = getCortex()
      const agent = await cortex.determineAgent("Show me our business analytics and performance report")
      expect(agent).toBeDefined()
      expect(agent!.getAgentIdentity().codename).toBe("ORACLE_ANL")
    })

    it("routes lead generation requests to Hunter", async () => {
      const cortex = getCortex()
      const agent = await cortex.determineAgent("Find new prospects in commercial real estate")
      expect(agent).toBeDefined()
      expect(agent!.getAgentIdentity().codename).toBe("HUNTER_LG")
    })

    it("routes scheduling/operations requests to Nexus", async () => {
      const cortex = getCortex()
      const agent = await cortex.determineAgent("Schedule a crew for the job next Tuesday")
      expect(agent).toBeDefined()
      expect(agent!.getAgentIdentity().codename).toBe("NEXUS_OPS")
    })

    it("defaults to Maya for ambiguous requests", async () => {
      const cortex = getCortex()
      const agent = await cortex.determineAgent("Hello, I want to learn more about your services")
      expect(agent).toBeDefined()
      expect(agent!.getAgentIdentity().codename).toBe("MAYA_SALES")
    })

    it("returns routing confidence and reason", async () => {
      const cortex = getCortex()
      const result = await cortex.routeWithConfidence("I need a quote for 200sqm office move")
      expect(result.agent).toBeDefined()
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
      expect(result.reason).toBeTruthy()
    })
  })

  describe("routeIncomingRequest", () => {
    it("returns agent codename for incoming request", async () => {
      const cortex = getCortex()
      const codename = await cortex.routeIncomingRequest({
        channel: "web",
        content: "I want a quote for moving",
      })
      expect(codename).toBe("MAYA_SALES")
    })
  })

  describe("health status", () => {
    it("returns healthy status when initialized", () => {
      const cortex = getCortex()
      const health = cortex.getHealthStatus()
      expect(health.status).toBe("healthy")
      expect(Object.keys(health.agents).length).toBe(12)
      expect(health.timestamp).toBeTruthy()
    })

    it("reports active status", () => {
      const cortex = getCortex()
      expect(cortex.getStatus()).toBe("active")
    })
  })
})
