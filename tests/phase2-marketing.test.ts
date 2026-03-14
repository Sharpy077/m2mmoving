import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Phase 2A: Campaign Engine Tests ──────────────────────────────────────────

const { mockFrom, mockRpc } = vi.hoisted(() => {
  const mockSingle = vi.fn().mockResolvedValue({ data: { id: "enr_1" }, error: null })
  const mockSelectReturn = vi.fn().mockReturnValue({ single: mockSingle })
  const mockInsert = vi.fn().mockReturnValue({ select: mockSelectReturn })
  const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })
  const mockLte = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) })
  const mockSelect = vi.fn().mockReturnValue({ lte: mockLte, eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) }) }) })
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect, insert: mockInsert, update: mockUpdate })
  const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null })
  return { mockFrom, mockRpc }
})

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: mockFrom, rpc: mockRpc })),
}))

vi.mock("@/lib/email", () => ({
  resend: { emails: { send: vi.fn().mockResolvedValue({ id: "email_1" }) } },
  EMAIL_FROM_ADDRESS: "test@test.com",
}))

vi.mock("@/lib/twilio", () => ({
  sendSMS: vi.fn().mockResolvedValue(true),
  formatAustralianNumber: vi.fn((n: string) => n),
}))

describe("Campaign Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it("enrolls a lead in a sequence", async () => {
    const { enrollInSequence } = await import("@/lib/campaigns/engine")
    const result = await enrollInSequence("lead_1", "seq_1")
    expect(result).toHaveProperty("id")
    expect(mockFrom).toHaveBeenCalledWith("sequence_enrollments")
  })

  it("sendCampaignEmail sends via Resend", async () => {
    const { sendCampaignEmail } = await import("@/lib/campaigns/engine")
    const result = await sendCampaignEmail({
      to: "test@test.com",
      subject: "Hello",
      html: "<p>Hi</p>",
      text: "Hi",
    })
    expect(result.success).toBe(true)
  })

  it("sendCampaignSMS sends via Twilio", async () => {
    const { sendCampaignSMS } = await import("@/lib/campaigns/engine")
    const result = await sendCampaignSMS({ to: "+61412345678", body: "Test" })
    expect(typeof result.success).toBe("boolean")
  })

  it("processScheduledCampaigns returns processed count", async () => {
    const { processScheduledCampaigns } = await import("@/lib/campaigns/engine")
    const result = await processScheduledCampaigns()
    expect(result).toHaveProperty("processed")
    expect(result).toHaveProperty("errors")
  })
})

// ─── Phase 2B: SMS Tests ─────────────────────────────────────────────────────

describe("sendSMS", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it("sends an SMS via Twilio", async () => {
    const { sendSMS } = await import("@/lib/sms")
    const result = await sendSMS("+61412345678", "Test message")
    expect(result.success).toBe(true)
  })

  it("returns error when Twilio sendSMS fails", async () => {
    vi.doMock("@/lib/twilio", () => ({ sendSMS: vi.fn().mockResolvedValue(false), formatAustralianNumber: vi.fn((n: string) => n) }))
    vi.resetModules()
    const { sendSMS } = await import("@/lib/sms")
    const result = await sendSMS("+61412345678", "Test message")
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

// ─── Phase 2C: UTM Tracking Tests ────────────────────────────────────────────

describe("UTM Tracking", () => {
  it("extracts UTM params from URL search params", async () => {
    const { extractUTMParams } = await import("@/lib/utm")
    const params = new URLSearchParams("utm_source=google&utm_medium=cpc&utm_campaign=spring2026")
    const result = extractUTMParams(params)
    expect(result).toEqual({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "spring2026",
      utm_content: null,
    })
  })

  it("returns nulls when no UTM params present", async () => {
    const { extractUTMParams } = await import("@/lib/utm")
    const params = new URLSearchParams("")
    const result = extractUTMParams(params)
    expect(result.utm_source).toBeNull()
    expect(result.utm_medium).toBeNull()
  })

  it("hasUTMParams returns true when params exist", async () => {
    const { hasUTMParams } = await import("@/lib/utm")
    expect(hasUTMParams({ utm_source: "google", utm_medium: null, utm_campaign: null, utm_content: null })).toBe(true)
    expect(hasUTMParams({ utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null })).toBe(false)
  })
})

// ─── Phase 2D: Lead Scoring Tests ────────────────────────────────────────────

describe("Lead Scoring", () => {
  it("scores a lead based on engagement signals", async () => {
    const { calculateLeadScore } = await import("@/lib/campaigns/scoring")
    const score = calculateLeadScore({
      hasEmail: true,
      hasPhone: true,
      hasCompanyName: true,
      moveType: "office",
      estimatedTotal: 15000,
      engagementEvents: 3,
    })
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it("gives higher score for larger deal values", async () => {
    const { calculateLeadScore } = await import("@/lib/campaigns/scoring")
    const small = calculateLeadScore({ hasEmail: true, hasPhone: false, hasCompanyName: false, moveType: "office", estimatedTotal: 2000, engagementEvents: 0 })
    const large = calculateLeadScore({ hasEmail: true, hasPhone: false, hasCompanyName: false, moveType: "office", estimatedTotal: 50000, engagementEvents: 0 })
    expect(large).toBeGreaterThan(small)
  })

  it("caps score at 100", async () => {
    const { calculateLeadScore } = await import("@/lib/campaigns/scoring")
    const score = calculateLeadScore({
      hasEmail: true,
      hasPhone: true,
      hasCompanyName: true,
      moveType: "datacenter",
      estimatedTotal: 100000,
      engagementEvents: 20,
    })
    expect(score).toBeLessThanOrEqual(100)
  })
})
