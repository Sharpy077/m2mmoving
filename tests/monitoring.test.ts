import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const sendMock = vi.fn()
const resendConstructorMock = vi.fn().mockImplementation(() => ({
  emails: {
    send: sendMock,
  },
}))

vi.mock("resend", () => ({
  Resend: resendConstructorMock,
}))

import {
  __resetMonitoringTestingState,
  buildMonitoringEmail,
  getMonitoringRecipients,
  sendMonitoringAlert,
} from "@/lib/monitoring"

describe("monitoring utilities", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.RESEND_API_KEY = "re_test"
    process.env.MONITORING_ALERT_EMAILS = "ops@m2m.com , admin@m2mmoving.au"
    process.env.EMAIL_FROM_ADDRESS = "M&M Ops <alerts@m2mmoving.au>"
    sendMock.mockResolvedValue({ id: "email_123" })
    __resetMonitoringTestingState()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.clearAllMocks()
    resendConstructorMock.mockClear()
    sendMock.mockReset()
  })

  it("parses monitoring recipients from comma separated env var", () => {
    expect(getMonitoringRecipients()).toEqual(["ops@m2m.com", "admin@m2mmoving.au"])
  })

  it("builds subject and html content for alerts", () => {
    const payload = buildMonitoringEmail({
      source: "stripe.webhook",
      message: "Failed to verify signature",
      severity: "error",
      details: { requestId: "req_123" },
    })

    expect(payload.subject).toContain("stripe.webhook")
    expect(payload.subject).toContain("ERROR")
    expect(payload.html).toContain("requestId")
    expect(payload.text).toContain("Failed to verify signature")
  })

  it("sends alerts through Resend when API key and recipients exist", async () => {
    const result = await sendMonitoringAlert({
      source: "stripe.webhook",
      message: "Test alert",
      severity: "warning",
    })

    expect(result).toEqual({ delivered: true, id: "email_123" })
    expect(resendConstructorMock).toHaveBeenCalledWith("re_test")
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining("stripe.webhook"),
        to: ["ops@m2m.com", "admin@m2mmoving.au"],
        from: "M&M Ops <alerts@m2mmoving.au>",
      }),
    )
  })

  it("returns skipped result when API key is missing", async () => {
    delete process.env.RESEND_API_KEY
    __resetMonitoringTestingState()

    const result = await sendMonitoringAlert({
      source: "stripe.webhook",
      message: "Test alert",
    })

    expect(result).toEqual({ delivered: false, reason: "missing-api-key" })
    expect(sendMock).not.toHaveBeenCalled()
  })
})
