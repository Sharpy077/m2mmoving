import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock Supabase ────────────────────────────────────────────────────────────

const { mockFrom, mockRpc } = vi.hoisted(() => {
  const mockSingle = vi.fn().mockResolvedValue({ data: { id: "item_1" }, error: null })
  const mockSelectReturn = vi.fn().mockReturnValue({ single: mockSingle })
  const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null })
  const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit, ascending: true })
  const mockEq = vi.fn().mockReturnValue({ order: mockOrder, data: null, error: null })
  const mockInsert = vi.fn().mockReturnValue({ select: mockSelectReturn })
  const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
  const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert, update: mockUpdate, select: mockSelect })
  const mockRpc = vi.fn().mockResolvedValue({ data: "qa_1", error: null })
  return { mockFrom, mockRpc }
})

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: mockFrom, rpc: mockRpc })),
}))

vi.mock("@/lib/agents/db", () => ({
  recordQAAudit: vi.fn().mockResolvedValue("qa_1"),
}))

// ─── Phase 5A: Scheduling Tests ──────────────────────────────────────────────

describe("Crew Scheduling", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules() })

  it("schedules a job", async () => {
    const { scheduleJob } = await import("@/lib/operations/scheduling")
    const result = await scheduleJob({
      leadId: "lead_1",
      scheduledDate: "2026-05-01",
      originAddress: "123 Collins St, Melbourne",
      destinationAddress: "456 Bourke St, Melbourne",
    })
    expect(result).toHaveProperty("id")
    expect(mockFrom).toHaveBeenCalledWith("jobs")
  })

  it("assigns a crew to a job", async () => {
    const { assignCrew } = await import("@/lib/operations/scheduling")
    await assignCrew("job_1", "crew_1")
    expect(mockFrom).toHaveBeenCalledWith("jobs")
  })

  it("updates job status", async () => {
    const { updateJobStatus } = await import("@/lib/operations/scheduling")
    await updateJobStatus("job_1", "completed")
    expect(mockFrom).toHaveBeenCalledWith("jobs")
  })
})

// ─── Phase 5B: Analytics Tests ───────────────────────────────────────────────

describe("Business Intelligence", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules() })

  it("generates dashboard metrics", async () => {
    const { getDashboardMetrics } = await import("@/lib/operations/analytics")
    const metrics = await getDashboardMetrics()
    expect(metrics).toHaveProperty("totalLeads")
    expect(metrics).toHaveProperty("conversionRate")
    expect(metrics).toHaveProperty("avgDealSize")
    expect(metrics).toHaveProperty("revenueThisMonth")
    expect(metrics).toHaveProperty("wonDeals")
    expect(metrics).toHaveProperty("lostDeals")
  })

  it("creates an insight", async () => {
    const { generateInsight } = await import("@/lib/operations/analytics")
    const result = await generateInsight({
      type: "trend",
      title: "Revenue up 15%",
      summary: "Revenue has increased 15% compared to last month",
      severity: "positive",
    })
    expect(result).toHaveProperty("id")
    expect(mockFrom).toHaveBeenCalledWith("agent_insights")
  })

  it("returns metrics with correct shape for empty data", async () => {
    const { getDashboardMetrics } = await import("@/lib/operations/analytics")
    const metrics = await getDashboardMetrics()
    expect(typeof metrics.totalLeads).toBe("number")
    expect(typeof metrics.conversionRate).toBe("number")
  })
})

// ─── Phase 5C: QA Auditing Tests ─────────────────────────────────────────────

describe("QA Auditing", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules() })

  it("audits a conversation with quality scores", async () => {
    const { auditConversation } = await import("@/lib/operations/qa")
    const result = await auditConversation({
      conversationId: "conv_1",
      agentCodename: "MAYA_SALES",
      scores: {
        accuracy: 90,
        tone: 85,
        compliance: 95,
        completeness: 88,
        empathy: 80,
      },
    })
    expect(result).toHaveProperty("id")
    expect(result).toHaveProperty("overallScore")
    expect(result.overallScore).toBeGreaterThan(0)
  })

  it("calculates weighted overall score correctly", async () => {
    const { auditConversation } = await import("@/lib/operations/qa")
    const result = await auditConversation({
      conversationId: "conv_2",
      agentCodename: "SENTINEL_CS",
      scores: {
        accuracy: 100,
        tone: 100,
        compliance: 100,
        completeness: 100,
        empathy: 100,
      },
    })
    expect(result.overallScore).toBe(100)
  })

  it("provides QA summary", async () => {
    const { getQASummary } = await import("@/lib/operations/qa")
    const summary = await getQASummary()
    expect(summary).toHaveProperty("totalAudits")
    expect(summary).toHaveProperty("averageScore")
    expect(summary).toHaveProperty("topIssues")
  })
})
