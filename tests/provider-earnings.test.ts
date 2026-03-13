/**
 * Provider Earnings Dashboard Tests
 * TDD: Tests written BEFORE implementation
 *
 * Covers:
 *  - GET /api/providers/[id]/earnings   (earnings summary + payout history)
 *  - lib/marketplace/earnings.ts        (earnings calculation logic)
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─────────────────────────────────────────────
// Earnings calculation unit tests (no mocks needed)
// ─────────────────────────────────────────────

describe('calculateProviderEarnings()', () => {
  it('sums completed job payouts correctly', async () => {
    const { calculateProviderEarnings } = await import('@/lib/marketplace/earnings')
    const result = calculateProviderEarnings([
      { provider_payout: 2380, status: 'released' },
      { provider_payout: 4250, status: 'released' },
      { provider_payout: 1190, status: 'pending' },
    ])
    expect(result.total_released).toBe(6630)
    expect(result.total_pending).toBe(1190)
    expect(result.total_earned).toBe(7820)
  })

  it('returns zeros when no payouts exist', async () => {
    const { calculateProviderEarnings } = await import('@/lib/marketplace/earnings')
    const result = calculateProviderEarnings([])
    expect(result.total_released).toBe(0)
    expect(result.total_pending).toBe(0)
    expect(result.total_earned).toBe(0)
  })

  it('counts jobs correctly', async () => {
    const { calculateProviderEarnings } = await import('@/lib/marketplace/earnings')
    const result = calculateProviderEarnings([
      { provider_payout: 2380, status: 'released' },
      { provider_payout: 4250, status: 'released' },
      { provider_payout: 1190, status: 'pending' },
    ])
    expect(result.jobs_completed).toBe(2)
    expect(result.jobs_pending_payment).toBe(1)
  })
})

describe('getCommissionTier()', () => {
  it('returns 15% tier for 0-10 jobs/month', async () => {
    const { getCommissionTier } = await import('@/lib/marketplace/earnings')
    expect(getCommissionTier(0)).toEqual({ label: 'Standard', rate: 0.15, min_jobs: 0, max_jobs: 10 })
    expect(getCommissionTier(10)).toEqual({ label: 'Standard', rate: 0.15, min_jobs: 0, max_jobs: 10 })
  })

  it('returns 12% tier for 11-25 jobs/month', async () => {
    const { getCommissionTier } = await import('@/lib/marketplace/earnings')
    expect(getCommissionTier(11)).toEqual({ label: 'Growth', rate: 0.12, min_jobs: 11, max_jobs: 25 })
    expect(getCommissionTier(25)).toEqual({ label: 'Growth', rate: 0.12, min_jobs: 11, max_jobs: 25 })
  })

  it('returns 10% tier for 26+ jobs/month', async () => {
    const { getCommissionTier } = await import('@/lib/marketplace/earnings')
    expect(getCommissionTier(26)).toEqual({ label: 'Pro', rate: 0.10, min_jobs: 26, max_jobs: null })
    expect(getCommissionTier(100)).toEqual({ label: 'Pro', rate: 0.10, min_jobs: 26, max_jobs: null })
  })
})

describe('calculateEarningsSimulation()', () => {
  it('returns estimated monthly take-home for given job count and avg value', async () => {
    const { calculateEarningsSimulation } = await import('@/lib/marketplace/earnings')
    // 12 jobs × $2800 avg = $33,600 gross; tier = Growth (12%) → commission = $4,032; take-home = $29,568
    const result = calculateEarningsSimulation({ jobs_per_month: 12, avg_job_value: 2800 })
    expect(result.gross_revenue).toBe(33600)
    expect(result.commission_rate).toBe(0.12)
    expect(result.platform_fee).toBe(4032)
    expect(result.take_home).toBe(29568)
    expect(result.tier.label).toBe('Growth')
  })

  it('returns Standard tier simulation for low volume', async () => {
    const { calculateEarningsSimulation } = await import('@/lib/marketplace/earnings')
    // 5 jobs × $3000 = $15,000; 15% → $2,250 fee; $12,750 take-home
    const result = calculateEarningsSimulation({ jobs_per_month: 5, avg_job_value: 3000 })
    expect(result.gross_revenue).toBe(15000)
    expect(result.commission_rate).toBe(0.15)
    expect(result.take_home).toBe(12750)
  })
})

// ─────────────────────────────────────────────
// Hoisted mocks for API tests
// ─────────────────────────────────────────────

const {
  mockSelectFilter,
  mockSelectEq,
  mockSingle,
  mockFrom,
  createClientMock,
  mockGetUser,
} = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockSelectEq = vi.fn(() => ({ single: mockSingle }))
  const mockSelectFilter = vi.fn(() => ({ eq: mockSelectEq }))
  const mockFrom = vi.fn(() => ({
    select: mockSelectFilter,
  }))
  const mockGetUser = vi.fn()
  const createClientMock = vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  }))

  return { mockSelectFilter, mockSelectEq, mockSingle, mockFrom, createClientMock, mockGetUser }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}))

vi.mock('server-only', () => ({}))

// ─────────────────────────────────────────────
// GET /api/providers/[id]/earnings
// ─────────────────────────────────────────────

describe('GET /api/providers/[id]/earnings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'prov-user-1' } },
      error: null,
    })
  })

  it('returns earnings summary and payout list', async () => {
    const payouts = [
      { id: 'pay-1', provider_payout: 2380, platform_fee: 420, status: 'released', created_at: '2026-03-01T00:00:00Z' },
      { id: 'pay-2', provider_payout: 4250, platform_fee: 750, status: 'released', created_at: '2026-03-05T00:00:00Z' },
    ]
    mockSelectEq.mockReturnValue({ data: payouts, error: null })
    mockSelectFilter.mockReturnValue({ eq: mockSelectEq })

    const { GET } = await import('@/app/api/providers/[id]/earnings/route')
    const req = new NextRequest('http://localhost/api/providers/prov-uuid-1/earnings')
    const res = await GET(req, { params: Promise.resolve({ id: 'prov-uuid-1' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.payouts).toHaveLength(2)
    expect(body.summary.total_released).toBe(6630)
    expect(body.summary.total_earned).toBe(6630)
    expect(body.summary.jobs_completed).toBe(2)
  })

  it('returns empty summary when no payouts exist', async () => {
    mockSelectEq.mockReturnValue({ data: [], error: null })
    mockSelectFilter.mockReturnValue({ eq: mockSelectEq })

    const { GET } = await import('@/app/api/providers/[id]/earnings/route')
    const req = new NextRequest('http://localhost/api/providers/prov-uuid-1/earnings')
    const res = await GET(req, { params: Promise.resolve({ id: 'prov-uuid-1' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.summary.total_earned).toBe(0)
    expect(body.payouts).toHaveLength(0)
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { GET } = await import('@/app/api/providers/[id]/earnings/route')
    const req = new NextRequest('http://localhost/api/providers/prov-uuid-1/earnings')
    const res = await GET(req, { params: Promise.resolve({ id: 'prov-uuid-1' }) })

    expect(res.status).toBe(401)
  })

  it('returns 500 on database error', async () => {
    mockSelectEq.mockReturnValue({ data: null, error: { message: 'DB error' } })
    mockSelectFilter.mockReturnValue({ eq: mockSelectEq })

    const { GET } = await import('@/app/api/providers/[id]/earnings/route')
    const req = new NextRequest('http://localhost/api/providers/prov-uuid-1/earnings')
    const res = await GET(req, { params: Promise.resolve({ id: 'prov-uuid-1' }) })

    expect(res.status).toBe(500)
  })
})
