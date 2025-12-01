import { describe, expect, it } from "vitest"

import { calculateQuoteEstimate, sanitizeDistance } from "@/lib/quote/estimator"

describe("quote estimator", () => {
  it("calculates total with distance and add-ons", () => {
    const result = calculateQuoteEstimate({
      moveTypeId: "office",
      squareMeters: 100,
      distanceKm: 10,
      selectedServices: ["packing", "afterhours"],
    })

    expect(result).toEqual(
      expect.objectContaining({
        total: 8030,
        deposit: 4015,
      }),
    )
    expect(result?.breakdown).toHaveLength(5)
  })

  it("enforces minimum square meters for small offices", () => {
    const result = calculateQuoteEstimate({
      moveTypeId: "office",
      squareMeters: 10,
    })

    expect(result?.effectiveSquareMeters).toBe(20)
    expect(result?.total).toBeGreaterThan(0)
  })

  it("sanitizes unsafe distance values", () => {
    expect(sanitizeDistance(-10)).toBe(0)
    expect(sanitizeDistance("abc")).toBe(0)
    expect(sanitizeDistance(99999)).toBe(1000)
  })
})
