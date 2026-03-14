/**
 * Campaign Engine Tests
 * Tests that sendCampaignSMS delegates to lib/twilio.sendSMS correctly.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

const { twilioSendSMSMock } = vi.hoisted(() => {
  const twilioSendSMSMock = vi.fn()
  return { twilioSendSMSMock }
})

vi.mock("@/lib/twilio", () => ({
  sendSMS: twilioSendSMSMock,
  formatAustralianNumber: (n: string) => (n.startsWith("04") ? "+61" + n.slice(1) : n),
  twilioClient: null,
}))

vi.mock("@/lib/email", () => ({
  resend: null,
  EMAIL_FROM_ADDRESS: "noreply@example.com",
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: [], error: null }),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}))

describe("sendCampaignSMS()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns success when the underlying Twilio sendSMS returns true", async () => {
    twilioSendSMSMock.mockResolvedValue(true)
    const { sendCampaignSMS } = await import("@/lib/campaigns/engine")
    const result = await sendCampaignSMS({ to: "+61400000001", body: "Your move is confirmed." })
    expect(twilioSendSMSMock).toHaveBeenCalledWith("+61400000001", "Your move is confirmed.")
    expect(result).toEqual({ success: true })
  })

  it("returns failure when the underlying Twilio sendSMS returns false", async () => {
    twilioSendSMSMock.mockResolvedValue(false)
    const { sendCampaignSMS } = await import("@/lib/campaigns/engine")
    const result = await sendCampaignSMS({ to: "+61400000002", body: "Follow up message" })
    expect(twilioSendSMSMock).toHaveBeenCalledWith("+61400000002", "Follow up message")
    expect(result).toEqual({ success: false, error: "SMS send failed" })
  })
})
