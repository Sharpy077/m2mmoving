import { describe, it, expect } from 'vitest'
import {
  calculateMarketplaceFees,
  formatAUD,
  grossUpProviderPrice,
} from '@/lib/marketplace/pricing'
import {
  getCommissionTier,
  calculateProviderEarnings,
  calculateEarningsSimulation,
} from '@/lib/marketplace/earnings'

// ─────────────────────────────────────────────────────────────
// calculateMarketplaceFees
// ─────────────────────────────────────────────────────────────
describe('calculateMarketplaceFees()', () => {
  it('calculates platform fee and provider payout at 15% commission', () => {
    const result = calculateMarketplaceFees({ customer_price: 1000, commission_rate: 0.15 })
    expect(result.platform_fee).toBe(150)
    expect(result.provider_payout).toBe(850)
    expect(result.customer_price).toBe(1000)
    expect(result.commission_rate).toBe(0.15)
  })

  it('calculates correctly at 10% commission', () => {
    const result = calculateMarketplaceFees({ customer_price: 2500, commission_rate: 0.10 })
    expect(result.platform_fee).toBe(250)
    expect(result.provider_payout).toBe(2250)
  })

  it('rounds platform fee to 2 decimal places', () => {
    // 333.33 * 0.15 = 49.9995 → rounds to 50
    const result = calculateMarketplaceFees({ customer_price: 333.33, commission_rate: 0.15 })
    expect(result.platform_fee).toBe(50)
    expect(result.provider_payout).toBe(283.33)
  })

  it('platform_fee + provider_payout equals customer_price', () => {
    const inputs = [
      { customer_price: 1234.56, commission_rate: 0.12 },
      { customer_price: 999.99, commission_rate: 0.15 },
      { customer_price: 5000, commission_rate: 0.10 },
    ]
    for (const input of inputs) {
      const r = calculateMarketplaceFees(input)
      // Allow for 1 cent rounding tolerance
      expect(Math.abs(r.platform_fee + r.provider_payout - r.customer_price)).toBeLessThanOrEqual(0.01)
    }
  })

  it('throws for zero customer price', () => {
    expect(() =>
      calculateMarketplaceFees({ customer_price: 0, commission_rate: 0.15 }),
    ).toThrow()
  })

  it('throws for negative customer price', () => {
    expect(() =>
      calculateMarketplaceFees({ customer_price: -500, commission_rate: 0.15 }),
    ).toThrow()
  })
})

// ─────────────────────────────────────────────────────────────
// formatAUD
// ─────────────────────────────────────────────────────────────
describe('formatAUD()', () => {
  it('formats a whole-dollar amount with AUD currency symbol', () => {
    const result = formatAUD(4250)
    expect(result).toMatch(/\$/)
    expect(result).toContain('4,250')
  })

  it('formats a decimal amount with two decimal places', () => {
    expect(formatAUD(1234.56)).toContain('1,234.56')
  })

  it('formats zero correctly', () => {
    expect(formatAUD(0)).toMatch(/0\.00/)
  })
})

// ─────────────────────────────────────────────────────────────
// grossUpProviderPrice
// ─────────────────────────────────────────────────────────────
describe('grossUpProviderPrice()', () => {
  it('calculates the customer price from a provider base at 15% commission', () => {
    // 850 / (1 - 0.15) = 1000
    const result = grossUpProviderPrice({ provider_base: 850, commission_rate: 0.15 })
    expect(result).toBe(1000)
  })

  it('round-trips with calculateMarketplaceFees within rounding tolerance', () => {
    const provider_base = 850
    const commission_rate = 0.12
    const customer_price = grossUpProviderPrice({ provider_base, commission_rate })
    const fees = calculateMarketplaceFees({ customer_price, commission_rate })
    // Provider payout should match provider_base within 1 cent
    expect(Math.abs(fees.provider_payout - provider_base)).toBeLessThanOrEqual(0.01)
  })

  it('throws when commission_rate is exactly 1', () => {
    expect(() =>
      grossUpProviderPrice({ provider_base: 100, commission_rate: 1 }),
    ).toThrow()
  })

  it('throws when commission_rate is greater than 1', () => {
    expect(() =>
      grossUpProviderPrice({ provider_base: 100, commission_rate: 1.5 }),
    ).toThrow()
  })
})

