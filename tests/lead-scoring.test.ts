import { describe, it, expect } from 'vitest'
import { calculateLeadScore } from '@/lib/campaigns/scoring'
import type { LeadScoreInput } from '@/lib/campaigns/scoring'

const minimalInput: LeadScoreInput = {
  hasEmail: false,
  hasPhone: false,
  hasCompanyName: false,
  moveType: 'unknown',
  estimatedTotal: 0,
  engagementEvents: 0,
}

describe('calculateLeadScore()', () => {
  it('returns a value between 0 and 100 for any input', () => {
    const score = calculateLeadScore(minimalInput)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  // ─── Contact completeness (max 30 pts) ───────────────────────
  describe('contact completeness', () => {
    it('adds 10 points for having an email address', () => {
      const without = calculateLeadScore(minimalInput)
      const with_ = calculateLeadScore({ ...minimalInput, hasEmail: true })
      expect(with_ - without).toBe(10)
    })

    it('adds 10 points for having a phone number', () => {
      const without = calculateLeadScore(minimalInput)
      const with_ = calculateLeadScore({ ...minimalInput, hasPhone: true })
      expect(with_ - without).toBe(10)
    })

    it('adds 10 points for having a company name', () => {
      const without = calculateLeadScore(minimalInput)
      const with_ = calculateLeadScore({ ...minimalInput, hasCompanyName: true })
      expect(with_ - without).toBe(10)
    })

    it('adds all 30 points when all contact fields are present', () => {
      const without = calculateLeadScore(minimalInput)
      const with_ = calculateLeadScore({
        ...minimalInput,
        hasEmail: true,
        hasPhone: true,
        hasCompanyName: true,
      })
      expect(with_ - without).toBe(30)
    })
  })

  // ─── Move type weights ────────────────────────────────────────
  describe('move type weights', () => {
    const defaultScore = calculateLeadScore({ ...minimalInput, moveType: 'unknown' })

    it('scores "datacenter" at 15 pts (highest priority)', () => {
      const score = calculateLeadScore({ ...minimalInput, moveType: 'datacenter' })
      expect(score - defaultScore).toBe(10) // 15 - 5 default
    })

    it('scores "office" at 10 pts', () => {
      const score = calculateLeadScore({ ...minimalInput, moveType: 'office' })
      expect(score - defaultScore).toBe(5) // 10 - 5 default
    })

    it('scores "it-equipment" at 5 pts (same as default)', () => {
      const score = calculateLeadScore({ ...minimalInput, moveType: 'it-equipment' })
      expect(score - defaultScore).toBe(0) // 5 - 5 default
    })

    it('defaults unknown move types to 5 pts', () => {
      const residential = calculateLeadScore({ ...minimalInput, moveType: 'residential' })
      const other = calculateLeadScore({ ...minimalInput, moveType: 'warehouse' })
      expect(residential).toBe(other) // both default to 5
    })
  })

  // ─── Deal value tiers ─────────────────────────────────────────
  describe('deal value tiers', () => {
    it('scores <$2000 in the lowest tier (5 pts)', () => {
      const score = calculateLeadScore({ ...minimalInput, estimatedTotal: 1000 })
      const base = calculateLeadScore({ ...minimalInput, estimatedTotal: 0 })
      // Both should fall in the lowest tier or the 5pt fallback
      expect(score).toBeLessThanOrEqual(base + 5)
    })

    it('scores $2000 at 10 pts (tier boundary)', () => {
      const below = calculateLeadScore({ ...minimalInput, estimatedTotal: 1999 })
      const at = calculateLeadScore({ ...minimalInput, estimatedTotal: 2000 })
      expect(at - below).toBe(5) // 10 - 5
    })

    it('scores $5000 at 15 pts', () => {
      const below = calculateLeadScore({ ...minimalInput, estimatedTotal: 4999 })
      const at = calculateLeadScore({ ...minimalInput, estimatedTotal: 5000 })
      expect(at - below).toBe(5) // 15 - 10
    })

    it('scores $10000 at 20 pts', () => {
      const below = calculateLeadScore({ ...minimalInput, estimatedTotal: 9999 })
      const at = calculateLeadScore({ ...minimalInput, estimatedTotal: 10000 })
      expect(at - below).toBe(5) // 20 - 15
    })

    it('scores $20000 at 25 pts', () => {
      const below = calculateLeadScore({ ...minimalInput, estimatedTotal: 19999 })
      const at = calculateLeadScore({ ...minimalInput, estimatedTotal: 20000 })
      expect(at - below).toBe(5) // 25 - 20
    })

    it('scores $50000+ at 30 pts (top tier)', () => {
      const below = calculateLeadScore({ ...minimalInput, estimatedTotal: 49999 })
      const at = calculateLeadScore({ ...minimalInput, estimatedTotal: 50000 })
      expect(at - below).toBe(5) // 30 - 25
    })
  })

  // ─── Engagement cap (max 25 pts) ─────────────────────────────
  describe('engagement scoring', () => {
    it('adds 5 pts per engagement event', () => {
      const zero = calculateLeadScore({ ...minimalInput, engagementEvents: 0 })
      const one = calculateLeadScore({ ...minimalInput, engagementEvents: 1 })
      expect(one - zero).toBe(5)
    })

    it('adds 10 pts for 2 engagement events', () => {
      const zero = calculateLeadScore({ ...minimalInput, engagementEvents: 0 })
      const two = calculateLeadScore({ ...minimalInput, engagementEvents: 2 })
      expect(two - zero).toBe(10)
    })

    it('caps engagement at 25 pts regardless of event count', () => {
      const five = calculateLeadScore({ ...minimalInput, engagementEvents: 5 })
      const ten = calculateLeadScore({ ...minimalInput, engagementEvents: 10 })
      const hundred = calculateLeadScore({ ...minimalInput, engagementEvents: 100 })
      expect(ten).toBe(five)
      expect(hundred).toBe(five)
    })
  })

  // ─── Full perfect score ───────────────────────────────────────
  it('returns 100 for a fully-complete, high-value datacenter lead', () => {
    const score = calculateLeadScore({
      hasEmail: true,
      hasPhone: true,
      hasCompanyName: true,
      moveType: 'datacenter',
      estimatedTotal: 100_000,
      engagementEvents: 10,
    })
    // 30 (contact) + 15 (datacenter) + 30 (>=$50k) + 25 (cap) = 100
    expect(score).toBe(100)
  })
})
