import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import {
  getClientIdentifier,
  validateOrigin,
  rateLimit,
  rateLimitResponse,
  validateTwilioSignature,
  checkApiSecurity,
} from '@/lib/api-security'

// ─────────────────────────────────────────────────────────────
// getClientIdentifier
// ─────────────────────────────────────────────────────────────
describe('getClientIdentifier()', () => {
  it('prefers cf-connecting-ip over all other headers', () => {
    const req = new Request('http://localhost', {
      headers: {
        'cf-connecting-ip': '1.1.1.1',
        'x-real-ip': '2.2.2.2',
        'x-forwarded-for': '3.3.3.3',
      },
    })
    expect(getClientIdentifier(req)).toBe('1.1.1.1')
  })

  it('falls back to x-real-ip when cf-connecting-ip is absent', () => {
    const req = new Request('http://localhost', {
      headers: {
        'x-real-ip': '2.2.2.2',
        'x-forwarded-for': '3.3.3.3, 10.0.0.1',
      },
    })
    expect(getClientIdentifier(req)).toBe('2.2.2.2')
  })

  it('extracts the first IP from x-forwarded-for when other headers are absent', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '3.3.3.3, 10.0.0.1' },
    })
    expect(getClientIdentifier(req)).toBe('3.3.3.3')
  })

  it('returns "unknown" when no IP headers are present', () => {
    const req = new Request('http://localhost')
    expect(getClientIdentifier(req)).toBe('unknown')
  })
})

