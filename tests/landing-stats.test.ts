import { describe, expect, it } from "vitest"

import { buildMarketingStats, calculateRelocations } from "@/lib/landing/stats"

describe("landing stats", () => {
  it("returns 0 relocations before launch", () => {
    expect(calculateRelocations(new Date("2025-07-01"))).toBe(0)
  })

  it("returns 1 relocation between first and second milestones", () => {
    expect(calculateRelocations(new Date("2025-10-01"))).toBe(1)
  })

  it("returns 2 relocations once both milestones passed", () => {
    expect(calculateRelocations(new Date("2025-12-31"))).toBe(2)
  })

  it("builds marketing stat cards", () => {
    const stats = buildMarketingStats(2)
    expect(stats).toHaveLength(4)
    expect(stats[0]).toEqual({ value: "2", label: "Relocations Complete", highlight: false })
  })
})
