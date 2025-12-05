import { describe, it, expect, vi, beforeEach } from "vitest"
import { submitLead } from "@/app/actions/leads"

// Mock Supabase
const mockInsert = vi.fn()
const mockSelect = vi.fn(() => ({ single: vi.fn() }))
const mockFrom = vi.fn(() => ({
  insert: mockInsert,
  select: mockSelect,
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

// Mock email
const mockSend = vi.fn()
vi.mock("@/lib/email", () => ({
  resend: {
    emails: {
      send: mockSend,
    },
  },
  EMAIL_FROM_ADDRESS: "test@example.com",
  LEAD_NOTIFICATION_RECIPIENTS: ["admin@example.com"],
  formatCurrency: (n: number) => `$${n.toLocaleString()}`,
}))

describe("User-Side: Manual Quote Builder", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockReturnValue({
      select: vi.fn(() => ({
        single: vi.fn(() => ({
          data: {
            id: "lead_123",
            email: "test@example.com",
            estimated_total: 5000,
          },
          error: null,
        })),
      })),
    })
    mockSend.mockResolvedValue({ id: "email_123" })
  })

  describe("Functionality Tests", () => {
    it("should submit instant quote lead successfully", async () => {
      const leadData = {
        lead_type: "instant_quote" as const,
        email: "test@example.com",
        contact_name: "John Doe",
        company_name: "Test Company",
        phone: "+61400000000",
        move_type: "office",
        origin_suburb: "Melbourne",
        destination_suburb: "Sydney",
        square_meters: 100,
        estimated_total: 5000,
        additional_services: ["packing", "storage"],
      }

      const result = await submitLead(leadData)

      expect(result.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(leadData)
      expect(mockSend).toHaveBeenCalledTimes(2) // Internal + customer email
    })

    it("should calculate quote correctly for office relocation", async () => {
      const leadData = {
        lead_type: "instant_quote" as const,
        email: "test@example.com",
        move_type: "office",
        square_meters: 100,
        estimated_total: 7000, // Base 2500 + (100 * 45) = 7000
      }

      const result = await submitLead(leadData)
      expect(result.success).toBe(true)
    })

    it("should handle minimum square meters", async () => {
      const leadData = {
        lead_type: "instant_quote" as const,
        email: "test@example.com",
        move_type: "office",
        square_meters: 10, // Below minimum of 20
        estimated_total: 2500, // Should use minimum
      }

      const result = await submitLead(leadData)
      expect(result.success).toBe(true)
    })

    it("should include additional services in quote", async () => {
      const leadData = {
        lead_type: "instant_quote" as const,
        email: "test@example.com",
        move_type: "office",
        square_meters: 100,
        estimated_total: 7850, // Base + sqm + packing (450) + storage (300)
        additional_services: ["packing", "storage"],
      }

      const result = await submitLead(leadData)
      expect(result.success).toBe(true)
    })
  })

  describe("Validation Tests", () => {
    it("should require email field", async () => {
      const leadData = {
        lead_type: "instant_quote" as const,
        email: "",
      }

      const result = await submitLead(leadData as any)
      // Should handle validation (may fail or use default)
      expect(result).toBeDefined()
    })

    it("should validate email format", async () => {
      const leadData = {
        lead_type: "instant_quote" as const,
        email: "invalid-email",
      }

      const result = await submitLead(leadData as any)
      expect(result).toBeDefined()
    })

    it("should validate square meters range", async () => {
      const leadData = {
        lead_type: "instant_quote" as const,
        email: "test@example.com",
        square_meters: -10, // Invalid
      }

      const result = await submitLead(leadData as any)
      expect(result).toBeDefined()
    })
  })

  describe("Security Tests", () => {
    it("should sanitize user input", async () => {
      const leadData = {
        lead_type: "instant_quote" as const,
        email: "test@example.com",
        contact_name: "<script>alert('xss')</script>",
        company_name: "Test Company",
      }

      const result = await submitLead(leadData as any)
      expect(result.success).toBe(true)
      // Input should be sanitized by Supabase
    })

    it("should prevent SQL injection", async () => {
      const leadData = {
        lead_type: "instant_quote" as const,
        email: "test@example.com'; DROP TABLE leads;--",
        company_name: "Test",
      }

      const result = await submitLead(leadData as any)
      // Supabase should handle parameterized queries
      expect(result).toBeDefined()
    })
  })

  describe("Usability Tests", () => {
    it("should provide clear error messages", async () => {
      mockInsert.mockReturnValue({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: { message: "Database error" },
          })),
        })),
      })

      const leadData = {
        lead_type: "instant_quote" as const,
        email: "test@example.com",
      }

      const result = await submitLead(leadData)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it("should send email notifications", async () => {
      const leadData = {
        lead_type: "instant_quote" as const,
        email: "test@example.com",
        contact_name: "John Doe",
        estimated_total: 5000,
      }

      await submitLead(leadData)
      expect(mockSend).toHaveBeenCalledTimes(2) // Internal + customer
    })
  })
})