// ─────────────────────────────────────────────────────────────
// validateOrigin
// ─────────────────────────────────────────────────────────────
describe('validateOrigin()', () => {
  it('allows server-side requests with no origin or referer', () => {
    const req = new Request('http://localhost')
    expect(validateOrigin(req, ['https://example.com'])).toBe(true)
  })

  it('allows a request whose origin exactly matches the allowlist', () => {
    const req = new Request('http://localhost', {
      headers: { origin: 'https://example.com' },
    })
    expect(validateOrigin(req, ['https://example.com'])).toBe(true)
  })

  it('blocks a request whose origin is not in the allowlist', () => {
    const req = new Request('http://localhost', {
      headers: { origin: 'https://evil.com' },
    })
    expect(validateOrigin(req, ['https://example.com'])).toBe(false)
  })

  it('allows any origin when "*" wildcard is in the allowlist', () => {
    const req = new Request('http://localhost', {
      headers: { origin: 'https://anything.com' },
    })
    expect(validateOrigin(req, ['*'])).toBe(true)
  })

  it('extracts and validates origin from referer header when origin is absent', () => {
    const req = new Request('http://localhost', {
      headers: { referer: 'https://example.com/some/path' },
    })
    expect(validateOrigin(req, ['https://example.com'])).toBe(true)
  })

  it('allows wildcard subdomain matching', () => {
    const req = new Request('http://localhost', {
      headers: { origin: 'https://sub.example.com' },
    })
    expect(validateOrigin(req, ['*.example.com'])).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────
// rateLimit (the fixed-window counter in api-security.ts)
// ─────────────────────────────────────────────────────────────
describe('rateLimit()', () => {
  it('allows requests within the configured limit', () => {
    const id = `sec-rl-allow-${Date.now()}`
    const result = rateLimit(id, { windowMs: 60_000, maxRequests: 5 })
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
    expect(result.resetIn).toBeGreaterThan(0)
  })

  it('blocks once the limit is exhausted', () => {
    const id = `sec-rl-block-${Date.now()}`
    for (let i = 0; i < 3; i++) rateLimit(id, { windowMs: 60_000, maxRequests: 3 })
    const result = rateLimit(id, { windowMs: 60_000, maxRequests: 3 })
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.resetIn).toBeGreaterThan(0)
  })

  it('resets the counter after the window expires', async () => {
    const id = `sec-rl-reset-${Date.now()}`
    rateLimit(id, { windowMs: 10, maxRequests: 1 })
    await new Promise((resolve) => setTimeout(resolve, 20))
    const result = rateLimit(id, { windowMs: 10, maxRequests: 1 })
    expect(result.allowed).toBe(true)
  })

  it('decrements remaining on each request', () => {
    const id = `sec-rl-decrement-${Date.now()}`
    const first = rateLimit(id, { windowMs: 60_000, maxRequests: 3 })
    expect(first.remaining).toBe(2)
    const second = rateLimit(id, { windowMs: 60_000, maxRequests: 3 })
    expect(second.remaining).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────
// rateLimitResponse
// ─────────────────────────────────────────────────────────────
describe('rateLimitResponse()', () => {
  it('returns HTTP 429 with a Retry-After header in seconds', async () => {
    const response = rateLimitResponse(30_000)
    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('30')
  })

  it('includes an error message and retryAfter in the JSON body', async () => {
    const response = rateLimitResponse(15_000)
    const body = await response.json()
    expect(body.error).toMatch(/too many requests/i)
    expect(body.retryAfter).toBe(15)
  })
})

// ─────────────────────────────────────────────────────────────
// validateTwilioSignature
// ─────────────────────────────────────────────────────────────
describe('validateTwilioSignature()', () => {
  const originalToken = process.env.TWILIO_AUTH_TOKEN

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.TWILIO_AUTH_TOKEN
    } else {
      process.env.TWILIO_AUTH_TOKEN = originalToken
    }
  })

  it('returns true (dev mode) when TWILIO_AUTH_TOKEN is not set', () => {
    delete process.env.TWILIO_AUTH_TOKEN
    const req = new Request('http://localhost')
    expect(validateTwilioSignature(req, 'body', 'http://localhost')).toBe(true)
  })

  it('returns false when auth token is set but signature header is missing', () => {
    process.env.TWILIO_AUTH_TOKEN = 'test_secret'
    const req = new Request('http://localhost')
    expect(validateTwilioSignature(req, 'body', 'http://localhost')).toBe(false)
  })

  it('returns true when auth token is set and a signature header is present', () => {
    process.env.TWILIO_AUTH_TOKEN = 'test_secret'
    const req = new Request('http://localhost', {
      headers: { 'x-twilio-signature': 'some-signature-value' },
    })
    expect(validateTwilioSignature(req, 'body', 'http://localhost')).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────
// checkApiSecurity
// ─────────────────────────────────────────────────────────────
describe('checkApiSecurity()', () => {
  it('allows a plain request when no security options are specified', async () => {
    const req = new Request('http://localhost/api/test')
    const result = await checkApiSecurity(req)
    expect(result.allowed).toBe(true)
    expect(result.response).toBeUndefined()
  })

  it('returns 429 when the rate limit is exceeded', async () => {
    const ip = `check-sec-rl-${Date.now()}`
    const makeRequest = () =>
      checkApiSecurity(
        new Request('http://localhost/api/test', {
          headers: { 'cf-connecting-ip': ip },
        }),
        { rateLimit: { windowMs: 60_000, maxRequests: 2 } },
      )
    await makeRequest()
    await makeRequest()
    const result = await makeRequest()
    expect(result.allowed).toBe(false)
    expect(result.response?.status).toBe(429)
  })

  it('returns 403 when the request origin is not in the default allowlist', async () => {
    const req = new Request('http://localhost/api/test', {
      headers: { origin: 'https://definitely-not-allowed.io' },
    })
    const result = await checkApiSecurity(req, { validateOrigin: true })
    expect(result.allowed).toBe(false)
    expect(result.response?.status).toBe(403)
  })

  it('allows a request from a known origin', async () => {
    const req = new Request('http://localhost/api/test', {
      headers: { origin: 'http://localhost:3000' },
    })
    const result = await checkApiSecurity(req, { validateOrigin: true })
    expect(result.allowed).toBe(true)
  })
})
