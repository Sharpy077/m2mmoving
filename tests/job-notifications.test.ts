/**
 * Job Notification System Tests
 * TDD: Tests written BEFORE implementation
 *
 * Covers:
 *  - POST /api/providers/[id]/notify  (send SMS + email for a matched job)
 *  - lib/marketplace/notifications.ts (notification builder logic)
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─────────────────────────────────────────────
// Hoisted mocks
// ─────────────────────────────────────────────

const {
  mockSendSMS,
  mockResendSend,
  mockResend,
  mockSelectEq,
  mockSingle,
  mockFrom,
  createClientMock,
} = vi.hoisted(() => {
  const mockSendSMS = vi.fn()

  const mockResendSend = vi.fn()
  const mockResend = { emails: { send: mockResendSend } }

  const mockSingle = vi.fn()
  const mockSelectEq = vi.fn(() => ({ single: mockSingle }))
  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => ({ eq: mockSelectEq, single: mockSingle })),
  }))
  const createClientMock = vi.fn(() => ({ from: mockFrom }))

  return {
    mockSendSMS,
    mockResendSend,
    mockResend,
    mockSelectEq,
    mockSingle,
    mockFrom,
    createClientMock,
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}))

vi.mock('@/lib/twilio', () => ({
  sendSMS: mockSendSMS,
  formatAustralianNumber: (n: string) => n,
}))

vi.mock('@/lib/email', () => ({
  resend: mockResend,
  EMAIL_FROM_ADDRESS: 'M&M Commercial Moving <notifications@m2mmoving.au>',
}))

vi.mock('server-only', () => ({}))

// ─────────────────────────────────────────────
// Notification builder unit tests
// ─────────────────────────────────────────────

describe('buildJobNotificationSMS()', () => {
  it('formats an SMS with job details', async () => {
    const { buildJobNotificationSMS } = await import('@/lib/marketplace/notifications')
    const sms = buildJobNotificationSMS({
      provider_name: 'Fast Movers',
      job_id: 'job-123',
      job_type: 'office',
      suburb: 'Melbourne CBD',
      scheduled_date: '2026-04-01',
      customer_price: 2800,
      matching_mode: 'instant',
    })
    expect(sms).toContain('job-123')
    expect(sms).toContain('Melbourne CBD')
    expect(sms).toContain('2026-04-01')
    expect(sms).toContain('$2,800')
    expect(sms).toContain('instant')
  })

  it('includes bid deadline for bidding mode jobs', async () => {
    const { buildJobNotificationSMS } = await import('@/lib/marketplace/notifications')
    const sms = buildJobNotificationSMS({
      provider_name: 'Fast Movers',
      job_id: 'job-456',
      job_type: 'datacenter',
      suburb: 'Docklands',
      scheduled_date: '2026-04-05',
      customer_price: 15000,
      matching_mode: 'bidding',
      bid_deadline: '2026-04-03T17:00:00Z',
    })
    expect(sms).toContain('bid')
    expect(sms).toContain('2026-04-03')
  })
})

describe('buildJobNotificationEmail()', () => {
  it('builds an email object with subject and html body', async () => {
    const { buildJobNotificationEmail } = await import('@/lib/marketplace/notifications')
    const email = buildJobNotificationEmail({
      provider_name: 'Fast Movers',
      provider_email: 'ops@fastmovers.com.au',
      job_id: 'job-123',
      job_type: 'office',
      suburb: 'Melbourne CBD',
      scheduled_date: '2026-04-01',
      customer_price: 2800,
      matching_mode: 'instant',
    })
    expect(email.to).toBe('ops@fastmovers.com.au')
    expect(email.subject).toContain('job')
    expect(email.html).toContain('job-123')
    expect(email.html).toContain('Melbourne CBD')
    expect(email.html).toContain('$2,800')
  })
})

// ─────────────────────────────────────────────
// POST /api/providers/[id]/notify
// ─────────────────────────────────────────────

describe('POST /api/providers/[id]/notify', () => {
  const validBody = {
    job_id: 'job-abc-123',
    job_type: 'office',
    suburb: 'Melbourne CBD',
    scheduled_date: '2026-04-01',
    customer_price: 2800,
    matching_mode: 'instant',
  }

  const provider = {
    id: 'prov-uuid-1',
    company_name: 'Fast Movers Pty Ltd',
    email: 'ops@fastmovers.com.au',
    phone: '0412345678',
    verification_status: 'verified',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Default: provider exists
    mockSingle.mockResolvedValue({ data: provider, error: null })
    mockSelectEq.mockReturnValue({ single: mockSingle })
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({ eq: mockSelectEq })),
    })
    // Default: SMS and email succeed
    mockSendSMS.mockResolvedValue(true)
    mockResendSend.mockResolvedValue({ data: { id: 'email-id-1' }, error: null })
  })

  it('sends SMS and email to provider and returns 200', async () => {
    const { POST } = await import('@/app/api/providers/[id]/notify/route')
    const req = new NextRequest('http://localhost/api/providers/prov-uuid-1/notify', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'prov-uuid-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sms_sent).toBe(true)
    expect(body.email_sent).toBe(true)
    expect(mockSendSMS).toHaveBeenCalledOnce()
    expect(mockResendSend).toHaveBeenCalledOnce()
  })

  it('passes the provider phone number to sendSMS', async () => {
    const { POST } = await import('@/app/api/providers/[id]/notify/route')
    const req = new NextRequest('http://localhost/api/providers/prov-uuid-1/notify', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(req, { params: Promise.resolve({ id: 'prov-uuid-1' }) })
    expect(mockSendSMS).toHaveBeenCalledWith('0412345678', expect.any(String))
  })

  it('returns 404 when provider does not exist', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } })

    const { POST } = await import('@/app/api/providers/[id]/notify/route')
    const req = new NextRequest('http://localhost/api/providers/unknown/notify', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'unknown' }) })
    expect(res.status).toBe(404)
  })

  it('returns 400 when job_id is missing', async () => {
    const { POST } = await import('@/app/api/providers/[id]/notify/route')
    const req = new NextRequest('http://localhost/api/providers/prov-uuid-1/notify', {
      method: 'POST',
      body: JSON.stringify({ suburb: 'CBD' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'prov-uuid-1' }) })
    expect(res.status).toBe(400)
  })

  it('still returns 200 with partial success if SMS fails but email succeeds', async () => {
    mockSendSMS.mockResolvedValue(false)

    const { POST } = await import('@/app/api/providers/[id]/notify/route')
    const req = new NextRequest('http://localhost/api/providers/prov-uuid-1/notify', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'prov-uuid-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sms_sent).toBe(false)
    expect(body.email_sent).toBe(true)
  })

  it('skips SMS when provider has no phone number', async () => {
    mockSingle.mockResolvedValue({
      data: { ...provider, phone: null },
      error: null,
    })

    const { POST } = await import('@/app/api/providers/[id]/notify/route')
    const req = new NextRequest('http://localhost/api/providers/prov-uuid-1/notify', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'prov-uuid-1' }) })
    expect(res.status).toBe(200)
    expect(mockSendSMS).not.toHaveBeenCalled()
    const body = await res.json()
    expect(body.sms_sent).toBe(false)
  })
})
