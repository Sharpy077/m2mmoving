import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockFrom, mockRpc, mockSelect, mockInsert, mockUpdate, mockEq } = vi.hoisted(() => {
  const mockEq = vi.fn().mockReturnThis()
  const mockSingle = vi.fn().mockResolvedValue({ data: { id: "enrollment_1" }, error: null })
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq, single: mockSingle, lte: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) })
  const mockInsert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: "new_1" }, error: null }) }) })
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
  const mockFrom = vi.fn().mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  })
  const mockRpc = vi.fn().mockResolvedValue({ data: "result_1", error: null })
  return { mockFrom, mockRpc, mockSelect, mockInsert, mockUpdate, mockEq }
})

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}))

vi.mock("@/lib/email", () => ({
  resend: { emails: { send: vi.fn().mockResolvedValue({ data: { id: "email_1" }, error: null }) } },
  EMAIL_FROM_ADDRESS: "test@test.com",
}))

vi.mock("@/lib/twilio", () => ({
  twilioClient: { messages: { create: vi.fn().mockResolvedValue({ sid: "sms_1" }) } },
  formatAustralianNumber: vi.fn((n: string) => n),
}))

describe("Campaign Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe("enrollInSequence()", () => {
    it("creates an enrollment record for a lead", async () => {
      const { enrollInSequence } = await import("@/lib/campaigns/engine")
      const result = await enrollInSequence("lead_123", "seq_welcome")

      expect(mockFrom).toHaveBeenCalledWith("sequence_enrollments")
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          lead_id: "lead_123",
          sequence_id: "seq_welcome",
          current_step: 0,
          status: "active",
        })
      )
      expect(result).toHaveProperty("id")
    })
  })

  describe("sendCampaignEmail()", () => {
    it("sends an email via Resend", async () => {
      const { sendCampaignEmail } = await import("@/lib/campaigns/engine")
      const result = await sendCampaignEmail({
        to: "customer@example.com",
        subject: "Your quote is ready",
        html: "<p>Hello</p>",
        text: "Hello",
      })

      expect(result.success).toBe(true)
    })
  })

  describe("sendCampaignSMS()", () => {
    it("sends an SMS via Twilio", async () => {
      process.env.TWILIO_PHONE_NUMBER = "+61400000000"
      const { sendCampaignSMS } = await import("@/lib/campaigns/engine")
      const result = await sendCampaignSMS({
        to: "+61412345678",
        body: "Your move is tomorrow!",
      })

      expect(result.success).toBe(true)
      delete process.env.TWILIO_PHONE_NUMBER
    })
  })

  describe("processScheduledCampaigns()", () => {
    it("returns processed count", async () => {
      const { processScheduledCampaigns } = await import("@/lib/campaigns/engine")
      const result = await processScheduledCampaigns()

      expect(result).toHaveProperty("processed")
      expect(typeof result.processed).toBe("number")
    })
  })
})

describe("Lead Scoring", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe("calculateLeadScore()", () => {
    it("returns a score between 0 and 100", async () => {
      const { calculateLeadScore } = await import("@/lib/campaigns/scoring")
      const score = calculateLeadScore({
        hasEmail: true,
        hasPhone: true,
        hasCompanyName: true,
        moveType: "office",
        estimatedTotal: 15000,
        engagementEvents: 3,
      })

      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    it("scores higher for complete contact info", async () => {
      const { calculateLeadScore } = await import("@/lib/campaigns/scoring")
      const fullScore = calculateLeadScore({
        hasEmail: true,
        hasPhone: true,
        hasCompanyName: true,
        moveType: "office",
        estimatedTotal: 10000,
        engagementEvents: 0,
      })

      const partialScore = calculateLeadScore({
        hasEmail: true,
        hasPhone: false,
        hasCompanyName: false,
        moveType: "office",
        estimatedTotal: 10000,
        engagementEvents: 0,
      })

      expect(fullScore).toBeGreaterThan(partialScore)
    })

    it("scores higher for larger deals", async () => {
      const { calculateLeadScore } = await import("@/lib/campaigns/scoring")
      const bigDeal = calculateLeadScore({
        hasEmail: true,
        hasPhone: true,
        hasCompanyName: true,
        moveType: "datacenter",
        estimatedTotal: 50000,
        engagementEvents: 0,
      })

      const smallDeal = calculateLeadScore({
        hasEmail: true,
        hasPhone: true,
        hasCompanyName: true,
        moveType: "it-equipment",
        estimatedTotal: 2000,
        engagementEvents: 0,
      })

      expect(bigDeal).toBeGreaterThan(smallDeal)
    })
  })
})
