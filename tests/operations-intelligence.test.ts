import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockFrom, mockInsert, mockUpdate, mockEq, mockSelect, mockRpc } = vi.hoisted(() => {
  const mockEq = vi.fn().mockReturnThis()
  const mockGte = vi.fn().mockReturnThis()
  const mockLte = vi.fn().mockReturnThis()
  const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null })
  const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null })
  const mockSelect = vi.fn().mockReturnValue({
    eq: mockEq,
    gte: mockGte,
    lte: mockLte,
    order: mockOrder,
    limit: mockLimit,
    single: vi.fn().mockResolvedValue({ data: { id: "job_1" }, error: null }),
  })
  const mockInsert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: "new_1" }, error: null }),
    }),
  })
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
  const mockFrom = vi.fn().mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  })
  const mockRpc = vi.fn().mockResolvedValue({ data: { total: 100 }, error: null })
  return { mockFrom, mockInsert, mockUpdate, mockEq, mockSelect, mockRpc }
})

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: mockFrom, rpc: mockRpc })),
}))

describe("Crew Scheduling (Nexus)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe("scheduleJob()", () => {
    it("creates a job record linked to a lead", async () => {
      const { scheduleJob } = await import("@/lib/operations/scheduling")
      const result = await scheduleJob({
        leadId: "lead_123",
        scheduledDate: "2026-05-01",
        startTime: "08:00",
        estimatedHours: 6,
        originAddress: "123 Collins St, Melbourne",
        destinationAddress: "456 Bourke St, Melbourne",
      })

      expect(result).toHaveProperty("id")
      expect(mockFrom).toHaveBeenCalledWith("jobs")
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          lead_id: "lead_123",
          scheduled_date: "2026-05-01",
          start_time: "08:00",
        })
      )
    })
  })

  describe("assignCrew()", () => {
    it("assigns a crew to a job", async () => {
      mockEq.mockResolvedValueOnce({ data: { id: "job_1" }, error: null })
      const { assignCrew } = await import("@/lib/operations/scheduling")
      await assignCrew("job_1", "crew_alpha")

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ crew_id: "crew_alpha" })
      )
    })
  })
})

describe("Business Intelligence (Oracle)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe("getDashboardMetrics()", () => {
    it("returns aggregated metrics", async () => {
      const { getDashboardMetrics } = await import("@/lib/operations/analytics")
      const metrics = await getDashboardMetrics()

      expect(metrics).toHaveProperty("totalLeads")
      expect(metrics).toHaveProperty("conversionRate")
      expect(metrics).toHaveProperty("avgDealSize")
      expect(metrics).toHaveProperty("revenueThisMonth")
    })
  })

  describe("generateInsight()", () => {
    it("creates an insight record", async () => {
      const { generateInsight } = await import("@/lib/operations/analytics")
      const result = await generateInsight({
        type: "trend",
        title: "Conversion rate improving",
        summary: "Lead-to-quote conversion up 12% MoM",
        data: { current: 0.42, previous: 0.30 },
      })

      expect(result).toHaveProperty("id")
      expect(mockFrom).toHaveBeenCalledWith("agent_insights")
    })
  })
})

describe("QA Auditing (Guardian)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe("auditConversation()", () => {
    it("creates a QA audit with scores", async () => {
      const { auditConversation } = await import("@/lib/operations/qa")
      const result = await auditConversation({
        conversationId: "conv_123",
        agentCodename: "MAYA_SALES",
        scores: {
          accuracy: 92,
          tone: 88,
          compliance: 95,
          completeness: 85,
          empathy: 90,
        },
      })

      expect(result).toHaveProperty("id")
      expect(result).toHaveProperty("overallScore")
      expect(result.overallScore).toBeGreaterThan(0)
      expect(result.overallScore).toBeLessThanOrEqual(100)
    })
  })

  describe("getQASummary()", () => {
    it("returns summary of QA audits", async () => {
      const { getQASummary } = await import("@/lib/operations/qa")
      const summary = await getQASummary()

      expect(summary).toHaveProperty("totalAudits")
      expect(summary).toHaveProperty("averageScore")
    })
  })
})
