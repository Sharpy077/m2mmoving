import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockFrom, mockInsert, mockUpdate, mockEq, mockSelect } = vi.hoisted(() => {
  const mockEq = vi.fn().mockReturnThis()
  const mockSelect = vi.fn().mockReturnValue({
    eq: mockEq,
    single: vi.fn().mockResolvedValue({ data: { id: "ticket_1" }, error: null }),
    lte: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
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
  return { mockFrom, mockInsert, mockUpdate, mockEq, mockSelect }
})

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}))

describe("Support Tickets", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe("createTicket()", () => {
    it("creates a support ticket", async () => {
      const { createTicket } = await import("@/lib/service/tickets")
      const result = await createTicket({
        subject: "Furniture damaged during move",
        description: "The desk was scratched",
        category: "damage",
        priority: "high",
        leadId: "lead_123",
      })

      expect(result).toHaveProperty("id")
      expect(mockFrom).toHaveBeenCalledWith("support_tickets")
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Furniture damaged during move",
          category: "damage",
          priority: "high",
        })
      )
    })
  })

  describe("resolveTicket()", () => {
    it("marks a ticket as resolved", async () => {
      mockEq.mockResolvedValueOnce({ data: { id: "ticket_1" }, error: null })
      const { resolveTicket } = await import("@/lib/service/tickets")
      await resolveTicket("ticket_1", "Replacement desk ordered")

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "resolved",
          resolution: "Replacement desk ordered",
        })
      )
    })
  })
})

describe("Feedback Collection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe("submitFeedback()", () => {
    it("records NPS score and feedback text", async () => {
      const { submitFeedback } = await import("@/lib/service/feedback")
      const result = await submitFeedback({
        leadId: "lead_123",
        npsScore: 9,
        feedbackText: "Excellent service!",
      })

      expect(result).toHaveProperty("id")
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          nps_score: 9,
          feedback_text: "Excellent service!",
        })
      )
    })

    it("flags promoters for review request (NPS >= 8)", async () => {
      const { submitFeedback } = await import("@/lib/service/feedback")
      const result = await submitFeedback({
        leadId: "lead_123",
        npsScore: 9,
        feedbackText: "Great!",
      })

      expect(result.shouldRequestReview).toBe(true)
    })

    it("flags detractors for follow-up (NPS <= 6)", async () => {
      const { submitFeedback } = await import("@/lib/service/feedback")
      const result = await submitFeedback({
        leadId: "lead_123",
        npsScore: 4,
        feedbackText: "Not great.",
      })

      expect(result.shouldRequestReview).toBe(false)
      expect(result.needsFollowUp).toBe(true)
    })
  })
})

describe("Move Reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe("scheduleReminders()", () => {
    it("schedules multiple reminders for a booking", async () => {
      const { scheduleReminders } = await import("@/lib/service/reminders")
      const moveDate = new Date("2026-05-01")
      const result = await scheduleReminders("lead_123", moveDate)

      expect(result.scheduled).toBeGreaterThan(0)
    })
  })

  describe("processReminders()", () => {
    it("returns count of processed reminders", async () => {
      const { processReminders } = await import("@/lib/service/reminders")
      const result = await processReminders()

      expect(result).toHaveProperty("processed")
      expect(typeof result.processed).toBe("number")
    })
  })
})
