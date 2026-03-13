/**
 * Twilio Voice Route Handler Tests
 *
 * Tests for incoming call routing, voicemail recording, transcription,
 * and call status handling.
 *
 * Note: validateTwilioRequest is mocked below because the current
 * lib/twilio.ts does not export it (known bug). The mock lets us
 * test both the allowed and rejected paths in isolation.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
const {
  isBusinessHoursMock,
  validateTwilioRequestMock,
  insertMock,
  updateAfterEqMock,
  selectAfterUpdateMock,
  eqMock,
  updateMock,
  fromMock,
  createClientMock,
} = vi.hoisted(() => {
  const isBusinessHoursMock = vi.fn().mockReturnValue(true)
  const validateTwilioRequestMock = vi.fn().mockReturnValue(true)
  const insertMock = vi.fn().mockResolvedValue({ error: null })
  const updateAfterEqMock = vi.fn().mockResolvedValue({ data: [], error: null })
  const selectAfterUpdateMock = vi.fn(() => ({ eq: updateAfterEqMock }))
  const eqMock = vi.fn().mockResolvedValue({ data: [], error: null })
  const updateMock = vi.fn(() => ({ eq: eqMock, select: selectAfterUpdateMock }))
  const fromMock = vi.fn((table: string) => ({
    insert: insertMock,
    update: updateMock,
  }))
  const createClientMock = vi.fn()
  return {
    isBusinessHoursMock,
    validateTwilioRequestMock,
    insertMock,
    updateAfterEqMock,
    selectAfterUpdateMock,
    eqMock,
    updateMock,
    fromMock,
    createClientMock,
  }
})

vi.mock("@/lib/twilio", () => ({
  isBusinessHours: isBusinessHoursMock,
  validateTwilioRequest: validateTwilioRequestMock,
  formatAustralianNumber: (n: string) => (n.startsWith("04") ? "+61" + n.slice(1) : n),
  FORWARD_NUMBERS: ["+61400000001"],
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => createClientMock(),
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeFormDataRequest(url: string, fields: Record<string, string>) {
  const body = new URLSearchParams(fields).toString()
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "x-twilio-signature": "valid-sig",
    },
    body,
  }) as unknown as import("next/server").NextRequest
}

// ─────────────────────────────────────────────────────────────────────────────
// /api/voice/incoming
// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/voice/incoming", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    validateTwilioRequestMock.mockReturnValue(true)
  })

  it("returns 403 when the Twilio signature is invalid", async () => {
    validateTwilioRequestMock.mockReturnValue(false)
    const { POST } = await import("@/app/api/voice/incoming/route")
    const req = makeFormDataRequest("http://localhost/api/voice/incoming", {
      From: "+61400000002",
      To: "+61391234567",
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it("returns TwiML with <Dial> during business hours", async () => {
    isBusinessHoursMock.mockReturnValue(true)
    const { POST } = await import("@/app/api/voice/incoming/route")
    const req = makeFormDataRequest("http://localhost/api/voice/incoming", {
      From: "+61400000002",
      To: "+61391234567",
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toContain("text/xml")
    const body = await res.text()
    expect(body).toContain("<Dial")
  })

  it("returns TwiML with <Record> outside business hours", async () => {
    isBusinessHoursMock.mockReturnValue(false)
    const { POST } = await import("@/app/api/voice/incoming/route")
    const req = makeFormDataRequest("http://localhost/api/voice/incoming", {
      From: "+61400000003",
      To: "+61391234567",
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain("<Record")
  })

  it("GET endpoint returns 200 for webhook verification", async () => {
    const { GET } = await import("@/app/api/voice/incoming/route")
    const res = await GET()
    expect(res.status).toBe(200)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// /api/voice/voicemail
// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/voice/voicemail", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    validateTwilioRequestMock.mockReturnValue(true)
    createClientMock.mockResolvedValue({ from: fromMock })
  })

  it("returns 403 when the Twilio signature is invalid", async () => {
    validateTwilioRequestMock.mockReturnValue(false)
    const { POST } = await import("@/app/api/voice/voicemail/route")
    const req = makeFormDataRequest("http://localhost/api/voice/voicemail", {
      RecordingUrl: "https://api.twilio.com/recording/RE123",
      RecordingSid: "RE123",
      From: "+61400000004",
      RecordingDuration: "15",
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it("saves the voicemail to the database and returns TwiML", async () => {
    const { POST } = await import("@/app/api/voice/voicemail/route")
    const req = makeFormDataRequest("http://localhost/api/voice/voicemail", {
      RecordingUrl: "https://api.twilio.com/recording/RE456",
      RecordingSid: "RE456",
      From: "+61400000005",
      RecordingDuration: "30",
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toContain("text/xml")
    expect(fromMock).toHaveBeenCalledWith("voicemails")
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        caller_number: "+61400000005",
        recording_url: "https://api.twilio.com/recording/RE456",
        recording_sid: "RE456",
        duration: 30,
        status: "new",
      }),
    )
  })

  it("still returns a valid TwiML response when the DB insert fails", async () => {
    insertMock.mockRejectedValue(new Error("DB down"))
    const { POST } = await import("@/app/api/voice/voicemail/route")
    const req = makeFormDataRequest("http://localhost/api/voice/voicemail", {
      RecordingUrl: "https://api.twilio.com/recording/RE789",
      RecordingSid: "RE789",
      From: "+61400000006",
      RecordingDuration: "45",
    })
    const res = await POST(req)
    // The route catches the error and still returns TwiML
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain("<Say")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// /api/voice/transcription
// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/voice/transcription", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    validateTwilioRequestMock.mockReturnValue(true)
    createClientMock.mockResolvedValue({ from: fromMock })
  })

  it("returns 403 when the Twilio signature is invalid", async () => {
    validateTwilioRequestMock.mockReturnValue(false)
    const { POST } = await import("@/app/api/voice/transcription/route")
    const req = makeFormDataRequest("http://localhost/api/voice/transcription", {
      TranscriptionText: "Hello world",
      RecordingSid: "RE111",
      TranscriptionStatus: "completed",
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it("updates the voicemail record with the transcription text on success", async () => {
    const { POST } = await import("@/app/api/voice/transcription/route")
    const req = makeFormDataRequest("http://localhost/api/voice/transcription", {
      TranscriptionText: "Please call me back about the office move.",
      RecordingSid: "RE222",
      TranscriptionStatus: "completed",
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(fromMock).toHaveBeenCalledWith("voicemails")
    expect(updateMock).toHaveBeenCalledWith({
      transcription: "Please call me back about the office move.",
    })
    expect(eqMock).toHaveBeenCalledWith("recording_sid", "RE222")
  })

  it("does not update the database when transcription status is not 'completed'", async () => {
    const { POST } = await import("@/app/api/voice/transcription/route")
    const req = makeFormDataRequest("http://localhost/api/voice/transcription", {
      TranscriptionText: "",
      RecordingSid: "RE333",
      TranscriptionStatus: "failed",
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(fromMock).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// /api/voice/status
// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/voice/status", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    validateTwilioRequestMock.mockReturnValue(true)
  })

  it("returns 403 when the Twilio signature is invalid", async () => {
    validateTwilioRequestMock.mockReturnValue(false)
    const { POST } = await import("@/app/api/voice/status/route")
    const req = makeFormDataRequest("http://localhost/api/voice/status", {
      DialCallStatus: "completed",
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it("returns a thank-you TwiML when the call completed successfully", async () => {
    const { POST } = await import("@/app/api/voice/status/route")
    const req = makeFormDataRequest("http://localhost/api/voice/status", {
      DialCallStatus: "completed",
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain("<Say")
    expect(body).not.toContain("<Record")
  })

  it("returns a voicemail TwiML when the call was not answered (no-answer)", async () => {
    const { POST } = await import("@/app/api/voice/status/route")
    const req = makeFormDataRequest("http://localhost/api/voice/status", {
      DialCallStatus: "no-answer",
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain("<Record")
  })

  it("returns a voicemail TwiML when the call was busy", async () => {
    const { POST } = await import("@/app/api/voice/status/route")
    const req = makeFormDataRequest("http://localhost/api/voice/status", {
      DialCallStatus: "busy",
    })
    const res = await POST(req)
    const body = await res.text()
    expect(body).toContain("<Record")
  })
})
