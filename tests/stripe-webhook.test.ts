import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const constructEventMock = vi.fn()
const eqMock = vi.fn()
const updateMock = vi.fn(() => ({ eq: eqMock }))
const fromMock = vi.fn(() => ({ update: updateMock }))
const reportMonitoringMock = vi.fn().mockResolvedValue({ delivered: true })

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: constructEventMock,
    },
  },
}))

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: fromMock,
  }),
}))

vi.mock("@/lib/monitoring", () => ({
  reportMonitoring: reportMonitoringMock,
}))

import { POST } from "@/app/api/stripe/webhook/route"

describe("Stripe webhook route", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv, STRIPE_WEBHOOK_SECRET: "whsec_test" }
    constructEventMock.mockReset()
    eqMock.mockReset()
    updateMock.mockClear()
    fromMock.mockClear()
    reportMonitoringMock.mockClear()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it("returns 400 and alerts when signature header is missing", async () => {
    const response = await POST(createRequest("{}", undefined))

    expect(response.status).toBe(400)
    expect(constructEventMock).not.toHaveBeenCalled()
    expect(reportMonitoringMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "stripe.webhook",
        severity: "warning",
      }),
    )
  })

  it("updates lead when checkout session completes successfully", async () => {
    constructEventMock.mockReturnValueOnce({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test",
          metadata: { lead_id: "lead_123", deposit_amount: "5000" },
          amount_total: 100000,
        },
      },
    })
    eqMock.mockResolvedValueOnce({ error: null })

    const response = await POST(createRequest("{}", "sig_test"))

    expect(response.status).toBe(200)
    expect(constructEventMock).toHaveBeenCalled()
    expect(fromMock).toHaveBeenCalledWith("leads")
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_status: "paid",
        deposit_paid: true,
        status: "quoted",
        deposit_amount: 5000,
      }),
    )
    expect(eqMock).toHaveBeenCalledWith("id", "lead_123")
    expect(reportMonitoringMock).not.toHaveBeenCalled()
  })

  it("reports monitoring alert when Supabase update fails", async () => {
    constructEventMock.mockReturnValueOnce({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test",
          metadata: { lead_id: "lead_999", deposit_amount: "2500" },
        },
      },
    })
    eqMock.mockResolvedValueOnce({ error: { message: "database offline" } })

    const response = await POST(createRequest("{}", "sig_test"))

    expect(response.status).toBe(500)
    expect(reportMonitoringMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "stripe.webhook",
        severity: "critical",
        details: expect.objectContaining({
          eventType: "checkout.session.completed",
        }),
      }),
    )
  })
})

function createRequest(body: string, signature?: string) {
  const headers = new Headers()
  if (signature) {
    headers.set("stripe-signature", signature)
  }

  return {
    headers,
    text: () => Promise.resolve(body),
  } as unknown as import("next/server").NextRequest
}
