import { describe, expect, it, vi, afterEach, beforeEach } from "vitest"

const { constructEventMock, createClientMock, fromMock, updateMock, eqMock } = vi.hoisted(() => {
  const constructEvent = vi.fn()
  const eq = vi.fn()
  const update = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ update }))
  const createClient = vi.fn().mockResolvedValue({ from })
  return { constructEventMock: constructEvent, createClientMock: createClient, fromMock: from, updateMock: update, eqMock: eq }
})

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: constructEventMock,
    },
  },
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
    createClientMock.mockClear()
    fromMock.mockClear()
    updateMock.mockClear()
    eqMock.mockClear()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it("returns 400 when the signature header is missing", async () => {
    const response = await POST(createRequest("{}"))
    expect(response.status).toBe(400)
    expect(constructEventMock).not.toHaveBeenCalled()
  })

  it("updates the lead when checkout session completes", async () => {
    constructEventMock.mockReturnValueOnce({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test",
          metadata: { lead_id: "lead_123" },
        },
      },
    })

    const response = await POST(createRequest("{}", "sig_test"))

    expect(response.status).toBe(200)
    expect(createClientMock).toHaveBeenCalled()
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

  it("ignores events without lead metadata", async () => {
    constructEventMock.mockReturnValueOnce({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test",
          metadata: {},
        },
      },
    })

    const response = await POST(createRequest("{}", "sig_test"))

    expect(response.status).toBe(200)
    expect(fromMock).not.toHaveBeenCalled()
  })
})

function createRequest(body: string, signature?: string) {
  const headers = new Headers()
  if (signature) headers.set("stripe-signature", signature)
  return {
    headers,
    text: () => Promise.resolve(body),
  } as unknown as import("next/server").NextRequest
}
