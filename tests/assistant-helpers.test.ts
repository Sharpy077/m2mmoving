import { describe, expect, it } from "vitest"

import {
  buildAssistantLeadPayload,
  formatBookingDate,
  sanitizeVoiceTranscript,
} from "@/lib/quote/assistant"

describe("assistant helpers", () => {
  it("formats booking dates for the assistant response", () => {
    expect(formatBookingDate("2025-12-25")).toContain("Thursday")
  })

  it("sanitizes transcripts from the Speech API", () => {
    expect(sanitizeVoiceTranscript("Need <script>help</script> ASAP!!!")).toBe("Need scripthelpscript ASAP")
  })

  it("builds a secure lead payload after payment", () => {
    const payload = buildAssistantLeadPayload({
      quote: {
        moveType: "Office Relocation",
        moveTypeKey: "office",
        estimatedTotal: 12000.75,
        depositRequired: 6000.25,
        origin: "Melbourne CBD",
        destination: "Richmond",
        squareMeters: 250,
      },
      contact: {
        contactName: "Jane Smith",
        email: "jane@example.com",
        phone: "0411 222 333",
        companyName: "Jane & Co",
      },
      business: { name: "Jane & Co", abn: "12 345 678 901" },
      scheduledDate: "2025-12-25",
    })

    expect(payload).toMatchObject({
      lead_type: "instant_quote",
      move_type: "office",
      deposit_paid: true,
      scheduled_date: "2025-12-25",
      internal_notes: expect.stringContaining("ABN"),
    })
  })
})
