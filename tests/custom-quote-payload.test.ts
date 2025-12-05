import { describe, expect, it } from "vitest"

import { buildCustomQuoteLeadPayload, type CustomQuoteFormData } from "@/lib/quote/custom"

const baseForm: CustomQuoteFormData = {
  fullName: "  Alice Doe  ",
  companyName: "<Acme Pty>",
  email: "alice@example.com",
  phone: "0412 345 678",
  industryType: "technology",
  employeeCount: "11-50",
  currentLocation: "123 Collins St",
  newLocation: "456 Bourke St",
  targetMoveDate: "2025-12-01",
  estimatedSqm: "500",
  projectDescription: "Needs <script>alert('x')</script> handling",
  preferredContactTime: "morning",
}

describe("custom quote payload", () => {
  it("builds a sanitized LeadInsert payload", () => {
    const payload = buildCustomQuoteLeadPayload(baseForm, ["server-room", "server-room", "security"])

    expect(payload).toMatchObject({
      lead_type: "custom_quote",
      contact_name: "Alice Doe",
      company_name: "Acme Pty",
      phone: "+61412345678",
      square_meters: 500,
      special_requirements: ["server-room", "security"],
    })
    expect(payload.project_description).not.toContain("<script>")
  })

  it("throws when required fields are missing", () => {
    expect(() => buildCustomQuoteLeadPayload({ ...baseForm, email: "  " }, [])).toThrow(/Email/)
  })

  it("caps unreasonable square meter values", () => {
    const payload = buildCustomQuoteLeadPayload({ ...baseForm, estimatedSqm: "5000000" }, [])
    expect(payload.square_meters).toBe(100000)
  })
})
