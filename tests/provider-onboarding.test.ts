/**
 * Provider Onboarding Tests
 * Tests for provider registration API and Stripe Connect onboarding
 * Written BEFORE implementation (TDD Red phase)
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─────────────────────────────────────────────
// Mocks (vi.hoisted for cross-reference)
// ─────────────────────────────────────────────

const {
  mockInsert,
  mockInsertSelect,
  mockInsertSingle,
  mockSelect,
  mockEq,
  mockFrom,
  mockSingle,
  createClientMock,
  mockStripeAccountsCreate,
  mockStripeAccountLinksCreate,
  stripeMock,
} = vi.hoisted(() => {
  const mockInsertSingle = vi.fn()
  const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }))
  const mockInsert = vi.fn(() => ({ select: mockInsertSelect }))
  const mockEq = vi.fn()
  const mockSingle = vi.fn()
  const mockSelect = vi.fn(() => ({ eq: mockEq, single: mockSingle }))
  const mockFrom = vi.fn(() => ({ insert: mockInsert, select: mockSelect }))
  const createClientMock = vi.fn(() => ({ from: mockFrom }))

  const mockStripeAccountsCreate = vi.fn()
  const mockStripeAccountLinksCreate = vi.fn()
  const stripeMock = {
    accounts: {
      create: mockStripeAccountsCreate,
      retrieve: vi.fn(),
    },
    accountLinks: {
      create: mockStripeAccountLinksCreate,
    },
  }

  return {
    mockInsert,
    mockInsertSelect,
    mockInsertSingle,
    mockSelect,
    mockEq,
    mockFrom,
    mockSingle,
    createClientMock,
    mockStripeAccountsCreate,
    mockStripeAccountLinksCreate,
    stripeMock,
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}))

vi.mock('@/lib/stripe', () => ({
  stripe: stripeMock,
}))

vi.mock('server-only', () => ({}))

// ─────────────────────────────────────────────
// POST /api/providers/register
// ─────────────────────────────────────────────

describe('POST /api/providers/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers a new provider and returns 201 with provider data', async () => {
    const newProvider = {
      id: 'prov-uuid-1',
      company_name: 'Fast Movers Pty Ltd',
      email: 'ops@fastmovers.com.au',
      verification_status: 'pending',
      commission_rate: 0.15,
      created_at: new Date().toISOString(),
    }
    mockInsertSingle.mockResolvedValue({ data: newProvider, error: null })

    const { POST } = await import('@/app/api/providers/register/route')
    const req = new NextRequest('http://localhost/api/providers/register', {
      method: 'POST',
      body: JSON.stringify({
        company_name: 'Fast Movers Pty Ltd',
        email: 'ops@fastmovers.com.au',
        phone: '0398765432',
        service_areas: ['Melbourne CBD', 'Southbank'],
        move_types: ['office', 'warehouse'],
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data).toMatchObject({ company_name: 'Fast Movers Pty Ltd' })
    expect(mockFrom).toHaveBeenCalledWith('providers')
    expect(mockInsert).toHaveBeenCalled()
  })

  it('returns 400 for missing company_name', async () => {
    const { POST } = await import('@/app/api/providers/register/route')
    const req = new NextRequest('http://localhost/api/providers/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'ops@test.com' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns 400 for invalid email', async () => {
    const { POST } = await import('@/app/api/providers/register/route')
    const req = new NextRequest('http://localhost/api/providers/register', {
      method: 'POST',
      body: JSON.stringify({ company_name: 'Test Co', email: 'not-an-email' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 409 if email already exists', async () => {
    mockInsertSingle.mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    })

    const { POST } = await import('@/app/api/providers/register/route')
    const req = new NextRequest('http://localhost/api/providers/register', {
      method: 'POST',
      body: JSON.stringify({
        company_name: 'Test Co',
        email: 'existing@test.com',
        phone: '0400000000',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(409)
  })

  it('returns 500 for unexpected database errors', async () => {
    mockInsertSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST301', message: 'JWT expired' },
    })

    const { POST } = await import('@/app/api/providers/register/route')
    const req = new NextRequest('http://localhost/api/providers/register', {
      method: 'POST',
      body: JSON.stringify({
        company_name: 'Test Co',
        email: 'test@test.com',
        phone: '0400000000',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})

// ─────────────────────────────────────────────
// POST /api/stripe/connect/onboard
// ─────────────────────────────────────────────

describe('POST /api/stripe/connect/onboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a Stripe Connect Express account and returns onboarding URL', async () => {
    mockStripeAccountsCreate.mockResolvedValue({
      id: 'acct_test123',
      type: 'express',
    })
    mockStripeAccountLinksCreate.mockResolvedValue({
      url: 'https://connect.stripe.com/setup/s/test123',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    })

    // DB update: save stripe_account_id to provider
    const mockUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
    mockFrom.mockReturnValue({ update: mockUpdate, select: mockSelect })

    const { POST } = await import('@/app/api/stripe/connect/onboard/route')
    const req = new NextRequest('http://localhost/api/stripe/connect/onboard', {
      method: 'POST',
      body: JSON.stringify({
        provider_id: 'prov-uuid-1',
        email: 'ops@fastmovers.com.au',
        company_name: 'Fast Movers Pty Ltd',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.onboarding_url).toContain('connect.stripe.com')
    expect(body.stripe_account_id).toBe('acct_test123')
    expect(mockStripeAccountsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'express' })
    )
  })

  it('returns 400 if provider_id is missing', async () => {
    const { POST } = await import('@/app/api/stripe/connect/onboard/route')
    const req = new NextRequest('http://localhost/api/stripe/connect/onboard', {
      method: 'POST',
      body: JSON.stringify({ email: 'ops@test.com' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 500 if Stripe throws', async () => {
    mockStripeAccountsCreate.mockRejectedValue(new Error('Stripe API error'))

    const { POST } = await import('@/app/api/stripe/connect/onboard/route')
    const req = new NextRequest('http://localhost/api/stripe/connect/onboard', {
      method: 'POST',
      body: JSON.stringify({
        provider_id: 'prov-uuid-1',
        email: 'ops@fastmovers.com.au',
        company_name: 'Fast Movers Pty Ltd',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})

// ─────────────────────────────────────────────
// GET /api/providers/[id]
// ─────────────────────────────────────────────

describe('GET /api/providers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns provider data for a valid ID', async () => {
    const provider = {
      id: 'prov-uuid-1',
      company_name: 'Fast Movers Pty Ltd',
      email: 'ops@fastmovers.com.au',
      verification_status: 'verified',
      rating: 4.8,
    }
    mockEq.mockReturnValue({ single: vi.fn().mockResolvedValue({ data: provider, error: null }) })
    mockFrom.mockReturnValue({ select: mockSelect })

    const { GET } = await import('@/app/api/providers/[id]/route')
    const req = new NextRequest('http://localhost/api/providers/prov-uuid-1')
    const res = await GET(req, { params: Promise.resolve({ id: 'prov-uuid-1' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.company_name).toBe('Fast Movers Pty Ltd')
  })

  it('returns 404 for unknown provider', async () => {
    mockEq.mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } }),
    })
    mockFrom.mockReturnValue({ select: mockSelect })

    const { GET } = await import('@/app/api/providers/[id]/route')
    const req = new NextRequest('http://localhost/api/providers/unknown-id')
    const res = await GET(req, { params: Promise.resolve({ id: 'unknown-id' }) })

    expect(res.status).toBe(404)
  })
})
