import { describe, it, expect } from 'vitest'
import { applyDynamicPricing } from '@/lib/pipeline/pricing'

const baseInput = {
  basePrice: 1000,
  demandLevel: 'normal' as const,
  isWeekend: false,
  daysUntilMove: 30,
}

describe('applyDynamicPricing()', () => {
  it('returns the base price unchanged for standard conditions', () => {
    const result = applyDynamicPricing(baseInput)
    expect(result.adjustedPrice).toBe(1000)
    expect(result.weekendSurcharge).toBe(0)
    expect(result.urgencyPremium).toBe(0)
    expect(result.adjustmentReason).toBe('Standard pricing')
  })

  it('preserves the original base price in the result', () => {
    const result = applyDynamicPricing({ ...baseInput, demandLevel: 'high' })
    expect(result.basePrice).toBe(1000)
  })

  // ─── Demand factor ────────────────────────────────────────────
  describe('demand factor', () => {
    it('reduces price by 10% for low demand', () => {
      const result = applyDynamicPricing({ ...baseInput, demandLevel: 'low' })
      expect(result.demandFactor).toBe(0.90)
      expect(result.adjustedPrice).toBe(900)
      expect(result.adjustmentReason).toContain('low demand')
    })

    it('keeps price unchanged for normal demand', () => {
      const result = applyDynamicPricing({ ...baseInput, demandLevel: 'normal' })
      expect(result.demandFactor).toBe(1.00)
      expect(result.adjustedPrice).toBe(1000)
    })

    it('increases price by 15% for high demand', () => {
      const result = applyDynamicPricing({ ...baseInput, demandLevel: 'high' })
      expect(result.demandFactor).toBe(1.15)
      expect(result.adjustedPrice).toBe(1150)
      expect(result.adjustmentReason).toContain('high demand')
    })
  })

  // ─── Weekend surcharge ────────────────────────────────────────
  describe('weekend surcharge', () => {
    it('adds a 10% surcharge on weekend moves', () => {
      const result = applyDynamicPricing({ ...baseInput, isWeekend: true })
      expect(result.weekendSurcharge).toBe(100)
      expect(result.adjustedPrice).toBe(1100)
    })

    it('includes the weekend surcharge in the adjustment reason', () => {
      const result = applyDynamicPricing({ ...baseInput, isWeekend: true })
      expect(result.adjustmentReason).toContain('weekend surcharge')
    })

    it('applies no surcharge on weekdays', () => {
      const result = applyDynamicPricing({ ...baseInput, isWeekend: false })
      expect(result.weekendSurcharge).toBe(0)
    })
  })

  // ─── Urgency premium ─────────────────────────────────────────
  describe('urgency premium', () => {
    it('adds the full 15% premium for a same-day move (0 days)', () => {
      const result = applyDynamicPricing({ ...baseInput, daysUntilMove: 0 })
      // premium = 1000 * 0.15 * (1 - 0/7) = 150
      expect(result.urgencyPremium).toBe(150)
    })

    it('applies a partial premium within the 7-day threshold', () => {
      const result = applyDynamicPricing({ ...baseInput, daysUntilMove: 3 })
      // premium = 1000 * 0.15 * (1 - 3/7) ≈ 85.71 → rounds to 86
      expect(result.urgencyPremium).toBeGreaterThan(0)
      expect(result.urgencyPremium).toBeLessThan(150)
    })

    it('applies exactly zero premium at the 7-day boundary', () => {
      const result = applyDynamicPricing({ ...baseInput, daysUntilMove: 7 })
      // premium = 1000 * 0.15 * (1 - 7/7) = 0
      expect(result.urgencyPremium).toBe(0)
    })

    it('applies zero premium beyond the 7-day threshold', () => {
      const result = applyDynamicPricing({ ...baseInput, daysUntilMove: 14 })
      expect(result.urgencyPremium).toBe(0)
    })

    it('includes urgency info in the adjustment reason when applicable', () => {
      const result = applyDynamicPricing({ ...baseInput, daysUntilMove: 2 })
      expect(result.adjustmentReason).toContain('short notice')
    })
  })

  // ─── Multiple factors ─────────────────────────────────────────
  describe('factor accumulation', () => {
    it('accumulates high demand + weekend + urgency correctly', () => {
      const result = applyDynamicPricing({
        basePrice: 1000,
        demandLevel: 'high',
        isWeekend: true,
        daysUntilMove: 0,
      })
      // demand: 1000 * 1.15 = 1150, weekend: 100, urgency: 150
      // adjusted = round(1150 + 100 + 150) = 1400
      expect(result.adjustedPrice).toBe(1400)
    })

    it('includes all active factor reasons in adjustmentReason', () => {
      const result = applyDynamicPricing({
        basePrice: 1000,
        demandLevel: 'high',
        isWeekend: true,
        daysUntilMove: 0,
      })
      expect(result.adjustmentReason).toContain('high demand')
      expect(result.adjustmentReason).toContain('weekend surcharge')
      expect(result.adjustmentReason).toContain('short notice')
    })

    it('accumulates low demand + weekend correctly', () => {
      const result = applyDynamicPricing({
        basePrice: 1000,
        demandLevel: 'low',
        isWeekend: true,
        daysUntilMove: 30,
      })
      // demand: 1000 * 0.90 = 900, weekend: 100 (always on base price), urgency: 0
      expect(result.adjustedPrice).toBe(1000) // 900 + 100
    })
  })
})
