/**
 * Job Accept / Decline API Tests
 * TDD: Tests written BEFORE implementation
 *
 * Covers:
 *  - POST /api/marketplace/jobs/[id]/accept
 *  - POST /api/marketplace/jobs/[id]/decline
 *
 * Business rules:
 *  - Provider has 10 minutes from offer_sent_at to accept
 *  - If window has expired → 409 Conflict
 *  - Declining re-triggers DISPATCH to find next provider
 *  - Only the assigned/offered provider may accept or decline
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─────────────────────────────────────────────
// Hoisted mocks
// ─────────────────────────────────────────────

const {
  mockUpdate,
  mockUpdateEq,
  mockSelectSingle,
  mockSelectEq,
  mockFrom,
  createClientMock,
  mockGetUser,
  mockDispatchHandle,
} = vi.hoisted(() => {
  const mockUpdateEq = vi.fn()
  const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

  const mockSelectSingle = vi.fn()
  const mockSelectEq = vi.fn(() => ({ single: mockSelectSingle }))
  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => ({ eq: mockSelectEq })),
    update: mockUpdate,
  }))
  const createClientMock = vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: vi.fn() },
  }))

  const mockGetUser = vi.fn()

  const mockDispatchHandle = vi.fn()

  return {
    mockUpdate,
    mockUpdateEq,
    mockSelectSingle,
    mockSelectEq,
    mockFrom,
    createClientMock,
    mockGetUser,
    mockDispatchHandle,
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}))

vi.mock('server-only', () => ({}))

// ─────────────────────────────────────────────
// Helper: build a job fixture
// ─────────────────────────────────────────────

const OFFER_WINDOW_MS = 10 * 60 * 1000 // 10 minutes

function makeJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 'job-123',
    status: 'assigned',
    assigned_provider_id: 'prov-uuid-1',
    offer_sent_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 min ago (within window)
    ...overrides,
  }
}

// ─────────────────────────────────────────────
// POST /api/marketplace/jobs/[id]/accept
// ─────────────────────────────────────────────

describe('POST /api/marketplace/jobs/[id]/accept', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateEq.mockResolvedValue({ data: { id: 'job-123', status: 'confirmed' }, error: null })
  })

  it('accepts a job within the offer window and sets status to confirmed', async () => {
    mockSelectSingle.mockResolvedValue({ data: makeJob(), error: null })

    const { POST } = await import('@/app/api/marketplace/jobs/[id]/accept/route')
    const req = new NextRequest('http://localhost/api/marketplace/jobs/job-123/accept', {
      method: 'POST',
      body: JSON.stringify({ provider_id: 'prov-uuid-1' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'job-123' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('confirmed')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'confirmed', accepted_at: expect.any(String) })
    )
  })

  it('returns 409 when the offer window has expired', async () => {
    const expiredJob = makeJob({
      offer_sent_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 min ago
    })
    mockSelectSingle.mockResolvedValue({ data: expiredJob, error: null })

    const { POST } = await import('@/app/api/marketplace/jobs/[id]/accept/route')
    const req = new NextRequest('http://localhost/api/marketplace/jobs/job-123/accept', {
      method: 'POST',
      body: JSON.stringify({ provider_id: 'prov-uuid-1' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'job-123' }) })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/expired/i)
  })

  it('returns 403 when provider_id does not match assigned provider', async () => {
    mockSelectSingle.mockResolvedValue({ data: makeJob(), error: null })

    const { POST } = await import('@/app/api/marketplace/jobs/[id]/accept/route')
    const req = new NextRequest('http://localhost/api/marketplace/jobs/job-123/accept', {
      method: 'POST',
      body: JSON.stringify({ provider_id: 'other-provider' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'job-123' }) })
    expect(res.status).toBe(403)
  })

  it('returns 404 when job does not exist', async () => {
    mockSelectSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

    const { POST } = await import('@/app/api/marketplace/jobs/[id]/accept/route')
    const req = new NextRequest('http://localhost/api/marketplace/jobs/unknown/accept', {
      method: 'POST',
      body: JSON.stringify({ provider_id: 'prov-uuid-1' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'unknown' }) })
    expect(res.status).toBe(404)
  })

  it('returns 400 when provider_id is missing', async () => {
    const { POST } = await import('@/app/api/marketplace/jobs/[id]/accept/route')
    const req = new NextRequest('http://localhost/api/marketplace/jobs/job-123/accept', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'job-123' }) })
    expect(res.status).toBe(400)
  })
})

// ─────────────────────────────────────────────
// POST /api/marketplace/jobs/[id]/decline
// ─────────────────────────────────────────────

describe('POST /api/marketplace/jobs/[id]/decline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateEq.mockResolvedValue({ data: { id: 'job-123', status: 'pending' }, error: null })
  })

  it('declines a job and resets status to pending for re-dispatch', async () => {
    mockSelectSingle.mockResolvedValue({ data: makeJob(), error: null })

    const { POST } = await import('@/app/api/marketplace/jobs/[id]/decline/route')
    const req = new NextRequest('http://localhost/api/marketplace/jobs/job-123/decline', {
      method: 'POST',
      body: JSON.stringify({ provider_id: 'prov-uuid-1', reason: 'Capacity full' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'job-123' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.re_dispatched).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending',
        assigned_provider_id: null,
        assigned_at: null,
        offer_sent_at: null,
      })
    )
  })

  it('returns 403 when provider_id does not match assigned provider', async () => {
    mockSelectSingle.mockResolvedValue({ data: makeJob(), error: null })

    const { POST } = await import('@/app/api/marketplace/jobs/[id]/decline/route')
    const req = new NextRequest('http://localhost/api/marketplace/jobs/job-123/decline', {
      method: 'POST',
      body: JSON.stringify({ provider_id: 'someone-else' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'job-123' }) })
    expect(res.status).toBe(403)
  })

  it('returns 404 when job does not exist', async () => {
    mockSelectSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

    const { POST } = await import('@/app/api/marketplace/jobs/[id]/decline/route')
    const req = new NextRequest('http://localhost/api/marketplace/jobs/unknown/decline', {
      method: 'POST',
      body: JSON.stringify({ provider_id: 'prov-uuid-1' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'unknown' }) })
    expect(res.status).toBe(404)
  })

  it('returns 400 when provider_id is missing', async () => {
    const { POST } = await import('@/app/api/marketplace/jobs/[id]/decline/route')
    const req = new NextRequest('http://localhost/api/marketplace/jobs/job-123/decline', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'job-123' }) })
    expect(res.status).toBe(400)
  })
})
