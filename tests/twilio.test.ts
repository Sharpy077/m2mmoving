import { describe, expect, it } from "vitest"

import { formatAustralianNumber, isBusinessHours } from "@/lib/twilio"

describe("telephony utilities", () => {
  it("identifies Melbourne business hours correctly", () => {
    const withinHours = new Date("2025-12-01T23:00:00Z")
    const afterHoursWeekend = new Date("2025-12-06T02:00:00Z")

    expect(isBusinessHours(withinHours)).toBe(true)
    expect(isBusinessHours(afterHoursWeekend)).toBe(false)
  })

  it("formats Australian mobile numbers into E.164 format", () => {
    expect(formatAustralianNumber("0412345678")).toBe("+61412345678")
    expect(formatAustralianNumber("+61391234567")).toBe("+61391234567")
    expect(formatAustralianNumber("499999999")).toBe("+61499999999")
  })
})
