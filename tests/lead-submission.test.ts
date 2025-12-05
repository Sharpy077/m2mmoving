import { beforeEach, describe, expect, it, vi } from "vitest"

import { submitLead } from "@/app/actions/leads"

const { fromMock, insertMock, selectMock, singleMock, createClientMock, sendMock } = vi.hoisted(() => {
  const singleMock = vi.fn()
  const selectMock = vi.fn(() => ({ single: singleMock }))
  const insertMock = vi.fn(() => ({ select: selectMock }))
  const fromMock = vi.fn(() => ({ insert: insertMock }))
  const createClientMock = vi.fn().mockResolvedValue({ from: fromMock })
  const sendMock = vi.fn().mockResolvedValue({ id: "email_1" })
  return { fromMock, insertMock, selectMock, singleMock, createClientMock, sendMock }
})

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}))

vi.mock("@/lib/email", () => ({
  resend: {
    emails: {
      send: sendMock,
    },
  },
  EMAIL_FROM_ADDRESS: "ops@mm.com",
  LEAD_NOTIFICATION_RECIPIENTS: ["ops@mm.com", "sales@mm.com"],
  formatCurrency: (value?: number | null) => (typeof value === "number" ? `$${value}` : "TBD"),
}))

describe("submitLead server action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createClientMock.mockResolvedValue({ from: fromMock })
    singleMock.mockResolvedValue({ data: { id: "lead_abc" }, error: null })
  })

  it("persists lead data and sends notifications", async () => {
    const payload = {
      lead_type: "custom_quote" as const,
      email: "jamie@orbitlabs.com",
      company_name: "Orbit Labs",
      contact_name: "Jamie Client",
      special_requirements: ["server-room"],
    }

    const result = await submitLead(payload)

    expect(result).toEqual({ success: true, lead: { id: "lead_abc" } })
    expect(fromMock).toHaveBeenCalledWith("leads")
    expect(insertMock).toHaveBeenCalledWith(payload)
    expect(sendMock).toHaveBeenCalled()
  })

  it("returns an error when Supabase insert fails", async () => {
    singleMock.mockResolvedValueOnce({ data: null, error: { message: "insert failed" } })

    const result = await submitLead({ lead_type: "custom_quote", email: "fail@example.com" })

    expect(result).toEqual({ success: false, error: "insert failed" })
    expect(sendMock).not.toHaveBeenCalled()
  })
})
