/**
 * Stripe Webhook Edge Cases
 * Additional coverage for charge.refunded, charge.dispute.created,
 * and payment_intent.payment_failed events.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const {
  constructEventMock,
  eqMock,
  updateMock,
  fromMock,
  createClientMock,
  sendEmailMock,
} = vi.hoisted(() => {
  const constructEventMock = vi.fn()
  const eqMock = vi.fn().mockResolvedValue({ data: null, error: null })
  const updateMock = vi.fn(() => ({ eq: eqMock }))
  const fromMock = vi.fn(() => ({ update: updateMock }))
  const createClientMock = vi.fn()
  const sendEmailMock = vi.fn().mockResolvedValue({ id: "email_ok" })
  return { constructEventMock, eqMock, updateMock, fromMock, createClientMock, sendEmailMock }
})

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: constructEventMock,
    },
    charges: {
      retrieve: vi.fn().mockResolvedValue({ receipt_url: null }),
    },
  },
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => createClientMock(),
}))

vi.mock("@/lib/email", () => ({
  resend: { emails: { send: sendEmailMock } },
  EMAIL_FROM_ADDRESS: "noreply@m2mmoving.au",
  LEAD_NOTIFICATION_RECIPIENTS: ["ops@m2mmoving.au"],
}))

import { POST } from "@/app/api/stripe/webhook/route"

function createRequest(body: string, signature = "sig_test") {
  const headers = new Headers()
  headers.set("stripe-signature", signature)
  return {
    headers,
    text: () => Promise.resolve(body),
  } as unknown as import("next/server").NextRequest
}

describe("Stripe webhook — charge.refunded", () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"
    vi.clearAllMocks()
    createClientMock.mockResolvedValue({ from: fromMock })
  })

  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET
  })

  it("sets payment status to 'refunded' for a full refund", async () => {
    constructEventMock.mockReturnValue({
      type: "charge.refunded",
      data: {
        object: {
          id: "ch_full",
          payment_intent: "pi_full",
          refunded: true,
          amount: 100000,
          amount_refunded: 100000,
          metadata: {},
        },
      },
    })

    const res = await POST(createRequest("{}"))
    expect(res.status).toBe(200)
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: "refunded" }),
    )
  })

  it("sets payment status to 'partially_refunded' for a partial refund", async () => {
    constructEventMock.mockReturnValue({
      type: "charge.refunded",
      data: {
        object: {
          id: "ch_partial",
          payment_intent: "pi_partial",
          refunded: false,
          amount: 100000,
          amount_refunded: 50000,
          metadata: {},
        },
      },
    })

    const res = await POST(createRequest("{}"))
    expect(res.status).toBe(200)
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: "partially_refunded" }),
    )
  })

  it("cancels the lead when the refund is full and lead_id is in metadata", async () => {
    constructEventMock.mockReturnValue({
      type: "charge.refunded",
      data: {
        object: {
          id: "ch_cancel",
          payment_intent: "pi_cancel",
          refunded: true,
          amount: 50000,
          amount_refunded: 50000,
          metadata: { lead_id: "lead_abc" },
        },
      },
    })

    await POST(createRequest("{}"))

    // Two update calls: one for payments, one for leads
    expect(fromMock).toHaveBeenCalledWith("payments")
    expect(fromMock).toHaveBeenCalledWith("leads")
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        deposit_paid: false,
        payment_status: "refunded",
        status: "cancelled",
      }),
    )
  })

  it("does NOT cancel the lead for a partial refund", async () => {
    constructEventMock.mockReturnValue({
      type: "charge.refunded",
      data: {
        object: {
          id: "ch_partial2",
          payment_intent: "pi_partial2",
          refunded: false,
          amount: 100000,
          amount_refunded: 30000,
          metadata: { lead_id: "lead_def" },
        },
      },
    })

    await POST(createRequest("{}"))

    // Only one update call for payments; leads should NOT be updated
    const leadsUpdateCalls = fromMock.mock.calls.filter(
      (call: string[]) => call[0] === "leads",
    )
    expect(leadsUpdateCalls.length).toBe(0)
  })

  it("sends a refund notification email to the team", async () => {
    constructEventMock.mockReturnValue({
      type: "charge.refunded",
      data: {
        object: {
          id: "ch_email",
          payment_intent: "pi_email",
          refunded: true,
          amount: 20000,
          amount_refunded: 20000,
          metadata: {},
        },
      },
    })

    await POST(createRequest("{}"))
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringMatching(/refund/i),
      }),
    )
  })
})

describe("Stripe webhook — charge.dispute.created", () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"
    vi.clearAllMocks()
    createClientMock.mockResolvedValue({ from: fromMock })
  })

  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET
  })

  it("sends an urgent dispute alert email to the team", async () => {
    constructEventMock.mockReturnValue({
      type: "charge.dispute.created",
      data: {
        object: {
          id: "dp_test",
          amount: 15000,
          reason: "fraudulent",
          status: "needs_response",
        },
      },
    })

    const res = await POST(createRequest("{}"))
    expect(res.status).toBe(200)
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining("dp_test"),
      }),
    )
  })

  it("does not update any database tables for a dispute", async () => {
    constructEventMock.mockReturnValue({
      type: "charge.dispute.created",
      data: {
        object: {
          id: "dp_nodb",
          amount: 10000,
          reason: "unrecognized",
          status: "warning_needs_response",
        },
      },
    })

    await POST(createRequest("{}"))
    expect(fromMock).not.toHaveBeenCalled()
  })
})

describe("Stripe webhook — payment_intent.payment_failed", () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"
    vi.clearAllMocks()
    createClientMock.mockResolvedValue({ from: fromMock })
  })

  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET
  })

  it("updates the payment record with status 'failed' and failure reason", async () => {
    constructEventMock.mockReturnValue({
      type: "payment_intent.payment_failed",
      data: {
        object: {
          id: "pi_fail",
          amount: 5000,
          metadata: {},
          last_payment_error: { message: "Your card was declined." },
        },
      },
    })

    const res = await POST(createRequest("{}"))
    expect(res.status).toBe(200)
    expect(fromMock).toHaveBeenCalledWith("payments")
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        failure_reason: "Your card was declined.",
      }),
    )
  })

  it("updates the lead payment_status to 'failed' when lead_id is in metadata", async () => {
    constructEventMock.mockReturnValue({
      type: "payment_intent.payment_failed",
      data: {
        object: {
          id: "pi_fail_lead",
          amount: 8000,
          metadata: { lead_id: "lead_xyz" },
          last_payment_error: { message: "Insufficient funds." },
        },
      },
    })

    await POST(createRequest("{}"))

    expect(fromMock).toHaveBeenCalledWith("leads")
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ payment_status: "failed" }),
    )
    expect(eqMock).toHaveBeenCalledWith("id", "lead_xyz")
  })

  it("uses 'Unknown error' as fallback when last_payment_error is absent", async () => {
    constructEventMock.mockReturnValue({
      type: "payment_intent.payment_failed",
      data: {
        object: {
          id: "pi_fail_noerr",
          amount: 3000,
          metadata: {},
          last_payment_error: null,
        },
      },
    })

    await POST(createRequest("{}"))
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ failure_reason: "Unknown error" }),
    )
  })

  it("sends a failure alert email to the team", async () => {
    constructEventMock.mockReturnValue({
      type: "payment_intent.payment_failed",
      data: {
        object: {
          id: "pi_fail_email",
          amount: 4000,
          metadata: {},
          last_payment_error: { message: "Card expired." },
        },
      },
    })

    await POST(createRequest("{}"))
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringMatching(/payment failed/i),
      }),
    )
  })
})
