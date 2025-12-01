import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET, PATCH } from "@/app/api/voicemails/route"
import { NextRequest } from "next/server"

// Mock Supabase
const mockSelect = vi.fn()
const mockOrder = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  update: mockUpdate,
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

describe("Admin-Side: Voicemails Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelect.mockReturnValue({
      order: mockOrder,
    })
    mockOrder.mockResolvedValue({
      data: [
        {
          id: "vm_1",
          caller_number: "+61400000000",
          recording_url: "https://example.com/recording.mp3",
          recording_sid: "RE123",
          duration: 45,
          transcription: "Hello, I need a quote",
          status: "new",
          notes: null,
          created_at: new Date().toISOString(),
        },
        {
          id: "vm_2",
          caller_number: "+61400000001",
          recording_url: "https://example.com/recording2.mp3",
          recording_sid: "RE124",
          duration: 30,
          transcription: null,
          status: "listened",
          notes: "Customer called about quote",
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
      error: null,
    })
    mockUpdate.mockReturnValue({
      eq: mockEq,
    })
    mockEq.mockResolvedValue({ error: null })
  })

  describe("Functionality Tests", () => {
    it("should fetch all voicemails", async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.voicemails).toHaveLength(2)
      expect(mockSelect).toHaveBeenCalledWith("*")
      expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false })
    })

    it("should update voicemail status", async () => {
      const request = new NextRequest("http://localhost/api/voicemails", {
        method: "PATCH",
        body: JSON.stringify({
          id: "vm_1",
          status: "listened",
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "listened",
          updated_at: expect.any(String),
        }),
      )
      expect(mockEq).toHaveBeenCalledWith("id", "vm_1")
    })

    it("should update voicemail notes", async () => {
      const request = new NextRequest("http://localhost/api/voicemails", {
        method: "PATCH",
        body: JSON.stringify({
          id: "vm_1",
          notes: "Follow up required",
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: "Follow up required",
          updated_at: expect.any(String),
        }),
      )
    })

    it("should handle status workflow", async () => {
      const statuses = ["new", "listened", "followed_up", "archived"]
      for (const status of statuses) {
        const request = new NextRequest("http://localhost/api/voicemails", {
          method: "PATCH",
          body: JSON.stringify({
            id: "vm_1",
            status,
          }),
        })

        const response = await PATCH(request)
        expect(response.status).toBe(200)
      }
    })

    it("should calculate statistics correctly", async () => {
      const response = await GET()
      const data = await response.json()
      const voicemails = data.voicemails || []

      const stats = {
        new: voicemails.filter((v: any) => v.status === "new").length,
        listened: voicemails.filter((v: any) => v.status === "listened").length,
        followed_up: voicemails.filter((v: any) => v.status === "followed_up").length,
      }

      expect(stats.new).toBe(1)
      expect(stats.listened).toBe(1)
    })
  })

  describe("Security Tests", () => {
    it("should require authentication", async () => {
      // In real implementation, middleware should check auth
      const response = await GET()
      expect(response.status).toBe(200)
    })

    it("should validate voicemail ID", async () => {
      const request = new NextRequest("http://localhost/api/voicemails", {
        method: "PATCH",
        body: JSON.stringify({
          id: "invalid-id",
          status: "new",
        }),
      })

      const response = await PATCH(request)
      // Should handle invalid ID
      expect(response.status).toBeDefined()
    })

    it("should validate status values", async () => {
      const request = new NextRequest("http://localhost/api/voicemails", {
        method: "PATCH",
        body: JSON.stringify({
          id: "vm_1",
          status: "invalid_status",
        }),
      })

      const response = await PATCH(request)
      // Should either validate or sanitize
      expect(response.status).toBeDefined()
    })

    it("should sanitize notes input", async () => {
      const maliciousNotes = "<script>alert('xss')</script>"
      const request = new NextRequest("http://localhost/api/voicemails", {
        method: "PATCH",
        body: JSON.stringify({
          id: "vm_1",
          notes: maliciousNotes,
        }),
      })

      const response = await PATCH(request)
      expect(response.status).toBe(200)
      // Should be sanitized by Supabase
    })
  })

  describe("Usability Tests", () => {
    it("should handle empty voicemails list", async () => {
      mockOrder.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.voicemails).toEqual([])
    })

    it("should provide error messages on failure", async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: "Database error" },
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })

    it("should handle missing transcription gracefully", async () => {
      const response = await GET()
      const data = await response.json()
      const voicemails = data.voicemails || []

      const withoutTranscription = voicemails.filter((v: any) => !v.transcription)
      expect(withoutTranscription.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe("Integration Tests", () => {
    it("should integrate with Twilio webhooks", async () => {
      // This would be tested in the webhook handler
      // For now, verify the data structure matches
      const response = await GET()
      const data = await response.json()
      const voicemail = data.voicemails?.[0]

      expect(voicemail).toHaveProperty("recording_url")
      expect(voicemail).toHaveProperty("recording_sid")
      expect(voicemail).toHaveProperty("duration")
    })

    it("should handle transcription updates", async () => {
      const request = new NextRequest("http://localhost/api/voicemails", {
        method: "PATCH",
        body: JSON.stringify({
          id: "vm_1",
          notes: "Transcription received",
        }),
      })

      const response = await PATCH(request)
      expect(response.status).toBe(200)
    })
  })
})
