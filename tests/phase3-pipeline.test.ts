import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock Supabase ────────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => {
  const mockEq = vi.fn().mockResolvedValue({ data: null, error: null })
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
  const mockSingle = vi.fn().mockResolvedValue({ data: { id: "inst_1" }, error: null })
  const mockSelectReturn = vi.fn().mockReturnValue({ single: mockSingle })
  const mockInsert = vi.fn().mockReturnValue({ select: mockSelectReturn })
  const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate, insert: mockInsert })
  return { mockFrom, mockUpdate, mockEq }
})

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}))

// ─── Phase 3A: Deal Pipeline Tests ───────────────────────────────────────────

describe("Pipeline Manager", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it("updates deal stage for a lead", async () => {
    const { updateDealStage } = await import("@/lib/pipeline/manager")
    await updateDealStage("lead_1", "quoted")
    expect(mockFrom).toHaveBeenCalledWith("leads")
  })

  it("sets quote expiration with default 14 days", async () => {
    const { setQuoteExpiration } = await import("@/lib/pipeline/manager")
    await setQuoteExpiration("lead_1")
    expect(mockFrom).toHaveBeenCalledWith("leads")
  })

  it("creates a standard 50/50 payment plan", async () => {
    const { createPaymentPlan } = await import("@/lib/pipeline/manager")
    const result = await createPaymentPlan("lead_1", 10000, "standard")
    expect(result.plan).toBe("standard")
    expect(result.installments).toHaveLength(2)
    expect(result.installments[0].amount).toBe(5000)
    expect(result.installments[1].amount).toBe(5000)
  })

  it("creates a three-part payment plan", async () => {
    const { createPaymentPlan } = await import("@/lib/pipeline/manager")
    const result = await createPaymentPlan("lead_1", 10000, "three_part")
    expect(result.plan).toBe("three_part")
    expect(result.installments).toHaveLength(3)
    expect(result.installments[0].amount).toBe(3000)
    expect(result.installments[2].amount).toBe(4000)
  })

  it("records win/loss with reason", async () => {
    const { recordWinLoss } = await import("@/lib/pipeline/manager")
    await recordWinLoss("lead_1", "lost", "Price too high")
    expect(mockFrom).toHaveBeenCalledWith("leads")
  })
})

// ─── Phase 3B: Dynamic Pricing Tests ─────────────────────────────────────────

describe("Dynamic Pricing", () => {
  it("applies demand-based pricing", async () => {
    const { applyDynamicPricing } = await import("@/lib/pipeline/pricing")
    const high = applyDynamicPricing({ basePrice: 10000, demandLevel: "high", isWeekend: false, daysUntilMove: 30 })
    const low = applyDynamicPricing({ basePrice: 10000, demandLevel: "low", isWeekend: false, daysUntilMove: 30 })
    expect(high.adjustedPrice).toBeGreaterThan(low.adjustedPrice)
  })

  it("adds weekend surcharge", async () => {
    const { applyDynamicPricing } = await import("@/lib/pipeline/pricing")
    const weekday = applyDynamicPricing({ basePrice: 10000, demandLevel: "normal", isWeekend: false, daysUntilMove: 30 })
    const weekend = applyDynamicPricing({ basePrice: 10000, demandLevel: "normal", isWeekend: true, daysUntilMove: 30 })
    expect(weekend.weekendSurcharge).toBe(1000) // 10% of 10000
    expect(weekend.adjustedPrice).toBeGreaterThan(weekday.adjustedPrice)
  })

  it("adds urgency premium for short notice", async () => {
    const { applyDynamicPricing } = await import("@/lib/pipeline/pricing")
    const normal = applyDynamicPricing({ basePrice: 10000, demandLevel: "normal", isWeekend: false, daysUntilMove: 30 })
    const urgent = applyDynamicPricing({ basePrice: 10000, demandLevel: "normal", isWeekend: false, daysUntilMove: 2 })
    expect(urgent.urgencyPremium).toBeGreaterThan(0)
    expect(urgent.adjustedPrice).toBeGreaterThan(normal.adjustedPrice)
  })

  it("returns standard pricing when no adjustments apply", async () => {
    const { applyDynamicPricing } = await import("@/lib/pipeline/pricing")
    const result = applyDynamicPricing({ basePrice: 10000, demandLevel: "normal", isWeekend: false, daysUntilMove: 30 })
    expect(result.adjustedPrice).toBe(10000)
    expect(result.adjustmentReason).toBe("Standard pricing")
  })

  it("returns pricing breakdown", async () => {
    const { applyDynamicPricing } = await import("@/lib/pipeline/pricing")
    const result = applyDynamicPricing({ basePrice: 10000, demandLevel: "high", isWeekend: true, daysUntilMove: 3 })
    expect(result).toHaveProperty("basePrice", 10000)
    expect(result).toHaveProperty("demandFactor")
    expect(result).toHaveProperty("weekendSurcharge")
    expect(result).toHaveProperty("urgencyPremium")
    expect(result).toHaveProperty("adjustmentReason")
  })
})
