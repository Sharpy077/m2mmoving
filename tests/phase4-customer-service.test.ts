import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock Supabase ────────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => {
  const mockSingle = vi.fn().mockResolvedValue({ data: { id: "item_1" }, error: null })
  const mockSelectReturn = vi.fn().mockReturnValue({ single: mockSingle })
  const mockInsert = vi.fn().mockReturnValue({ select: mockSelectReturn })
  const mockEq = vi.fn().mockResolvedValue({ data: null, error: null })
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
  const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null })
  const mockSelectEq = vi.fn().mockReturnValue({ order: mockOrder })
  const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq, gte: vi.fn().mockResolvedValue({ data: [{ nps_score: 8 }], error: null }), lte: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) })
  const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert, update: mockUpdate, select: mockSelect })
  return { mockFrom }
})

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}))

// ─── Phase 4A: Support Tickets ───────────────────────────────────────────────

describe("Support Tickets", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules() })

  it("creates a support ticket", async () => {
    const { createTicket } = await import("@/lib/service/tickets")
    const result = await createTicket({
      subject: "Billing issue",
      description: "Overcharged on invoice",
      category: "billing",
      priority: "medium",
    })
    expect(result).toHaveProperty("id")
    expect(mockFrom).toHaveBeenCalledWith("support_tickets")
  })

  it("resolves a ticket", async () => {
    const { resolveTicket } = await import("@/lib/service/tickets")
    await resolveTicket("ticket_1", "Issue fixed")
    expect(mockFrom).toHaveBeenCalledWith("support_tickets")
  })
})

// ─── Phase 4B: Feedback Collection ───────────────────────────────────────────

describe("Feedback Collection", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules() })

  it("submits NPS feedback and determines review eligibility", async () => {
    const { submitFeedback } = await import("@/lib/service/feedback")
    const result = await submitFeedback({
      leadId: "lead_1",
      npsScore: 9,
      feedbackText: "Great service!",
    })
    expect(result).toHaveProperty("id")
    expect(result.shouldRequestReview).toBe(true)
    expect(result.needsFollowUp).toBe(false)
  })

  it("flags detractors for follow-up", async () => {
    const { submitFeedback } = await import("@/lib/service/feedback")
    const result = await submitFeedback({
      leadId: "lead_2",
      npsScore: 4,
      feedbackText: "Not happy",
    })
    expect(result.needsFollowUp).toBe(true)
    expect(result.shouldRequestReview).toBe(false)
  })

  it("classifies NPS score categories", async () => {
    const { classifyNPS } = await import("@/lib/service/feedback")
    expect(classifyNPS(10)).toBe("promoter")
    expect(classifyNPS(8)).toBe("passive")
    expect(classifyNPS(5)).toBe("detractor")
  })
})

// ─── Phase 4C: Move Reminders ────────────────────────────────────────────────

describe("Move Reminders", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules() })

  it("schedules move reminders for a lead", async () => {
    const { scheduleReminders } = await import("@/lib/service/reminders")
    const result = await scheduleReminders("lead_1", new Date("2028-05-01"))
    expect(result.scheduled).toBeGreaterThan(0)
    expect(mockFrom).toHaveBeenCalledWith("move_reminders")
  })

  it("processReminders returns processed count", async () => {
    const { processReminders } = await import("@/lib/service/reminders")
    const result = await processReminders()
    expect(result).toHaveProperty("processed")
    expect(result).toHaveProperty("errors")
  })
})

// ─── Phase 4: Customer Chat Widget ──────────────────────────────────────────

describe("CustomerChatWidget", () => {
  it("exports CustomerChatWidget component", async () => {
    const mod = await import("@/components/customer-chat-widget")
    expect(mod.CustomerChatWidget).toBeDefined()
    expect(typeof mod.CustomerChatWidget).toBe("function")
  })
})
