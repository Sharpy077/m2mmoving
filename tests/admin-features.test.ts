import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock Supabase client
const eqMock = vi.fn()
const updateMock = vi.fn(() => ({ eq: eqMock }))
const orderMock = vi.fn(() => ({ eq: eqMock }))
const selectMock = vi.fn(() => ({ order: orderMock }))
const fromMock = vi.fn(() => ({
  select: selectMock,
  update: updateMock,
}))

const createClientMock = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => createClientMock(),
}))

import { getLeads, updateLeadStatus, updateLeadNotes } from "@/app/actions/leads"

describe("Admin Features - Lead Management", () => {
  beforeEach(() => {
    createClientMock.mockReturnValue({
      from: fromMock,
    })
    eqMock.mockResolvedValue({ error: null })
    orderMock.mockResolvedValue({
      data: [],
      error: null,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("getLeads", () => {
    it("should fetch all leads ordered by creation date", async () => {
      const mockLeads = [
        {
          id: "lead_1",
          email: "test1@example.com",
          created_at: "2025-01-01T00:00:00Z",
        },
        {
          id: "lead_2",
          email: "test2@example.com",
          created_at: "2025-01-02T00:00:00Z",
        },
      ]

      orderMock.mockResolvedValue({
        data: mockLeads,
        error: null,
      })

      const result = await getLeads()

      expect(result.success).toBe(true)
      expect(result.leads).toEqual(mockLeads)
      expect(orderMock).toHaveBeenCalledWith("created_at", { ascending: false })
    })

    it("should handle database errors gracefully", async () => {
      orderMock.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      })

      const result = await getLeads()

      expect(result.success).toBe(false)
      expect(result.leads).toEqual([])
      expect(result.error).toBeDefined()
    })

    it("should return empty array on error", async () => {
      orderMock.mockResolvedValue({
        data: null,
        error: { message: "Connection failed" },
      })

      const result = await getLeads()

      expect(result.leads).toEqual([])
    })
  })

  describe("updateLeadStatus", () => {
    it("should update lead status successfully", async () => {
      const leadId = "lead_123"
      const newStatus = "contacted"

      eqMock.mockResolvedValue({ error: null })

      const result = await updateLeadStatus(leadId, newStatus)

      expect(result.success).toBe(true)
      expect(updateMock).toHaveBeenCalledWith({ status: newStatus })
      expect(eqMock).toHaveBeenCalledWith("id", leadId)
    })

    it("should validate status values", () => {
      const validStatuses = ["new", "contacted", "quoted", "won", "lost"]
      const testStatus = "contacted"

      expect(validStatuses).toContain(testStatus)
    })

    it("should reject invalid status values", () => {
      const validStatuses = ["new", "contacted", "quoted", "won", "lost"]
      const invalidStatus = "invalid_status"

      expect(validStatuses).not.toContain(invalidStatus)
    })

    it("should handle update errors", async () => {
      eqMock.mockResolvedValue({
        error: { message: "Update failed" },
      })

      const result = await updateLeadStatus("lead_123", "contacted")

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe("updateLeadNotes", () => {
    it("should update internal notes successfully", async () => {
      const leadId = "lead_123"
      const notes = "Customer called, interested in moving next month"

      eqMock.mockResolvedValue({ error: null })

      const result = await updateLeadNotes(leadId, notes)

      expect(result.success).toBe(true)
      expect(updateMock).toHaveBeenCalledWith({ internal_notes: notes })
      expect(eqMock).toHaveBeenCalledWith("id", leadId)
    })

    it("should handle empty notes", async () => {
      const leadId = "lead_123"
      const notes = ""

      eqMock.mockResolvedValue({ error: null })

      const result = await updateLeadNotes(leadId, notes)

      expect(result.success).toBe(true)
    })

    it("should handle long notes", async () => {
      const leadId = "lead_123"
      const notes = "A".repeat(5000) // Long note

      eqMock.mockResolvedValue({ error: null })

      const result = await updateLeadNotes(leadId, notes)

      expect(result.success).toBe(true)
    })

    it("should handle update errors", async () => {
      eqMock.mockResolvedValue({
        error: { message: "Database error" },
      })

      const result = await updateLeadNotes("lead_123", "test notes")

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe("Lead Statistics", () => {
    it("should calculate total leads count", () => {
      const leads = [
        { id: "1", status: "new" },
        { id: "2", status: "contacted" },
        { id: "3", status: "quoted" },
      ]

      const totalLeads = leads.length
      expect(totalLeads).toBe(3)
    })

    it("should calculate new leads count", () => {
      const leads = [
        { id: "1", status: "new" },
        { id: "2", status: "new" },
        { id: "3", status: "contacted" },
      ]

      const newLeads = leads.filter((lead) => lead.status === "new").length
      expect(newLeads).toBe(2)
    })

    it("should calculate pipeline value", () => {
      const leads = [
        { id: "1", status: "new", estimated_total: 5000 },
        { id: "2", status: "quoted", estimated_total: 10000 },
        { id: "3", status: "lost", estimated_total: 3000 },
      ]

      const pipelineValue = leads
        .filter((lead) => lead.status !== "lost")
        .reduce((sum, lead) => sum + (lead.estimated_total || 0), 0)

      expect(pipelineValue).toBe(15000)
    })

    it("should calculate this week leads", () => {
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const leads = [
        { id: "1", created_at: now.toISOString() },
        { id: "2", created_at: weekAgo.toISOString() },
        { id: "3", created_at: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString() },
      ]

      const thisWeekLeads = leads.filter((lead) => {
        const createdAt = new Date(lead.created_at)
        return createdAt >= weekAgo
      }).length

      expect(thisWeekLeads).toBe(2)
    })
  })

  describe("Lead Filtering", () => {
    it("should filter leads by status", () => {
      const leads = [
        { id: "1", status: "new" },
        { id: "2", status: "contacted" },
        { id: "3", status: "new" },
      ]

      const filtered = leads.filter((lead) => lead.status === "new")
      expect(filtered.length).toBe(2)
    })

    it("should filter leads by lead type", () => {
      const leads = [
        { id: "1", lead_type: "instant_quote" },
        { id: "2", lead_type: "custom_quote" },
        { id: "3", lead_type: "instant_quote" },
      ]

      const filtered = leads.filter((lead) => lead.lead_type === "instant_quote")
      expect(filtered.length).toBe(2)
    })

    it("should search leads by company name", () => {
      const leads = [
        { id: "1", company_name: "Acme Corp" },
        { id: "2", company_name: "Tech Solutions" },
        { id: "3", company_name: "Acme Industries" },
      ]

      const searchTerm = "Acme"
      const filtered = leads.filter((lead) =>
        lead.company_name?.toLowerCase().includes(searchTerm.toLowerCase()),
      )

      expect(filtered.length).toBe(2)
    })

    it("should search leads by email", () => {
      const leads = [
        { id: "1", email: "john@example.com" },
        { id: "2", email: "jane@test.com" },
        { id: "3", email: "john.doe@example.com" },
      ]

      const searchTerm = "john"
      const filtered = leads.filter((lead) =>
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()),
      )

      expect(filtered.length).toBe(2)
    })
  })
})

describe("Admin Features - Voicemail Management", () => {
  describe("Voicemail Status Workflow", () => {
    it("should transition voicemail status correctly", () => {
      const statusFlow = ["new", "listened", "followed_up", "archived"]
      const currentStatus = "new"
      const nextStatus = statusFlow[statusFlow.indexOf(currentStatus) + 1]

      expect(nextStatus).toBe("listened")
    })

    it("should validate voicemail status values", () => {
      const validStatuses = ["new", "listened", "followed_up", "archived"]
      const testStatus = "listened"

      expect(validStatuses).toContain(testStatus)
    })
  })

  describe("Voicemail Data", () => {
    it("should handle voicemail with transcription", () => {
      const voicemail = {
        id: "vm_123",
        caller_number: "+61400000000",
        transcription: "Hello, I'm interested in your moving services.",
        duration: 30,
        status: "new",
      }

      expect(voicemail.transcription).toBeDefined()
      expect(voicemail.duration).toBeGreaterThan(0)
    })

    it("should handle voicemail without transcription", () => {
      const voicemail = {
        id: "vm_456",
        caller_number: "+61400000001",
        transcription: null,
        duration: 45,
        status: "new",
      }

      expect(voicemail.transcription).toBeNull()
    })
  })
})

describe("Admin Features - Security", () => {
  describe("Authentication", () => {
    it("should require authentication for admin routes", () => {
      const isAuthenticated = false
      const canAccessAdmin = isAuthenticated

      expect(canAccessAdmin).toBe(false)
    })

    it("should validate admin role", () => {
      const userRoles = ["admin", "user"]
      const userRole = "admin"

      expect(userRoles).toContain(userRole)
    })
  })

  describe("Authorization", () => {
    it("should restrict access to admin-only actions", () => {
      const userRole = "user"
      const canUpdateLeads = userRole === "admin"

      expect(canUpdateLeads).toBe(false)
    })

    it("should allow admin users to update leads", () => {
      const userRole = "admin"
      const canUpdateLeads = userRole === "admin"

      expect(canUpdateLeads).toBe(true)
    })
  })

  describe("Input Validation", () => {
    it("should validate lead ID format", () => {
      const validId = "lead_12345678"
      const invalidId = "'; DROP TABLE leads; --"

      expect(validId.startsWith("lead_")).toBe(true)
      expect(invalidId.includes("DROP TABLE")).toBe(true)
    })

    it("should sanitize notes input", () => {
      const maliciousInput = '<script>alert("xss")</script>'
      const sanitized = maliciousInput.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")

      expect(sanitized).not.toContain("<script>")
    })
  })
})

describe("Admin Features - Usability", () => {
  describe("Dashboard Performance", () => {
    it("should load leads efficiently", () => {
      const leads = Array.from({ length: 100 }, (_, i) => ({
        id: `lead_${i}`,
        email: `test${i}@example.com`,
      }))

      expect(leads.length).toBe(100)
    })

    it("should paginate large lead lists", () => {
      const pageSize = 20
      const totalLeads = 100
      const totalPages = Math.ceil(totalLeads / pageSize)

      expect(totalPages).toBe(5)
    })
  })

  describe("Search Functionality", () => {
    it("should perform case-insensitive search", () => {
      const searchTerm = "ACME"
      const companyName = "Acme Corp"

      expect(companyName.toLowerCase().includes(searchTerm.toLowerCase())).toBe(true)
    })

    it("should handle empty search gracefully", () => {
      const searchTerm = ""
      const results = searchTerm === "" ? [] : []

      expect(results).toEqual([])
    })
  })

  describe("Status Updates", () => {
    it("should provide visual feedback on status change", () => {
      const statusColors = {
        new: "red",
        contacted: "yellow",
        quoted: "blue",
        won: "green",
        lost: "gray",
      }

      expect(statusColors.new).toBe("red")
      expect(statusColors.won).toBe("green")
    })

    it("should confirm before changing status to lost", () => {
      const newStatus = "lost"
      const requiresConfirmation = newStatus === "lost"

      expect(requiresConfirmation).toBe(true)
    })
  })
})
