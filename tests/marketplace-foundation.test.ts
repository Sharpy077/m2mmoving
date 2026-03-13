/**
 * Marketplace Foundation Tests
 * Tests for new marketplace types, Zod schemas, and domain logic
 * Written BEFORE implementation (TDD Red phase)
 */

import { describe, it, expect } from 'vitest'
import {
  providerSchema,
  providerDriverSchema,
  marketplaceJobSchema,
  jobBidSchema,
  userProfileSchema,
  marketplacePayoutSchema,
  providerAvailabilitySchema,
} from '@/lib/marketplace/schemas'
import type {
  Provider,
  ProviderDriver,
  MarketplaceJob,
  JobBid,
  UserProfile,
  MarketplacePayout,
  ProviderAvailability,
  MarketplaceJobStatus,
  ProviderVerificationStatus,
  UserRole,
} from '@/lib/marketplace/types'

// ─────────────────────────────────────────────
// UserProfile Schema Tests
// ─────────────────────────────────────────────

describe('userProfileSchema', () => {
  it('validates a customer profile', () => {
    const result = userProfileSchema.safeParse({
      id: 'user-1',
      role: 'customer',
      display_name: 'Acme Corp',
      status: 'active',
      onboarding_completed: true,
    })
    expect(result.success).toBe(true)
  })

  it('validates a provider_admin profile with provider_id', () => {
    const result = userProfileSchema.safeParse({
      id: 'user-2',
      role: 'provider_admin',
      provider_id: 'prov-1',
      display_name: 'Fast Movers Pty Ltd',
      status: 'active',
      onboarding_completed: false,
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid role', () => {
    const result = userProfileSchema.safeParse({
      id: 'user-3',
      role: 'superuser',
      display_name: 'Hacker',
      status: 'active',
    })
    expect(result.success).toBe(false)
  })

  it('requires id field', () => {
    const result = userProfileSchema.safeParse({
      role: 'customer',
      display_name: 'No ID',
      status: 'active',
    })
    expect(result.success).toBe(false)
  })
})

// ─────────────────────────────────────────────
// Provider Schema Tests
// ─────────────────────────────────────────────

describe('providerSchema', () => {
  const validProvider = {
    company_name: 'Fast Movers Pty Ltd',
    abn: '51824753556',
    email: 'ops@fastmovers.com.au',
    phone: '0398765432',
    service_areas: ['Melbourne CBD', 'Southbank', 'St Kilda'],
    move_types: ['office', 'warehouse'],
    commission_rate: 0.15,
  }

  it('validates a valid provider', () => {
    const result = providerSchema.safeParse(validProvider)
    expect(result.success).toBe(true)
  })

  it('rejects provider without company_name', () => {
    const { company_name: _, ...rest } = validProvider
    const result = providerSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = providerSchema.safeParse({ ...validProvider, email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects commission_rate above 1', () => {
    const result = providerSchema.safeParse({ ...validProvider, commission_rate: 1.5 })
    expect(result.success).toBe(false)
  })

  it('rejects commission_rate below 0', () => {
    const result = providerSchema.safeParse({ ...validProvider, commission_rate: -0.1 })
    expect(result.success).toBe(false)
  })

  it('defaults commission_rate to 0.15', () => {
    const { commission_rate: _, ...rest } = validProvider
    const result = providerSchema.safeParse(rest)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.commission_rate).toBe(0.15)
    }
  })

  it('rejects invalid move_type values', () => {
    const result = providerSchema.safeParse({ ...validProvider, move_types: ['office', 'spaceship'] })
    expect(result.success).toBe(false)
  })
})

// ─────────────────────────────────────────────
// ProviderDriver Schema Tests
// ─────────────────────────────────────────────

describe('providerDriverSchema', () => {
  const validDriver = {
    provider_id: 'prov-1',
    name: 'John Smith',
    phone: '0412345678',
    role: 'driver',
    skills: ['heavy_lifting', 'piano'],
  }

  it('validates a valid driver', () => {
    const result = providerDriverSchema.safeParse(validDriver)
    expect(result.success).toBe(true)
  })

  it('rejects unknown role', () => {
    const result = providerDriverSchema.safeParse({ ...validDriver, role: 'CEO' })
    expect(result.success).toBe(false)
  })

  it('requires provider_id', () => {
    const { provider_id: _, ...rest } = validDriver
    const result = providerDriverSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('accepts all valid roles', () => {
    const roles = ['driver', 'mover', 'lead', 'supervisor'] as const
    for (const role of roles) {
      const result = providerDriverSchema.safeParse({ ...validDriver, role })
      expect(result.success).toBe(true)
    }
  })
})

// ─────────────────────────────────────────────
// MarketplaceJob Schema Tests
// ─────────────────────────────────────────────

describe('marketplaceJobSchema', () => {
  const validJob = {
    job_type: 'office',
    matching_mode: 'instant',
    origin_suburb: 'Melbourne CBD',
    origin_state: 'VIC',
    destination_suburb: 'Southbank',
    destination_state: 'VIC',
    scheduled_date: '2026-04-01',
    square_meters: 150,
    customer_price: 5000,
    platform_fee_pct: 0.15,
  }

  it('validates a valid marketplace job', () => {
    const result = marketplaceJobSchema.safeParse(validJob)
    expect(result.success).toBe(true)
  })

  it('rejects invalid job_type', () => {
    const result = marketplaceJobSchema.safeParse({ ...validJob, job_type: 'house' })
    expect(result.success).toBe(false)
  })

  it('requires datacenter/warehouse jobs use bidding mode', () => {
    // Large jobs should be flagged for bidding
    const largeJob = {
      ...validJob,
      job_type: 'datacenter',
      square_meters: 300,
      matching_mode: 'bidding',
    }
    const result = marketplaceJobSchema.safeParse(largeJob)
    expect(result.success).toBe(true)
  })

  it('rejects negative customer_price', () => {
    const result = marketplaceJobSchema.safeParse({ ...validJob, customer_price: -100 })
    expect(result.success).toBe(false)
  })

  it('defaults platform_fee_pct to 0.15', () => {
    const { platform_fee_pct: _, ...rest } = validJob
    const result = marketplaceJobSchema.safeParse(rest)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.platform_fee_pct).toBe(0.15)
    }
  })
})

// ─────────────────────────────────────────────
// JobBid Schema Tests
// ─────────────────────────────────────────────

describe('jobBidSchema', () => {
  const validBid = {
    job_id: 'job-1',
    provider_id: 'prov-1',
    bid_amount: 4500,
    crew_size: 3,
    estimated_duration_hours: 8,
    message: 'We have experience with office relocations in the CBD.',
  }

  it('validates a valid job bid', () => {
    const result = jobBidSchema.safeParse(validBid)
    expect(result.success).toBe(true)
  })

  it('rejects bid_amount of 0', () => {
    const result = jobBidSchema.safeParse({ ...validBid, bid_amount: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects negative bid_amount', () => {
    const result = jobBidSchema.safeParse({ ...validBid, bid_amount: -1 })
    expect(result.success).toBe(false)
  })

  it('requires job_id and provider_id', () => {
    const { job_id: _j, provider_id: _p, ...rest } = validBid
    const result = jobBidSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })
})

// ─────────────────────────────────────────────
// Domain Logic: Matching Mode Determination
// ─────────────────────────────────────────────

describe('determineMatchingMode()', () => {
  it('returns instant for small office jobs', async () => {
    const { determineMatchingMode } = await import('@/lib/marketplace/matching')
    expect(determineMatchingMode({ job_type: 'office', square_meters: 100 })).toBe('instant')
  })

  it('returns bidding for large warehouse jobs', async () => {
    const { determineMatchingMode } = await import('@/lib/marketplace/matching')
    expect(determineMatchingMode({ job_type: 'warehouse', square_meters: 300 })).toBe('bidding')
  })

  it('returns bidding for any datacenter job', async () => {
    const { determineMatchingMode } = await import('@/lib/marketplace/matching')
    expect(determineMatchingMode({ job_type: 'datacenter', square_meters: 50 })).toBe('bidding')
  })

  it('returns instant for office jobs under 200sqm threshold', async () => {
    const { determineMatchingMode } = await import('@/lib/marketplace/matching')
    expect(determineMatchingMode({ job_type: 'office', square_meters: 199 })).toBe('instant')
  })

  it('returns bidding for office jobs at or above 200sqm threshold', async () => {
    const { determineMatchingMode } = await import('@/lib/marketplace/matching')
    expect(determineMatchingMode({ job_type: 'office', square_meters: 200 })).toBe('bidding')
  })
})

// ─────────────────────────────────────────────
// Domain Logic: Platform Fee Calculation
// ─────────────────────────────────────────────

describe('calculateMarketplaceFees()', () => {
  it('calculates 15% platform fee correctly', async () => {
    const { calculateMarketplaceFees } = await import('@/lib/marketplace/pricing')
    const result = calculateMarketplaceFees({ customer_price: 5000, commission_rate: 0.15 })
    expect(result.platform_fee).toBe(750)
    expect(result.provider_payout).toBe(4250)
  })

  it('handles custom commission rate', async () => {
    const { calculateMarketplaceFees } = await import('@/lib/marketplace/pricing')
    const result = calculateMarketplaceFees({ customer_price: 10000, commission_rate: 0.10 })
    expect(result.platform_fee).toBe(1000)
    expect(result.provider_payout).toBe(9000)
  })

  it('rounds to 2 decimal places', async () => {
    const { calculateMarketplaceFees } = await import('@/lib/marketplace/pricing')
    const result = calculateMarketplaceFees({ customer_price: 3333, commission_rate: 0.15 })
    expect(result.platform_fee).toBe(499.95)
    expect(result.provider_payout).toBe(2833.05)
  })

  it('throws if customer_price is zero or negative', async () => {
    const { calculateMarketplaceFees } = await import('@/lib/marketplace/pricing')
    expect(() => calculateMarketplaceFees({ customer_price: 0, commission_rate: 0.15 })).toThrow()
    expect(() => calculateMarketplaceFees({ customer_price: -100, commission_rate: 0.15 })).toThrow()
  })
})

// ─────────────────────────────────────────────
// Domain Logic: Provider Scoring
// ─────────────────────────────────────────────

describe('scoreProvider()', () => {
  it('scores a provider with full data', async () => {
    const { scoreProvider } = await import('@/lib/marketplace/matching')
    const score = scoreProvider(
      {
        rating: 5.0,
        total_jobs: 50,
        completed_jobs: 48,
        service_areas: ['Melbourne CBD', 'Southbank'],
        move_types: ['office', 'warehouse'],
      },
      {
        origin_suburb: 'Melbourne CBD',
        job_type: 'office',
        customer_price: 5000,
      }
    )
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(1)
  })

  it('gives lower score to provider not covering the job suburb', async () => {
    const { scoreProvider } = await import('@/lib/marketplace/matching')
    const scoreIn = scoreProvider(
      { rating: 4.5, total_jobs: 10, completed_jobs: 10, service_areas: ['Melbourne CBD'], move_types: ['office'] },
      { origin_suburb: 'Melbourne CBD', job_type: 'office', customer_price: 4000 }
    )
    const scoreOut = scoreProvider(
      { rating: 4.5, total_jobs: 10, completed_jobs: 10, service_areas: ['Geelong'], move_types: ['office'] },
      { origin_suburb: 'Melbourne CBD', job_type: 'office', customer_price: 4000 }
    )
    expect(scoreIn).toBeGreaterThan(scoreOut)
  })

  it('returns 0 for provider that does not cover the move_type', async () => {
    const { scoreProvider } = await import('@/lib/marketplace/matching')
    const score = scoreProvider(
      { rating: 5.0, total_jobs: 100, completed_jobs: 100, service_areas: ['Melbourne CBD'], move_types: ['warehouse'] },
      { origin_suburb: 'Melbourne CBD', job_type: 'datacenter', customer_price: 20000 }
    )
    expect(score).toBe(0)
  })
})

// ─────────────────────────────────────────────
// Type Guard Tests
// ─────────────────────────────────────────────

describe('Type guards', () => {
  it('MarketplaceJobStatus covers all expected values', () => {
    const validStatuses: MarketplaceJobStatus[] = [
      'draft', 'posted', 'matching', 'bidding', 'assigned', 'confirmed',
      'in_progress', 'completed', 'cancelled', 'disputed'
    ]
    expect(validStatuses).toHaveLength(10)
  })

  it('ProviderVerificationStatus covers expected values', () => {
    const statuses: ProviderVerificationStatus[] = ['pending', 'verified', 'suspended', 'rejected']
    expect(statuses).toHaveLength(4)
  })

  it('UserRole covers expected values', () => {
    const roles: UserRole[] = ['customer', 'provider_admin', 'driver', 'platform_admin']
    expect(roles).toHaveLength(4)
  })
})
