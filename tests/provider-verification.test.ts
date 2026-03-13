/**
 * Provider Verification Tests
 * TDD: Tests written BEFORE implementation
 *
 * Covers:
 *  - POST /api/providers/[id]/verify  (approve / reject with notes)
 *  - GET  /api/providers              (admin list with filters)
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─────────────────────────────────────────────
// Hoisted mocks
// ─────────────────────────────────────────────

const {
  mockUpdate,
  mockUpdateEq,
  mockSelect,
  mockSelectEq,
  mockSelectEqOrder,
  mockSingle,
  mockFrom,
  createClientMock,
  mockGetUser,
  supabaseAuthMock,
} = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockSelectEqOrder = vi.fn()
  const mockSelectEq = vi.fn(() => ({ order: mockSelectEqOrder, single: mockSingle }))
  const mockSelect = vi.fn(() => ({ eq: mockSelectEq, order: mockSelectEqOrder, single: mockSingle }))

  const mockUpdateEq = vi.fn()
  const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

  const mockFrom = vi.fn(() => ({ select: mockSelect, update: mockUpdate }))

  const mockGetUser = vi.fn()
  const supabaseAuthMock = { getUser: mockGetUser }

  const createClientMock = vi.fn(() => ({
    from: mockFrom,
    auth: supabaseAuthMock,
  }))

  return {
    mockUpdate,
    mockUpdateEq,
    mockSelect,
    mockSelectEq,
    mockSelectEqOrder,
    mockSingle,
    mockFrom,
    createClientMock,
    mockGetUser,
    supabaseAuthMock,
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}))

vi.mock('server-only', () => ({}))

// ─────────────────────────────────────────────
// POST /api/providers/[id]/verify
// ─────────────────────────────────────────────

describe('POST /api/providers/[id]/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: admin user is authenticated
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'admin-uuid', email: 'admin@m2mmoving.com.au' } },
      error: null,
    })
    // Default: update succeeds
    mockUpdateEq.mockResolvedValue({
      data: { id: 'prov-uuid-1', verification_status: 'verified' },
      error: null,
    })
  })

  it('approves a provider and sets verification_status to verified', async () => {
    const { POST } = await import('@/app/api/providers/[id]/verify/route')
    const req = new NextRequest('http://localhost/api/providers/prov-uuid-1/verify', {
      method: 'POST',
      body: JSON.stringify({ action: 'approve' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'prov-uuid-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.verification_status).toBe('verified')
    expect(mockFrom).toHaveBeenCalledWith('providers')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ verification_status: 'verified' })
    )
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'prov-uuid-1')
  })

  it('rejects a provider and sets verification_status to rejected', async () => {
    mockUpdateEq.mockResolvedValue({
      data: { id: 'prov-uuid-2', verification_status: 'rejected' },
      error: null,
    })

    const { POST } = await import('@/app/api/providers/[id]/verify/route')
    const req = new NextRequest('http://localhost/api/providers/prov-uuid-2/verify', {
      method: 'POST',
      body: JSON.stringify({ action: 'reject', notes: 'Insurance documents expired.' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'prov-uuid-2' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.verification_status).toBe('rejected')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        verification_status: 'rejected',
        rejection_notes: 'Insurance documents expired.',
      })
    )
  })

  it('stores rejection notes when rejecting', async () => {
    mockUpdateEq.mockResolvedValue({
      data: { id: 'prov-uuid-3', verification_status: 'rejected', rejection_notes: 'Missing ABN.' },
      error: null,
    })

    const { POST } = await import('@/app/api/providers/[id]/verify/route')
    const req = new NextRequest('http://localhost/api/providers/prov-uuid-3/verify', {
      method: 'POST',
      body: JSON.stringify({ action: 'reject', notes: 'Missing ABN.' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'prov-uuid-3' }) })
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ rejection_notes: 'Missing ABN.' })
    )
  })

  it('returns 400 for an invalid action value', async () => {
    const { POST } = await import('@/app/api/providers/[id]/verify/route')
    const req = new NextRequest('http://localhost/api/providers/prov-uuid-1/verify', {
      method: 'POST',
      body: JSON.stringify({ action: 'delete' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'prov-uuid-1' }) })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns 400 if action is missing from body', async () => {
    const { POST } = await import('@/app/api/providers/[id]/verify/route')
    const req = new NextRequest('http://localhost/api/providers/prov-uuid-1/verify', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'prov-uuid-1' }) })
    expect(res.status).toBe(400)
  })

  it('returns 401 when no authenticated user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const { POST } = await import('@/app/api/providers/[id]/verify/route')
    const req = new NextRequest('http://localhost/api/providers/prov-uuid-1/verify', {
      method: 'POST',
      body: JSON.stringify({ action: 'approve' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'prov-uuid-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 500 when database update fails', async () => {
    mockUpdateEq.mockResolvedValue({
      data: null,
      error: { message: 'DB error', code: 'PGRST301' },
    })

    const { POST } = await import('@/app/api/providers/[id]/verify/route')
    const req = new NextRequest('http://localhost/api/providers/prov-uuid-1/verify', {
      method: 'POST',
      body: JSON.stringify({ action: 'approve' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'prov-uuid-1' }) })
    expect(res.status).toBe(500)
  })

  it('sets verified_at timestamp when approving', async () => {
    mockUpdateEq.mockResolvedValue({
      data: { id: 'prov-uuid-1', verification_status: 'verified', verified_at: new Date().toISOString() },
      error: null,
    })

    const { POST } = await import('@/app/api/providers/[id]/verify/route')
    const req = new NextRequest('http://localhost/api/providers/prov-uuid-1/verify', {
      method: 'POST',
      body: JSON.stringify({ action: 'approve' }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(req, { params: Promise.resolve({ id: 'prov-uuid-1' }) })
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ verified_at: expect.any(String) })
    )
  })
})

// ─────────────────────────────────────────────
// GET /api/providers  (admin list)
// ─────────────────────────────────────────────

describe('GET /api/providers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'admin-uuid', email: 'admin@m2mmoving.com.au' } },
      error: null,
    })
  })

  it('returns all providers sorted by created_at desc', async () => {
    const providers = [
      { id: 'prov-1', company_name: 'Alpha Movers', verification_status: 'pending', created_at: '2026-03-12T00:00:00Z' },
      { id: 'prov-2', company_name: 'Beta Logistics', verification_status: 'verified', created_at: '2026-03-10T00:00:00Z' },
    ]
    mockSelectEqOrder.mockResolvedValue({ data: providers, error: null })
    // When no status filter, select goes straight to order
    mockSelect.mockReturnValue({ eq: mockSelectEq, order: mockSelectEqOrder })

    const { GET } = await import('@/app/api/providers/route')
    const req = new NextRequest('http://localhost/api/providers')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(2)
    expect(body.data[0].company_name).toBe('Alpha Movers')
  })

  it('filters by verification_status when query param provided', async () => {
    const pendingProviders = [
      { id: 'prov-1', company_name: 'Alpha Movers', verification_status: 'pending' },
    ]
    mockSelectEqOrder.mockResolvedValue({ data: pendingProviders, error: null })
    mockSelectEq.mockReturnValue({ order: mockSelectEqOrder })

    const { GET } = await import('@/app/api/providers/route')
    const req = new NextRequest('http://localhost/api/providers?status=pending')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(mockSelectEq).toHaveBeenCalledWith('verification_status', 'pending')
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { GET } = await import('@/app/api/providers/route')
    const req = new NextRequest('http://localhost/api/providers')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 500 on database error', async () => {
    mockSelectEqOrder.mockResolvedValue({ data: null, error: { message: 'DB down' } })
    mockSelect.mockReturnValue({ eq: mockSelectEq, order: mockSelectEqOrder })

    const { GET } = await import('@/app/api/providers/route')
    const req = new NextRequest('http://localhost/api/providers')
    const res = await GET(req)
    expect(res.status).toBe(500)
  })
})
