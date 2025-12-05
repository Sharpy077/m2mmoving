import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { constructEventMock, eqMock, updateMock, fromMock, createClientMock } = vi.hoisted(() => {
  const constructEventMock = vi.fn()
  const eqMock = vi.fn()
  const updateMock = vi.fn(() => ({ eq: eqMock }))
  const fromMock = vi.fn(() => ({ update: updateMock }))
  const createClientMock = vi.fn().mockResolvedValue({ from: fromMock })
  return { constructEventMock, eqMock, updateMock, fromMock, createClientMock }
})

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

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
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
    createClientMock.mockReset()
    createClientMock.mockResolvedValue({ from: fromMock })
    eqMock.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it("returns 400 and alerts when signature header is missing", async () => {
    const response = await POST(createRequest("{}", undefined))

    expect(response.status).toBe(400)
    expect(constructEventMock).not.toHaveBeenCalled()
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
    expect(createClientMock).toHaveBeenCalled()
    expect(constructEventMock).toHaveBeenCalled()
    expect(fromMock).toHaveBeenCalledWith("leads")
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_status: "paid",
        deposit_paid: true,
        stripe_session_id: "cs_test",
      }),
    )
    expect(eqMock).toHaveBeenCalledWith("id", "lead_123")
  })

  it("returns 500 when the Supabase client cannot be created", async () => {
    constructEventMock.mockReturnValueOnce({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test",
          metadata: { lead_id: "lead_999", deposit_amount: "2500" },
        },
      },
    })
    createClientMock.mockRejectedValueOnce(new Error("db offline"))

    const response = await POST(createRequest("{}", "sig_test"))

    expect(response.status).toBe(500)
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
