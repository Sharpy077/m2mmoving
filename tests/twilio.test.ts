import { describe, expect, it, afterEach } from "vitest"
import crypto from "crypto"

import { formatAustralianNumber, isBusinessHours, validateTwilioRequest } from "@/lib/twilio"

describe("telephony utilities", () => {
  it("identifies Melbourne business hours correctly", () => {
    const withinHours = new Date("2025-12-01T23:00:00Z")
    const afterHoursWeekend = new Date("2025-12-06T02:00:00Z")

    expect(isBusinessHours(withinHours)).toBe(true)
    expect(isBusinessHours(afterHoursWeekend)).toBe(false)
  })

  it("formats Australian mobile numbers into E.164 format", () => {
    expect(formatAustralianNumber("0412345678")).toBe("+61412345678")
    expect(formatAustralianNumber("+61391234567")).toBe("+61391234567")
    expect(formatAustralianNumber("499999999")).toBe("+61499999999")
  })
})

describe("validateTwilioRequest()", () => {
  const originalAuthToken = process.env.TWILIO_AUTH_TOKEN

  afterEach(() => {
    if (originalAuthToken === undefined) {
      delete process.env.TWILIO_AUTH_TOKEN
    } else {
      process.env.TWILIO_AUTH_TOKEN = originalAuthToken
    }
  })

  function makeRequest(url: string, signature: string) {
    return new Request(url, {
      method: "POST",
      headers: { "x-twilio-signature": signature },
    }) as unknown as import("next/server").NextRequest
  }

  function computeTwilioSignature(authToken: string, url: string, params: Record<string, string>): string {
    // Twilio signature: HMAC-SHA1 of (url + sorted key+value pairs), base64-encoded
    const sortedStr = Object.keys(params).sort().reduce((acc, key) => acc + key + params[key], url)
    return crypto.createHmac("sha1", authToken).update(Buffer.from(sortedStr)).digest("base64")
  }

  it("returns true when TWILIO_AUTH_TOKEN is not set (dev mode bypass)", () => {
    delete process.env.TWILIO_AUTH_TOKEN
    const req = makeRequest("http://localhost/api/voice/incoming", "any-signature")
    expect(validateTwilioRequest(req, {})).toBe(true)
  })

  it("returns false when TWILIO_AUTH_TOKEN is set and signature is invalid", () => {
    process.env.TWILIO_AUTH_TOKEN = "test-auth-token"
    const req = makeRequest("http://localhost/api/voice/incoming", "bad-signature")
    expect(validateTwilioRequest(req, { From: "+61400000001" })).toBe(false)
  })

  it("returns true when TWILIO_AUTH_TOKEN is set and signature is valid", () => {
    const authToken = "test-auth-token-abc123"
    const url = "https://example.com/api/voice/incoming"
    const params = { From: "+61400000001", To: "+61391234567" }
    const validSig = computeTwilioSignature(authToken, url, params)

    process.env.TWILIO_AUTH_TOKEN = authToken
    const req = makeRequest(url, validSig)
    expect(validateTwilioRequest(req, params)).toBe(true)
  })
})
