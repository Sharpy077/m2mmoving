/**
 * Marketplace Job Flow Tests
 * Tests for job creation, matching, bidding, status transitions
 * Written BEFORE implementation (TDD Red phase)
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────

const {
  mockInsert,
  mockInsertSelect,
  mockInsertSingle,
  mockUpdate,
  mockUpdateEq,
  mockUpdateSelect,
  mockUpdateSingle,
  mockSelect,
  mockSelectEq,
  mockSelectSingle,
  mockFrom,
  createClientMock,
} = vi.hoisted(() => {
  const mockInsertSingle = vi.fn()
  const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }))
  const mockInsert = vi.fn(() => ({ select: mockInsertSelect }))

  const mockUpdateSingle = vi.fn()
  const mockUpdateSelect = vi.fn(() => ({ single: mockUpdateSingle }))
  const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelect }))
  const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

  const mockSelectSingle = vi.fn()
  const mockSelectEq = vi.fn(() => ({ single: mockSelectSingle }))
  const mockSelect = vi.fn(() => ({ eq: mockSelectEq }))

  const mockFrom = vi.fn(() => ({
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
  }))
  const createClientMock = vi.fn(() => ({ from: mockFrom }))

  return {
    mockInsert,
    mockInsertSelect,
    mockInsertSingle,
    mockUpdate,
    mockUpdateEq,
    mockUpdateSelect,
    mockUpdateSingle,
    mockSelect,
    mockSelectEq,
    mockSelectSingle,
    mockFrom,
    createClientMock,
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}))

vi.mock('server-only', () => ({}))

// ─────────────────────────────────────────────
// POST /api/marketplace/jobs — Create job
// ─────────────────────────────────────────────

describe('POST /api/marketplace/jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a marketplace job and returns 201', async () => {
    const newJob = {
      id: 'job-uuid-1',
      job_type: 'office',
      status: 'posted',
      matching_mode: 'instant',
      origin_suburb: 'Melbourne CBD',
      destination_suburb: 'Southbank',
      scheduled_date: '2026-04-15',
      customer_price: 5000,
      platform_fee_pct: 0.15,
      payment_status: 'unpaid',
    }
    mockInsertSingle.mockResolvedValue({ data: newJob, error: null })

    const { POST } = await import('@/app/api/marketplace/jobs/route')
    const req = new NextRequest('http://localhost/api/marketplace/jobs', {
      method: 'POST',
      body: JSON.stringify({
        job_type: 'office',
        origin_suburb: 'Melbourne CBD',
        destination_suburb: 'Southbank',
        scheduled_date: '2026-04-15',
        square_meters: 150,
        customer_price: 5000,
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.job_type).toBe('office')
    expect(body.data.status).toBe('posted')
    expect(mockInsert).toHaveBeenCalled()
  })

  it('sets matching_mode to instant for small office job', async () => {
    mockInsertSingle.mockResolvedValue({
      data: { id: 'job-2', matching_mode: 'instant', status: 'posted' },
      error: null,
    })

    const { POST } = await import('@/app/api/marketplace/jobs/route')
    const req = new NextRequest('http://localhost/api/marketplace/jobs', {
      method: 'POST',
      body: JSON.stringify({
        job_type: 'office',
        origin_suburb: 'Melbourne CBD',
        destination_suburb: 'Southbank',
        scheduled_date: '2026-04-15',
        square_meters: 100,
        customer_price: 3000,
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    // Verify insert was called with instant matching_mode
    const insertCall = mockInsert.mock.calls[0][0]
    expect(insertCall.matching_mode).toBe('instant')
  })

  it('sets matching_mode to bidding for datacenter job', async () => {
    mockInsertSingle.mockResolvedValue({
      data: { id: 'job-3', matching_mode: 'bidding', status: 'posted' },
      error: null,
    })

    const { POST } = await import('@/app/api/marketplace/jobs/route')
    const req = new NextRequest('http://localhost/api/marketplace/jobs', {
      method: 'POST',
      body: JSON.stringify({
        job_type: 'datacenter',
        origin_suburb: 'Docklands',
        destination_suburb: 'Southbank',
        scheduled_date: '2026-04-15',
        square_meters: 200,
        customer_price: 25000,
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    const insertCall = mockInsert.mock.calls[0][0]
    expect(insertCall.matching_mode).toBe('bidding')
  })

  it('calculates provider_payout and platform_fee from customer_price', async () => {
    mockInsertSingle.mockResolvedValue({
      data: { id: 'job-4', customer_price: 5000, platform_fee: 750, provider_payout: 4250 },
      error: null,
    })

    const { POST } = await import('@/app/api/marketplace/jobs/route')
    const req = new NextRequest('http://localhost/api/marketplace/jobs', {
      method: 'POST',
      body: JSON.stringify({
        job_type: 'office',
        origin_suburb: 'Fitzroy',
        destination_suburb: 'Richmond',
        scheduled_date: '2026-04-20',
        customer_price: 5000,
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(req)
    const insertCall = mockInsert.mock.calls[0][0]
    expect(insertCall.platform_fee).toBe(750) // 15% of 5000
    expect(insertCall.provider_payout).toBe(4250) // 85% of 5000
  })

  it('returns 400 for missing required fields', async () => {
    const { POST } = await import('@/app/api/marketplace/jobs/route')
    const req = new NextRequest('http://localhost/api/marketplace/jobs', {
      method: 'POST',
      body: JSON.stringify({ job_type: 'office' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

// ─────────────────────────────────────────────
// GET /api/marketplace/jobs — List posted jobs
// ─────────────────────────────────────────────

describe('GET /api/marketplace/jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns list of posted jobs', async () => {
    const jobs = [
      { id: 'job-1', status: 'posted', job_type: 'office' },
      { id: 'job-2', status: 'bidding', job_type: 'warehouse' },
    ]
    const mockOrder = vi.fn(() => ({ data: jobs, error: null }))
    const mockStatusEq = vi.fn(() => ({ order: mockOrder }))
    const mockInFilter = vi.fn(() => ({ order: mockOrder }))
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({ in: mockInFilter })),
    })

    const { GET } = await import('@/app/api/marketplace/jobs/route')
    const req = new NextRequest('http://localhost/api/marketplace/jobs')

    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toBeDefined()
  })
})

// ─────────────────────────────────────────────
// POST /api/marketplace/jobs/[id]/bid
// ─────────────────────────────────────────────

describe('POST /api/marketplace/jobs/[id]/bid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Restore default mockFrom (may have been overridden by GET test)
    mockFrom.mockReturnValue({ insert: mockInsert, update: mockUpdate, select: mockSelect })
  })

  it('creates a bid and returns 201', async () => {
    const newBid = {
      id: 'bid-uuid-1',
      job_id: 'job-1',
      provider_id: 'prov-1',
      bid_amount: 4500,
      status: 'pending',
    }
    mockInsertSingle.mockResolvedValue({ data: newBid, error: null })

    const { POST } = await import('@/app/api/marketplace/jobs/[id]/bid/route')
    const req = new NextRequest('http://localhost/api/marketplace/jobs/job-1/bid', {
      method: 'POST',
      body: JSON.stringify({
        provider_id: 'prov-1',
        bid_amount: 4500,
        crew_size: 3,
        estimated_duration_hours: 8,
        message: 'Experienced CBD office movers available.',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'job-1' }) })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.bid_amount).toBe(4500)
  })

  it('returns 400 for zero bid_amount', async () => {
    const { POST } = await import('@/app/api/marketplace/jobs/[id]/bid/route')
    const req = new NextRequest('http://localhost/api/marketplace/jobs/job-1/bid', {
      method: 'POST',
      body: JSON.stringify({ provider_id: 'prov-1', bid_amount: 0 }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'job-1' }) })
    expect(res.status).toBe(400)
  })

  it('returns 409 for duplicate bid from same provider', async () => {
    mockInsertSingle.mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key violates unique constraint' },
    })

    const { POST } = await import('@/app/api/marketplace/jobs/[id]/bid/route')
    const req = new NextRequest('http://localhost/api/marketplace/jobs/job-1/bid', {
      method: 'POST',
      body: JSON.stringify({ provider_id: 'prov-1', bid_amount: 4000 }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'job-1' }) })
    expect(res.status).toBe(409)
  })
})

// ─────────────────────────────────────────────
// PATCH /api/marketplace/jobs/[id]/status
// ─────────────────────────────────────────────

describe('PATCH /api/marketplace/jobs/[id]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ insert: mockInsert, update: mockUpdate, select: mockSelect })
  })

  it('updates job status to in_progress', async () => {
    mockUpdateSingle.mockResolvedValue({
      data: { id: 'job-1', status: 'in_progress' },
      error: null,
    })

    const { PATCH } = await import('@/app/api/marketplace/jobs/[id]/status/route')
    const req = new NextRequest('http://localhost/api/marketplace/jobs/job-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'in_progress' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: 'job-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.status).toBe('in_progress')
  })

  it('rejects invalid status value', async () => {
    const { PATCH } = await import('@/app/api/marketplace/jobs/[id]/status/route')
    const req = new NextRequest('http://localhost/api/marketplace/jobs/job-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'flying' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: 'job-1' }) })
    expect(res.status).toBe(400)
  })
})

// ─────────────────────────────────────────────
// POST /api/marketplace/jobs/[id]/rate
// ─────────────────────────────────────────────

describe('POST /api/marketplace/jobs/[id]/rate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ insert: mockInsert, update: mockUpdate, select: mockSelect })
  })

  it('saves customer rating and triggers payout', async () => {
    mockUpdateSingle.mockResolvedValue({
      data: { id: 'job-1', status: 'completed', customer_rating: 5, payment_status: 'released' },
      error: null,
    })

    const { POST } = await import('@/app/api/marketplace/jobs/[id]/rate/route')
    const req = new NextRequest('http://localhost/api/marketplace/jobs/job-1/rate', {
      method: 'POST',
      body: JSON.stringify({
        rater: 'customer',
        rating: 5,
        review: 'Outstanding service, highly professional team.',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'job-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.customer_rating).toBe(5)
  })

  it('rejects rating out of 1-5 range', async () => {
    const { POST } = await import('@/app/api/marketplace/jobs/[id]/rate/route')
    const req = new NextRequest('http://localhost/api/marketplace/jobs/job-1/rate', {
      method: 'POST',
      body: JSON.stringify({ rater: 'customer', rating: 6 }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'job-1' }) })
    expect(res.status).toBe(400)
  })
})
