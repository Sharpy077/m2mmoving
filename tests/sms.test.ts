/**
 * SMS Service Tests
 * Tests that lib/sms/index.ts delegates to lib/twilio.sendSMS correctly.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

const { twilioSendSMSMock } = vi.hoisted(() => {
  const twilioSendSMSMock = vi.fn()
  return { twilioSendSMSMock }
})

vi.mock("@/lib/twilio", () => ({
  sendSMS: twilioSendSMSMock,
  formatAustralianNumber: (n: string) => (n.startsWith("04") ? "+61" + n.slice(1) : n),
}))

describe("sendSMS() in lib/sms/index.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns success when the underlying Twilio sendSMS returns true", async () => {
    twilioSendSMSMock.mockResolvedValue(true)
    const { sendSMS } = await import("@/lib/sms/index")
    const result = await sendSMS("+61400000001", "Hello from tests")
    expect(twilioSendSMSMock).toHaveBeenCalledWith("+61400000001", "Hello from tests")
    expect(result).toEqual({ success: true })
  })

  it("returns failure when the underlying Twilio sendSMS returns false", async () => {
    twilioSendSMSMock.mockResolvedValue(false)
    const { sendSMS } = await import("@/lib/sms/index")
    const result = await sendSMS("+61400000002", "Another message")
    expect(twilioSendSMSMock).toHaveBeenCalledWith("+61400000002", "Another message")
    expect(result).toEqual({ success: false, error: "SMS send failed" })
  })
})
