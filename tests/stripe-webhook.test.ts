import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { constructEventMock, singleMock, selectAfterEqMock, eqMock, updateMock, fromMock, createClientMock } = vi.hoisted(() => {
  const constructEventMock = vi.fn()
  const singleMock = vi.fn()
  const selectAfterEqMock = vi.fn(() => ({ single: singleMock }))
  const eqMock = vi.fn(() => ({ select: selectAfterEqMock }))
  const updateMock = vi.fn(() => ({ eq: eqMock }))
  const fromMock = vi.fn(() => ({ update: updateMock }))
  const createClientMock = vi.fn()
  return { constructEventMock, singleMock, selectAfterEqMock, eqMock, updateMock, fromMock, createClientMock }
})

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: constructEventMock,
    },
  },
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => createClientMock(),
}))

import { POST } from "@/app/api/stripe/webhook/route"

describe("Stripe webhook route", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv, STRIPE_WEBHOOK_SECRET: "whsec_test" }
    constructEventMock.mockReset()
    eqMock.mockClear()
    updateMock.mockClear()
    fromMock.mockClear()
    singleMock.mockResolvedValue({ data: { id: "lead_123", email: "test@test.com", contact_name: "Test" }, error: null })
    createClientMock.mockResolvedValue({
      from: fromMock,
    })
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it("returns 400 when signature header is missing", async () => {
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
          payment_intent: "pi_test_123",
        },
      },
    })
    const response = await POST(createRequest("{}", "sig_test"))

    expect(response.status).toBe(200)
    expect(constructEventMock).toHaveBeenCalled()
    expect(fromMock).toHaveBeenCalledWith("leads")
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_status: "paid",
        deposit_paid: true,
      }),
    )
    expect(eqMock).toHaveBeenCalledWith("id", "lead_123")
  })

  it("returns 400 when signature verification fails", async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error("Invalid signature")
    })

    const response = await POST(createRequest("{}", "bad_sig"))

    expect(response.status).toBe(400)
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
