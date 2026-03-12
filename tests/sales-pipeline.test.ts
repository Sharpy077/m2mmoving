import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockFrom, mockUpdate, mockEq, mockInsert, mockSelect } = vi.hoisted(() => {
  const mockEq = vi.fn().mockReturnThis()
  const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null })
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq, order: mockOrder })
  const mockInsert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: "inst_1" }, error: null }),
    }),
  })
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
  const mockFrom = vi.fn().mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  })
  return { mockFrom, mockUpdate, mockEq, mockInsert, mockSelect }
})

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}))

describe("Sales Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe("updateDealStage()", () => {
    it("updates the lead deal stage and resets days counter", async () => {
      mockEq.mockResolvedValueOnce({ data: { id: "lead_1" }, error: null })
      const { updateDealStage } = await import("@/lib/pipeline/manager")
      await updateDealStage("lead_1", "quoted")

      expect(mockFrom).toHaveBeenCalledWith("leads")
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          deal_stage: "quoted",
          days_in_stage: 0,
        })
      )
    })
  })

  describe("setQuoteExpiration()", () => {
    it("sets quote expiration 14 days from now by default", async () => {
      mockEq.mockResolvedValueOnce({ data: { id: "lead_1" }, error: null })
      const { setQuoteExpiration } = await import("@/lib/pipeline/manager")
      await setQuoteExpiration("lead_1")

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          quote_expires_at: expect.any(String),
        })
      )
    })

    it("accepts custom expiration days", async () => {
      mockEq.mockResolvedValueOnce({ data: { id: "lead_1" }, error: null })
      const { setQuoteExpiration } = await import("@/lib/pipeline/manager")
      await setQuoteExpiration("lead_1", 7)

      expect(mockUpdate).toHaveBeenCalled()
    })
  })

  describe("createPaymentPlan()", () => {
    it("creates installments for standard plan (50/50)", async () => {
      const { createPaymentPlan } = await import("@/lib/pipeline/manager")
      const result = await createPaymentPlan("lead_1", 10000, "standard")

      expect(result.installments).toHaveLength(2)
      expect(result.installments[0].amount).toBe(5000)
      expect(result.installments[1].amount).toBe(5000)
    })

    it("creates installments for three-part plan (30/30/40)", async () => {
      const { createPaymentPlan } = await import("@/lib/pipeline/manager")
      const result = await createPaymentPlan("lead_1", 10000, "three_part")

      expect(result.installments).toHaveLength(3)
      expect(result.installments[0].amount).toBe(3000)
      expect(result.installments[1].amount).toBe(3000)
      expect(result.installments[2].amount).toBe(4000)
    })
  })

  describe("recordWinLoss()", () => {
    it("records win/loss reason on the lead", async () => {
      mockEq.mockResolvedValueOnce({ data: { id: "lead_1" }, error: null })
      const { recordWinLoss } = await import("@/lib/pipeline/manager")
      await recordWinLoss("lead_1", "won", "Competitive pricing")

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "won",
          win_loss_reason: "Competitive pricing",
        })
      )
    })
  })
})

describe("Dynamic Pricing", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe("applyDynamicPricing()", () => {
    it("adjusts price based on demand factor", async () => {
      const { applyDynamicPricing } = await import("@/lib/pipeline/pricing")
      const result = applyDynamicPricing({
        basePrice: 10000,
        demandLevel: "high",
        isWeekend: false,
        daysUntilMove: 30,
      })

      expect(result.adjustedPrice).toBeGreaterThan(10000)
      expect(result.demandFactor).toBeGreaterThan(1)
    })

    it("applies discount for low demand", async () => {
      const { applyDynamicPricing } = await import("@/lib/pipeline/pricing")
      const result = applyDynamicPricing({
        basePrice: 10000,
        demandLevel: "low",
        isWeekend: false,
        daysUntilMove: 60,
      })

      expect(result.adjustedPrice).toBeLessThan(10000)
      expect(result.demandFactor).toBeLessThan(1)
    })

    it("adds weekend surcharge", async () => {
      const { applyDynamicPricing } = await import("@/lib/pipeline/pricing")
      const weekday = applyDynamicPricing({
        basePrice: 10000,
        demandLevel: "normal",
        isWeekend: false,
        daysUntilMove: 30,
      })
      const weekend = applyDynamicPricing({
        basePrice: 10000,
        demandLevel: "normal",
        isWeekend: true,
        daysUntilMove: 30,
      })

      expect(weekend.adjustedPrice).toBeGreaterThan(weekday.adjustedPrice)
    })

    it("adds urgency premium for short notice", async () => {
      const { applyDynamicPricing } = await import("@/lib/pipeline/pricing")
      const planned = applyDynamicPricing({
        basePrice: 10000,
        demandLevel: "normal",
        isWeekend: false,
        daysUntilMove: 30,
      })
      const urgent = applyDynamicPricing({
        basePrice: 10000,
        demandLevel: "normal",
        isWeekend: false,
        daysUntilMove: 3,
      })

      expect(urgent.adjustedPrice).toBeGreaterThan(planned.adjustedPrice)
    })
  })
})
