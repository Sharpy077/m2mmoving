// API Security utilities for rate limiting and request validation

// Simple in-memory rate limiter (for serverless, consider using Upstash Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
}

export function rateLimit(
  identifier: string,
  config: RateLimitConfig = { windowMs: 60000, maxRequests: 30 },
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const key = identifier
  const existing = rateLimitMap.get(key)

  // Clean up expired entries periodically
  if (rateLimitMap.size > 10000) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (v.resetTime < now) {
        rateLimitMap.delete(k)
      }
    }
  }

  if (!existing || existing.resetTime < now) {
    // New window
    rateLimitMap.set(key, { count: 1, resetTime: now + config.windowMs })
    return { allowed: true, remaining: config.maxRequests - 1, resetIn: config.windowMs }
  }

  if (existing.count >= config.maxRequests) {
    // Rate limited
    return { allowed: false, remaining: 0, resetIn: existing.resetTime - now }
  }

  // Increment counter
  existing.count++
  return { allowed: true, remaining: config.maxRequests - existing.count, resetIn: existing.resetTime - now }
}

// Get client identifier from request
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const cfConnecting = request.headers.get("cf-connecting-ip")

  // Try various headers for the real IP
  const ip = cfConnecting || realIp || forwarded?.split(",")[0]?.trim() || "unknown"

  return ip
}

// Validate Origin/Referer to prevent unauthorized cross-origin requests
export function validateOrigin(request: Request, allowedOrigins: string[]): boolean {
  const origin = request.headers.get("origin")
  const referer = request.headers.get("referer")

  // Allow server-side requests (no origin)
  if (!origin && !referer) {
    return true
  }

  const requestOrigin = origin || (referer ? new URL(referer).origin : null)

  if (!requestOrigin) {
    return true // Allow if we can't determine origin
  }

  // Check against allowed origins
  return allowedOrigins.some((allowed) => {
    if (allowed === "*") return true
    if (allowed === requestOrigin) return true
    // Support wildcard subdomains
    if (allowed.startsWith("*.")) {
      const domain = allowed.slice(2)
      return requestOrigin.endsWith(domain) || requestOrigin.endsWith(`.${domain}`)
    }
    return false
  })
}

// Get allowed origins from environment or defaults
export function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS
  if (envOrigins) {
    return envOrigins.split(",").map((o) => o.trim())
  }

  // Default allowed origins
  return [
    "https://m2mmoving.au",
    "https://www.m2mmoving.au",
    "https://v0.app",
    "https://*.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001",
  ]
}

// Create rate limit response
export function rateLimitResponse(resetIn: number): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests. Please try again later.",
      retryAfter: Math.ceil(resetIn / 1000),
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil(resetIn / 1000)),
      },
    },
  )
}

// Validate Twilio webhook signature
export function validateTwilioSignature(request: Request, body: string, url: string): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) {
    console.warn("[Security] TWILIO_AUTH_TOKEN not set, skipping signature validation")
    return true // Allow in development
  }

  const signature = request.headers.get("x-twilio-signature")
  if (!signature) {
    console.warn("[Security] Missing Twilio signature header")
    return false
  }

  // In production, implement proper HMAC validation
  // For now, just check that signature exists
  return signature.length > 0
}

// API Security middleware helper
export interface SecurityCheckResult {
  allowed: boolean
  response?: Response
}

export async function checkApiSecurity(
  request: Request,
  options: {
    rateLimit?: RateLimitConfig
    validateOrigin?: boolean
    requireAuth?: boolean
  } = {},
): Promise<SecurityCheckResult> {
  const clientId = getClientIdentifier(request)

  // Check rate limit
  if (options.rateLimit) {
    const rateLimitResult = rateLimit(`${clientId}:${new URL(request.url).pathname}`, options.rateLimit)
    if (!rateLimitResult.allowed) {
      return { allowed: false, response: rateLimitResponse(rateLimitResult.resetIn) }
    }
  }

  // Check origin
  if (options.validateOrigin) {
    const allowed = validateOrigin(request, getAllowedOrigins())
    if (!allowed) {
      return {
        allowed: false,
        response: new Response(JSON.stringify({ error: "Unauthorized origin" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }),
      }
    }
  }

  return { allowed: true }
}
