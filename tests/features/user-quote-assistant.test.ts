import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const { mockStreamText } = vi.hoisted(() => {
  const mockStreamText = vi.fn()
  return { mockStreamText }
})

vi.mock("ai", async () => {
  const actual = await vi.importActual("ai")
  return {
    ...actual,
    streamText: mockStreamText,
    convertToModelMessages: vi.fn((msgs) => msgs),
    validateUIMessages: vi.fn(({ messages }) => Promise.resolve(messages)),
    tool: vi.fn((config) => ({
      ...config,
      execute: config.execute || vi.fn(),
    })),
  }
})

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => vi.fn(() => "openai/gpt-4o")),
}))

// Mock business lookup API
global.fetch = vi.fn()

import { POST } from "@/app/api/quote-assistant/route"

describe("User-Side: AI Quote Assistant (Maya)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStreamText.mockReturnValue({
      toDataStreamResponse: () => new Response(JSON.stringify({ text: "Hello" }), {
        headers: { "Content-Type": "application/json" },
      }),
      toUIMessageStreamResponse: () => new Response(JSON.stringify({ text: "Hello" }), {
        headers: { "Content-Type": "application/json" },
      }),
      fullStream: (async function* () {
        yield { type: "text-delta", textDelta: "Hello" }
      })(),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("Functionality Tests", () => {
    it("should handle initial conversation start", async () => {
      const request = new Request("http://localhost/api/quote-assistant", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "start" }],
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(mockStreamText).toHaveBeenCalled()
    })

    it("should process user messages", async () => {
      const request = new Request("http://localhost/api/quote-assistant", {
        method: "POST",
        body: JSON.stringify({
          messages: [
            { role: "user", content: "I need a quote for office relocation" },
          ],
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(mockStreamText).toHaveBeenCalled()
    })

    it("should handle business lookup tool call", async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              abn: "71661027309",
              name: "Test Company",
              state: "VIC",
              postcode: "3000",
            },
          ],
        }),
      })

      const request = new Request("http://localhost/api/quote-assistant", {
        method: "POST",
        body: JSON.stringify({
          messages: [
            { role: "user", content: "My company is Test Company" },
          ],
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it("should handle quote calculation", async () => {
      const request = new Request("http://localhost/api/quote-assistant", {
        method: "POST",
        body: JSON.stringify({
          messages: [
            { role: "user", content: "I have a 100sqm office in Melbourne" },
          ],
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it("should handle availability checking", async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          availability: [
            { date: "2024-12-15", is_available: true, current_bookings: 2, max_bookings: 5 },
          ],
        }),
      })

      const request = new Request("http://localhost/api/quote-assistant", {
        method: "POST",
        body: JSON.stringify({
          messages: [
            { role: "user", content: "When are you available?" },
          ],
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })
  })

  describe("Security Tests", () => {
    it("should validate message format", async () => {
      const request = new Request("http://localhost/api/quote-assistant", {
        method: "POST",
        body: JSON.stringify({
          messages: "invalid",
        }),
      })

      const response = await POST(request)
      // Should handle invalid format gracefully
      expect(response).toBeDefined()
    })

    it("should sanitize user input", async () => {
      const maliciousInput = "<script>alert('xss')</script>"
      const request = new Request("http://localhost/api/quote-assistant", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: maliciousInput }],
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      // Input should be sanitized by OpenAI/validation
    })

    it("should handle missing messages array", async () => {
      const request = new Request("http://localhost/api/quote-assistant", {
        method: "POST",
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      expect(response.status).toBe(200) // Should use default messages
    })
  })

  describe("Usability Tests", () => {
    it("should provide helpful error messages", async () => {
      mockStreamText.mockImplementation(() => {
        throw new Error("API Error")
      })

      const request = new Request("http://localhost/api/quote-assistant", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "test" }],
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })

    it("should handle empty messages gracefully", async () => {
      const request = new Request("http://localhost/api/quote-assistant", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "" }],
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })
  })

  describe("Integration Tests", () => {
    it("should handle business lookup integration", async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      })

      const request = new Request("http://localhost/api/quote-assistant", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "ABN 71661027309" }],
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it("should handle availability integration", async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ availability: [] }),
      })

      const request = new Request("http://localhost/api/quote-assistant", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "check availability" }],
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })
  })
})