// ─────────────────────────────────────────────────────────────
// getCommissionTier
// ─────────────────────────────────────────────────────────────
describe('getCommissionTier()', () => {
  it('returns Standard (15%) for 0 jobs', () => {
    const tier = getCommissionTier(0)
    expect(tier.label).toBe('Standard')
    expect(tier.rate).toBe(0.15)
  })

  it('returns Standard (15%) for 10 jobs — upper Standard boundary', () => {
    const tier = getCommissionTier(10)
    expect(tier.label).toBe('Standard')
  })

  it('returns Growth (12%) for 11 jobs — lower Growth boundary', () => {
    const tier = getCommissionTier(11)
    expect(tier.label).toBe('Growth')
    expect(tier.rate).toBe(0.12)
  })

  it('returns Growth (12%) for 25 jobs — upper Growth boundary', () => {
    expect(getCommissionTier(25).label).toBe('Growth')
  })

  it('returns Pro (10%) for 26 jobs — lower Pro boundary', () => {
    const tier = getCommissionTier(26)
    expect(tier.label).toBe('Pro')
    expect(tier.rate).toBe(0.10)
  })

  it('returns Pro (10%) for large job counts', () => {
    expect(getCommissionTier(200).label).toBe('Pro')
  })
})

// ─────────────────────────────────────────────────────────────
// calculateProviderEarnings
// ─────────────────────────────────────────────────────────────
describe('calculateProviderEarnings()', () => {
  it('returns all-zero summary for an empty array', () => {
    const result = calculateProviderEarnings([])
    expect(result.total_released).toBe(0)
    expect(result.total_pending).toBe(0)
    expect(result.total_earned).toBe(0)
    expect(result.jobs_completed).toBe(0)
    expect(result.jobs_pending_payment).toBe(0)
  })

  it('correctly aggregates released and pending payouts', () => {
    const payouts = [
      { provider_payout: 500, status: 'released' },
      { provider_payout: 300, status: 'released' },
      { provider_payout: 200, status: 'pending' },
    ]
    const result = calculateProviderEarnings(payouts)
    expect(result.total_released).toBe(800)
    expect(result.total_pending).toBe(200)
    expect(result.total_earned).toBe(1000)
    expect(result.jobs_completed).toBe(2)
    expect(result.jobs_pending_payment).toBe(1)
  })

  it('ignores payouts with statuses other than "released" or "pending"', () => {
    const payouts = [
      { provider_payout: 1000, status: 'failed' },
      { provider_payout: 500, status: 'reversed' },
      { provider_payout: 400, status: 'released' },
    ]
    const result = calculateProviderEarnings(payouts)
    expect(result.total_released).toBe(400)
    expect(result.total_pending).toBe(0)
    expect(result.jobs_completed).toBe(1)
  })

  it('rounds totals to 2 decimal places', () => {
    const payouts = [
      { provider_payout: 100.005, status: 'released' },
      { provider_payout: 200.005, status: 'released' },
    ]
    const result = calculateProviderEarnings(payouts)
    // Floating-point sum may vary slightly; just verify it's rounded
    const decimalPart = result.total_released.toString().split('.')[1] ?? ''
    expect(decimalPart.length).toBeLessThanOrEqual(2)
  })
})

// ─────────────────────────────────────────────────────────────
// calculateEarningsSimulation
// ─────────────────────────────────────────────────────────────
describe('calculateEarningsSimulation()', () => {
  it('computes correct figures in the Standard tier (5 jobs, $1000 avg)', () => {
    const result = calculateEarningsSimulation({ jobs_per_month: 5, avg_job_value: 1000 })
    expect(result.tier.label).toBe('Standard')
    expect(result.gross_revenue).toBe(5000)
    expect(result.commission_rate).toBe(0.15)
    expect(result.platform_fee).toBe(750)
    expect(result.take_home).toBe(4250)
  })

  it('computes correct figures in the Growth tier (15 jobs, $2000 avg)', () => {
    const result = calculateEarningsSimulation({ jobs_per_month: 15, avg_job_value: 2000 })
    expect(result.tier.label).toBe('Growth')
    expect(result.gross_revenue).toBe(30000)
    expect(result.platform_fee).toBe(3600)
    expect(result.take_home).toBe(26400)
  })

  it('computes correct figures in the Pro tier (30 jobs, $1500 avg)', () => {
    const result = calculateEarningsSimulation({ jobs_per_month: 30, avg_job_value: 1500 })
    expect(result.tier.label).toBe('Pro')
    expect(result.commission_rate).toBe(0.10)
    expect(result.gross_revenue).toBe(45000)
    expect(result.platform_fee).toBe(4500)
    expect(result.take_home).toBe(40500)
  })

  it('gross_revenue - platform_fee equals take_home', () => {
    const result = calculateEarningsSimulation({ jobs_per_month: 8, avg_job_value: 750 })
    expect(result.take_home).toBe(
      Math.round((result.gross_revenue - result.platform_fee) * 100) / 100,
    )
  })
})
