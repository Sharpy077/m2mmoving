/**
 * Simple in-memory sliding window rate limiter.
 *
 * Note: state is per-worker instance. For global multi-instance rate limiting,
 * upgrade to Upstash Redis (@upstash/ratelimit).
 */

const requests = new Map<string, number[]>()

export function checkRateLimit(
  ip: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now()
  const windowStart = now - windowMs
  const timestamps = (requests.get(ip) ?? []).filter((t) => t > windowStart)

  if (timestamps.length >= limit) {
    const retryAfterMs = timestamps[0] + windowMs - now
    return { allowed: false, retryAfterMs }
  }

  timestamps.push(now)
  requests.set(ip, timestamps)

  // Periodic cleanup to prevent unbounded memory growth across many IPs
  if (requests.size > 10_000) {
    for (const [key, times] of requests) {
      if (times.every((t) => t <= windowStart)) requests.delete(key)
    }
  }

  return { allowed: true }
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  )
}
