/**
 * Insurance Expiry Cron Tests
 * TDD: Tests written BEFORE implementation
 *
 * Covers:
 *  - GET /api/cron/check-insurance-expiry
 *    - Finds providers with expired insurance_expiry date
 *    - Sets is_active = false + verification_status = 'suspended'
 *    - Sends notification email to each suspended provider
 *    - Returns summary of providers suspended
 *    - Rejects requests without valid CRON_SECRET header
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─────────────────────────────────────────────
// Hoisted mocks
// ─────────────────────────────────────────────

const {
  mockSelectLte,
  mockSelect,
  mockUpdateIn,
  mockUpdateEq,
  mockUpdate,
  mockFrom,
  createClientMock,
  mockResendSend,
  mockResend,
} = vi.hoisted(() => {
  const mockSelectLte = vi.fn()
  const mockSelect = vi.fn(() => ({ lte: mockSelectLte }))

  const mockUpdateIn = vi.fn()
  const mockUpdateEq = vi.fn(() => ({ in: mockUpdateIn }))
  const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq, in: mockUpdateIn }))

  const mockFrom = vi.fn(() => ({ select: mockSelect, update: mockUpdate }))
  const createClientMock = vi.fn(() => ({ from: mockFrom }))

  const mockResendSend = vi.fn()
  const mockResend = { emails: { send: mockResendSend } }

  return {
    mockSelectLte,
    mockSelect,
    mockUpdateIn,
    mockUpdateEq,
    mockUpdate,
    mockFrom,
    createClientMock,
    mockResendSend,
    mockResend,
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}))

vi.mock('@/lib/email', () => ({
  resend: mockResend,
  EMAIL_FROM_ADDRESS: 'M&M Commercial Moving <notifications@m2mmoving.au>',
}))

vi.mock('server-only', () => ({}))

// ─────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────

const CRON_SECRET = 'test-cron-secret-abc'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('CRON_SECRET', CRON_SECRET)
})

describe('GET /api/cron/check-insurance-expiry', () => {
  it('suspends providers with expired insurance and returns summary', async () => {
    const expiredProviders = [
      { id: 'prov-1', company_name: 'Alpha Movers', email: 'alpha@movers.com.au', insurance_expiry: '2026-03-10' },
      { id: 'prov-2', company_name: 'Beta Logistics', email: 'beta@movers.com.au', insurance_expiry: '2026-03-12' },
    ]
    mockSelectLte.mockResolvedValue({ data: expiredProviders, error: null })
    mockUpdateIn.mockResolvedValue({ data: expiredProviders, error: null })
    mockResendSend.mockResolvedValue({ data: { id: 'email-1' }, error: null })

    const { GET } = await import('@/app/api/cron/check-insurance-expiry/route')
    const req = new NextRequest('http://localhost/api/cron/check-insurance-expiry', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    })

    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.suspended_count).toBe(2)
    expect(body.suspended_ids).toContain('prov-1')
    expect(body.suspended_ids).toContain('prov-2')
  })

  it('calls update with is_active=false and suspended status for expired providers', async () => {
    const expiredProviders = [
      { id: 'prov-1', company_name: 'Alpha Movers', email: 'alpha@movers.com.au', insurance_expiry: '2026-03-10' },
    ]
    mockSelectLte.mockResolvedValue({ data: expiredProviders, error: null })
    mockUpdateIn.mockResolvedValue({ data: expiredProviders, error: null })
    mockResendSend.mockResolvedValue({ data: { id: 'email-1' }, error: null })

    const { GET } = await import('@/app/api/cron/check-insurance-expiry/route')
    const req = new NextRequest('http://localhost/api/cron/check-insurance-expiry', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    })

    await GET(req)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        is_active: false,
        verification_status: 'suspended',
      })
    )
  })

  it('sends a notification email to each suspended provider', async () => {
    const expiredProviders = [
      { id: 'prov-1', company_name: 'Alpha Movers', email: 'alpha@movers.com.au', insurance_expiry: '2026-03-10' },
      { id: 'prov-2', company_name: 'Beta Logistics', email: 'beta@movers.com.au', insurance_expiry: '2026-03-12' },
    ]
    mockSelectLte.mockResolvedValue({ data: expiredProviders, error: null })
    mockUpdateIn.mockResolvedValue({ data: expiredProviders, error: null })
    mockResendSend.mockResolvedValue({ data: { id: 'email-1' }, error: null })

    const { GET } = await import('@/app/api/cron/check-insurance-expiry/route')
    const req = new NextRequest('http://localhost/api/cron/check-insurance-expiry', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    })

    await GET(req)
    expect(mockResendSend).toHaveBeenCalledTimes(2)
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'alpha@movers.com.au' })
    )
  })

  it('returns 200 with zero suspended when no expired providers found', async () => {
    mockSelectLte.mockResolvedValue({ data: [], error: null })

    const { GET } = await import('@/app/api/cron/check-insurance-expiry/route')
    const req = new NextRequest('http://localhost/api/cron/check-insurance-expiry', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    })

    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.suspended_count).toBe(0)
  })

  it('returns 401 when Authorization header is missing', async () => {
    const { GET } = await import('@/app/api/cron/check-insurance-expiry/route')
    const req = new NextRequest('http://localhost/api/cron/check-insurance-expiry')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when Authorization header has wrong secret', async () => {
    const { GET } = await import('@/app/api/cron/check-insurance-expiry/route')
    const req = new NextRequest('http://localhost/api/cron/check-insurance-expiry', {
      headers: { Authorization: 'Bearer wrong-secret' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 500 on database query error', async () => {
    mockSelectLte.mockResolvedValue({ data: null, error: { message: 'DB down' } })

    const { GET } = await import('@/app/api/cron/check-insurance-expiry/route')
    const req = new NextRequest('http://localhost/api/cron/check-insurance-expiry', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    })

    const res = await GET(req)
    expect(res.status).toBe(500)
  })
})
