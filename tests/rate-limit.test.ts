import { describe, it, expect } from 'vitest'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

describe('checkRateLimit()', () => {
  it('allows requests under the limit', () => {
    const ip = `rl-allow-${Date.now()}-a`
    const result = checkRateLimit(ip, 5, 60_000)
    expect(result.allowed).toBe(true)
    expect(result.retryAfterMs).toBeUndefined()
  })

  it('blocks the request exactly when the limit is reached', () => {
    const ip = `rl-block-${Date.now()}-b`
    for (let i = 0; i < 3; i++) {
      checkRateLimit(ip, 3, 60_000)
    }
    const result = checkRateLimit(ip, 3, 60_000)
    expect(result.allowed).toBe(false)
    expect(result.retryAfterMs).toBeGreaterThan(0)
  })

  it('retryAfterMs is positive and within the window duration', () => {
    const ip = `rl-retry-${Date.now()}-c`
    const windowMs = 30_000
    for (let i = 0; i < 2; i++) checkRateLimit(ip, 2, windowMs)
    const result = checkRateLimit(ip, 2, windowMs)
    expect(result.allowed).toBe(false)
    expect(result.retryAfterMs).toBeGreaterThan(0)
    expect(result.retryAfterMs).toBeLessThanOrEqual(windowMs)
  })

  it('different IPs do not interfere with each other', () => {
    const ts = Date.now()
    const ipA = `rl-iso-${ts}-A`
    const ipB = `rl-iso-${ts}-B`
    for (let i = 0; i < 2; i++) checkRateLimit(ipA, 2, 60_000)
    const resultA = checkRateLimit(ipA, 2, 60_000)
    expect(resultA.allowed).toBe(false)

    const resultB = checkRateLimit(ipB, 2, 60_000)
    expect(resultB.allowed).toBe(true)
  })

  it('allows a new request after the window expires', async () => {
    const ip = `rl-expire-${Date.now()}-d`
    const windowMs = 10 // 10ms window
    checkRateLimit(ip, 1, windowMs)
    await new Promise((resolve) => setTimeout(resolve, 20))
    const result = checkRateLimit(ip, 1, windowMs)
    expect(result.allowed).toBe(true)
  })

  it('counts each request within the window', () => {
    const ip = `rl-count-${Date.now()}-e`
    for (let i = 0; i < 4; i++) {
      const result = checkRateLimit(ip, 5, 60_000)
      expect(result.allowed).toBe(true)
    }
    const fifth = checkRateLimit(ip, 5, 60_000)
    expect(fifth.allowed).toBe(true) // exactly at limit, not yet blocked

    const sixth = checkRateLimit(ip, 5, 60_000)
    expect(sixth.allowed).toBe(false)
  })
})

describe('getClientIp()', () => {
  it('extracts the first IP from x-forwarded-for when multiple are present', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '203.0.113.42, 10.0.0.1, 172.16.0.5' },
    })
    expect(getClientIp(req)).toBe('203.0.113.42')
  })

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '198.51.100.7' },
    })
    expect(getClientIp(req)).toBe('198.51.100.7')
  })

  it('returns "unknown" when no IP headers are present', () => {
    const req = new Request('http://localhost')
    expect(getClientIp(req)).toBe('unknown')
  })
})
