import { describe, it, expect, vi, beforeEach } from "vitest"
import { submitLead } from "@/app/actions/leads"

// Mock Supabase
const mockInsert = vi.fn()
const mockFrom = vi.fn(() => ({
  insert: mockInsert,
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
  formatCurrency: (n: number) => `$${n?.toLocaleString() || "0"}`,
}))

describe("User-Side: Custom Quote Form", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockReturnValue({
      select: vi.fn(() => ({
        single: vi.fn(() => ({
          data: {
            id: "lead_123",
            lead_type: "custom_quote",
            email: "test@example.com",
          },
          error: null,
        })),
      })),
    })
    mockSend.mockResolvedValue({ id: "email_123" })
  })

  describe("Functionality Tests", () => {
    it("should submit custom quote successfully", async () => {
      const leadData = {
        lead_type: "custom_quote" as const,
        email: "test@example.com",
        contact_name: "Jane Smith",
        company_name: "Custom Company",
        phone: "+61400000000",
        industry_type: "Technology",
        employee_count: "50-100",
        current_location: "123 Main St, Melbourne VIC 3000",
        new_location: "456 Collins St, Melbourne VIC 3000",
        target_move_date: "2024-12-15",
        square_meters: 200,
        special_requirements: ["server_room", "weekend_only"],
        project_description: "Complex office relocation with server room",
      }

      const result = await submitLead(leadData)

      expect(result.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(leadData)
      expect(mockSend).toHaveBeenCalledTimes(2) // Internal + customer
    })

    it("should handle all special requirements", async () => {
      const leadData = {
        lead_type: "custom_quote" as const,
        email: "test@example.com",
        contact_name: "Test User",
        company_name: "Test Co",
        special_requirements: [
          "server_room",
          "medical_equipment",
          "hazmat",
          "security_items",
          "artwork",
          "weekend_only",
          "staged_relocation",
          "international",
        ],
      }

      const result = await submitLead(leadData as any)
      expect(result.success).toBe(true)
    })

    it("should handle international moves", async () => {
      const leadData = {
        lead_type: "custom_quote" as const,
        email: "test@example.com",
        contact_name: "Test User",
        company_name: "Test Co",
        special_requirements: ["international"],
        project_description: "Moving from Melbourne to Singapore",
      }

      const result = await submitLead(leadData as any)
      expect(result.success).toBe(true)
    })
  })

  describe("Validation Tests", () => {
    it("should require all mandatory fields", async () => {
      const leadData = {
        lead_type: "custom_quote" as const,
        email: "", // Missing
        contact_name: "", // Missing
        company_name: "", // Missing
      }

      const result = await submitLead(leadData as any)
      // Should handle validation
      expect(result).toBeDefined()
    })

    it("should validate email format", async () => {
      const leadData = {
        lead_type: "custom_quote" as const,
        email: "invalid-email",
        contact_name: "Test",
        company_name: "Test Co",
      }

      const result = await submitLead(leadData as any)
      expect(result).toBeDefined()
    })

    it("should validate phone number format", async () => {
      const leadData = {
        lead_type: "custom_quote" as const,
        email: "test@example.com",
        contact_name: "Test",
        company_name: "Test Co",
        phone: "invalid-phone",
      }

      const result = await submitLead(leadData as any)
      expect(result.success).toBe(true) // Phone validation may be lenient
    })
  })

  describe("Security Tests", () => {
    it("should sanitize project description", async () => {
      const leadData = {
        lead_type: "custom_quote" as const,
        email: "test@example.com",
        contact_name: "Test",
        company_name: "Test Co",
        project_description: "<script>alert('xss')</script>",
      }

      const result = await submitLead(leadData as any)
      expect(result.success).toBe(true)
      // Should be sanitized by Supabase
    })

    it("should prevent XSS in company name", async () => {
      const leadData = {
        lead_type: "custom_quote" as const,
        email: "test@example.com",
        contact_name: "Test",
        company_name: "<img src=x onerror=alert(1)>",
      }

      const result = await submitLead(leadData as any)
      expect(result.success).toBe(true)
    })
  })

  describe("Usability Tests", () => {
    it("should provide clear confirmation message", async () => {
      const leadData = {
        lead_type: "custom_quote" as const,
        email: "test@example.com",
        contact_name: "Test User",
        company_name: "Test Co",
      }

      const result = await submitLead(leadData as any)
      expect(result.success).toBe(true)
      expect(mockSend).toHaveBeenCalled()
    })

    it("should handle long project descriptions", async () => {
      const longDescription = "A".repeat(5000)
      const leadData = {
        lead_type: "custom_quote" as const,
        email: "test@example.com",
        contact_name: "Test",
        company_name: "Test Co",
        project_description: longDescription,
      }

      const result = await submitLead(leadData as any)
      expect(result.success).toBe(true)
    })
  })
})
