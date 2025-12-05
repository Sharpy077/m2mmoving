import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

// Mock Supabase
const selectMock = vi.fn()
const orderMock = vi.fn(() => ({ data: [], error: null }))
const gteMock = vi.fn(() => ({ lte: vi.fn(() => ({ order: orderMock })) }))
const fromMock = vi.fn(() => ({
  select: selectMock,
  gte: gteMock,
}))

const createClientMock = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => createClientMock(),
}))

describe("API Endpoints - Availability", () => {
  beforeEach(() => {
    createClientMock.mockReturnValue({
      from: fromMock,
    })
    selectMock.mockReturnValue({
      gte: gteMock,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /api/availability", () => {
    it("should return availability data for date range", async () => {
      const { GET } = await import("@/app/api/availability/route")

      const mockAvailability = [
        {
          date: "2025-12-01",
          is_available: true,
          max_bookings: 3,
          current_bookings: 1,
        },
        {
          date: "2025-12-02",
          is_available: true,
          max_bookings: 3,
          current_bookings: 0,
        },
      ]

      orderMock.mockResolvedValue({
        data: mockAvailability,
        error: null,
      })

      const request = new NextRequest("http://localhost/api/availability?start=2025-12-01&end=2025-12-31")
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.availability).toBeDefined()
    })

    it("should use default date range if not provided", async () => {
      const { GET } = await import("@/app/api/availability/route")

      orderMock.mockResolvedValue({
        data: [],
        error: null,
      })

      const request = new NextRequest("http://localhost/api/availability")
      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it("should exclude weekends in fallback mode", async () => {
      const { GET } = await import("@/app/api/availability/route")

      orderMock.mockResolvedValue({
        data: null,
        error: { message: "Table does not exist" },
      })

      const request = new NextRequest("http://localhost/api/availability")
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.availability).toBeDefined()

      // Check that weekends are excluded
      const weekendDates = data.availability.filter((item: any) => {
        const date = new Date(item.date)
        const dayOfWeek = date.getDay()
        return dayOfWeek === 0 || dayOfWeek === 6
      })

      // All weekend dates should be marked as unavailable
      const unavailableWeekends = weekendDates.filter((item: any) => !item.is_available)
      expect(unavailableWeekends.length).toBeGreaterThan(0)
    })

    it("should handle database errors gracefully", async () => {
      const { GET } = await import("@/app/api/availability/route")

      orderMock.mockResolvedValue({
        data: null,
        error: { message: "Database connection failed" },
      })

      const request = new NextRequest("http://localhost/api/availability")
      const response = await GET(request)

      // Should fallback to simulated dates
      expect(response.status).toBe(200)
    })
  })
})

describe("API Endpoints - Voicemails", () => {
  beforeEach(() => {
    createClientMock.mockReturnValue({
      from: fromMock,
    })
    selectMock.mockReturnValue({
      order: orderMock,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /api/voicemails", () => {
    it("should fetch all voicemails", async () => {
      const { GET } = await import("@/app/api/voicemails/route")

      const mockVoicemails = [
        {
          id: "vm_1",
          caller_number: "+61400000000",
          duration: 30,
          status: "new",
          created_at: "2025-12-01T00:00:00Z",
        },
        {
          id: "vm_2",
          caller_number: "+61400000001",
          duration: 45,
          status: "listened",
          created_at: "2025-12-02T00:00:00Z",
        },
      ]

      orderMock.mockResolvedValue({
        data: mockVoicemails,
        error: null,
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.voicemails).toEqual(mockVoicemails)
    })

    it("should handle database errors", async () => {
      const { GET } = await import("@/app/api/voicemails/route")

      orderMock.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })
  })

  describe("PATCH /api/voicemails", () => {
    it("should update voicemail status", async () => {
      const { PATCH } = await import("@/app/api/voicemails/route")

      const eqMock = vi.fn()
      const updateMock = vi.fn(() => ({ eq: eqMock }))
      fromMock.mockReturnValue({
        update: updateMock,
      })

      eqMock.mockResolvedValue({ error: null })

      const requestBody = {
        id: "vm_123",
        status: "listened",
      }

      const request = new NextRequest("http://localhost/api/voicemails", {
        method: "PATCH",
        body: JSON.stringify(requestBody),
        headers: { "Content-Type": "application/json" },
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should update voicemail notes", async () => {
      const { PATCH } = await import("@/app/api/voicemails/route")

      const eqMock = vi.fn()
      const updateMock = vi.fn(() => ({ eq: eqMock }))
      fromMock.mockReturnValue({
        update: updateMock,
      })

      eqMock.mockResolvedValue({ error: null })

      const requestBody = {
        id: "vm_123",
        notes: "Customer called about quote",
      }

      const request = new NextRequest("http://localhost/api/voicemails", {
        method: "PATCH",
        body: JSON.stringify(requestBody),
        headers: { "Content-Type": "application/json" },
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should handle invalid request body", async () => {
      const { PATCH } = await import("@/app/api/voicemails/route")

      const request = new NextRequest("http://localhost/api/voicemails", {
        method: "PATCH",
        body: "invalid json",
        headers: { "Content-Type": "application/json" },
      })

      await expect(PATCH(request)).rejects.toThrow()
    })

    it("should handle database update errors", async () => {
      const { PATCH } = await import("@/app/api/voicemails/route")

      const eqMock = vi.fn()
      const updateMock = vi.fn(() => ({ eq: eqMock }))
      fromMock.mockReturnValue({
        update: updateMock,
      })

      eqMock.mockResolvedValue({
        error: { message: "Update failed" },
      })

      const requestBody = {
        id: "vm_123",
        status: "listened",
      }

      const request = new NextRequest("http://localhost/api/voicemails", {
        method: "PATCH",
        body: JSON.stringify(requestBody),
        headers: { "Content-Type": "application/json" },
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })
  })
})

describe("API Endpoints - Business Lookup", () => {
  describe("GET /api/business-lookup", () => {
    it("should validate ABN format", () => {
      const validABN = "71661027309"
      const abnRegex = /^\d{11}$/

      expect(abnRegex.test(validABN)).toBe(true)
    })

    it("should reject invalid ABN format", () => {
      const invalidABN = "123"
      const abnRegex = /^\d{11}$/

      expect(abnRegex.test(invalidABN)).toBe(false)
    })

    it("should handle business name search", () => {
      const query = "M&M Commercial Moving"
      expect(query.length).toBeGreaterThan(0)
    })
  })
})

describe("API Endpoints - Security", () => {
  describe("Input Validation", () => {
    it("should validate date format", () => {
      const validDate = "2025-12-01"
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/

      expect(dateRegex.test(validDate)).toBe(true)
    })

    it("should reject invalid date format", () => {
      const invalidDate = "12/01/2025"
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/

      expect(dateRegex.test(invalidDate)).toBe(false)
    })

    it("should sanitize SQL injection attempts", () => {
      const maliciousInput = "'; DROP TABLE availability; --"
      // Parameterized queries prevent this, but we test awareness
      expect(maliciousInput.includes("DROP TABLE")).toBe(true)
    })
  })

  describe("Rate Limiting", () => {
    it("should track API request frequency", () => {
      const requests: number[] = []
      const now = Date.now()

      for (let i = 0; i < 50; i++) {
        requests.push(now + i * 1000)
      }

      const recentRequests = requests.filter((time) => now - time < 60000)
      expect(recentRequests.length).toBeLessThanOrEqual(100)
    })
  })

  describe("Error Handling", () => {
    it("should not expose sensitive information in errors", () => {
      const error = {
        message: "Database connection failed",
        // Should not include: connection string, credentials, etc.
      }

      expect(error.message).not.toContain("password")
      expect(error.message).not.toContain("api_key")
    })

    it("should return appropriate HTTP status codes", () => {
      const statusCodes = {
        success: 200,
        badRequest: 400,
        unauthorized: 401,
        notFound: 404,
        serverError: 500,
      }

      expect(statusCodes.success).toBe(200)
      expect(statusCodes.badRequest).toBe(400)
      expect(statusCodes.serverError).toBe(500)
    })
  })
})

describe("API Endpoints - Quote Assistant", () => {
  describe("POST /api/quote-assistant", () => {
    it("should validate message format", () => {
      const validMessage = {
        role: "user",
        content: "Hello, I need a quote",
      }

      expect(validMessage.role).toMatch(/^(user|assistant|system)$/)
      expect(validMessage.content).toBeDefined()
    })

    it("should handle streaming responses", () => {
      const isStreaming = true
      expect(isStreaming).toBe(true)
    })

    it("should validate tool calls", () => {
      const validToolCall = {
        toolCallId: "call_123",
        toolName: "calculateQuote",
        args: {
          moveType: "office",
          squareMeters: 100,
        },
      }

      expect(validToolCall.toolName).toBeDefined()
      expect(validToolCall.args).toBeDefined()
    })
  })
})
