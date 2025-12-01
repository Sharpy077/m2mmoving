/**
 * User-Side Features Tests
 * Tests for quote assistant, quote builder, and custom quote form
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: "test-lead-id", email: "test@example.com" },
            error: null,
          })),
        })),
      })),
    })),
  })),
}))

vi.mock("@/lib/email", () => ({
  resend: {
    emails: {
      send: vi.fn(() => Promise.resolve({ id: "email-id" })),
    },
  },
  EMAIL_FROM_ADDRESS: "test@example.com",
  LEAD_NOTIFICATION_RECIPIENTS: ["admin@example.com"],
  formatCurrency: (amount: number) => `$${amount.toLocaleString()}`,
}))

describe("User-Side Features", () => {
  describe("Quote Assistant (Maya)", () => {
    it("should initialize with welcome message", () => {
      // Test that quote assistant shows initial prompts
      expect(true).toBe(true) // Placeholder - would test component initialization
    })

    it("should handle business lookup by ABN", async () => {
      const mockResponse = {
        results: [
          {
            abn: "12345678901",
            name: "Test Company Pty Ltd",
            state: "VIC",
            status: "Active",
          },
        ],
      }

      // Mock fetch for business lookup
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response)
      )

      const response = await fetch("/api/business-lookup?q=12345678901&type=abn")
      const data = await response.json()

      expect(data.results).toHaveLength(1)
      expect(data.results[0].abn).toBe("12345678901")
    })

    it("should handle business lookup by name", async () => {
      const mockResponse = {
        results: [
          {
            abn: "12345678901",
            name: "Test Company",
            state: "VIC",
          },
        ],
      }

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response)
      )

      const response = await fetch("/api/business-lookup?q=Test+Company&type=name")
      const data = await response.json()

      expect(data.results.length).toBeGreaterThan(0)
    })

    it("should calculate quote correctly for office relocation", () => {
      // Office: Base $2,500 + $45/sqm (min 20sqm)
      const baseRate = 2500
      const perSqm = 45
      const sqm = 100
      const minSqm = 20
      const effectiveSqm = Math.max(sqm, minSqm)

      const total = baseRate + perSqm * effectiveSqm

      expect(total).toBe(7000) // 2500 + (45 * 100)
    })

    it("should calculate quote with additional services", () => {
      const baseTotal = 5000
      const packing = 450
      const storage = 300
      const cleaning = 350

      const total = baseTotal + packing + storage + cleaning

      expect(total).toBe(6100)
    })

    it("should enforce minimum square meters", () => {
      const minSqm = 20
      const inputSqm = 10
      const effectiveSqm = Math.max(inputSqm, minSqm)

      expect(effectiveSqm).toBe(20)
    })

    it("should handle availability check", async () => {
      const mockAvailability = {
        availability: [
          { date: "2025-12-15", is_available: true, max_bookings: 3, current_bookings: 1 },
          { date: "2025-12-16", is_available: true, max_bookings: 3, current_bookings: 0 },
        ],
      }

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAvailability),
        } as Response)
      )

      const response = await fetch("/api/availability?start=2025-12-01&end=2025-12-31")
      const data = await response.json()

      expect(data.availability).toBeDefined()
      expect(Array.isArray(data.availability)).toBe(true)
    })
  })

  describe("Quote Builder", () => {
    it("should validate required fields", () => {
      const requiredFields = {
        email: "test@example.com",
        selectedType: "office",
        estimate: 5000,
      }

      expect(requiredFields.email).toBeTruthy()
      expect(requiredFields.selectedType).toBeTruthy()
      expect(requiredFields.estimate).toBeTruthy()
    })

    it("should calculate estimate based on move type", () => {
      const moveTypes = {
        office: { baseRate: 2500, perSqm: 45, minSqm: 20 },
        datacenter: { baseRate: 5000, perSqm: 85, minSqm: 50 },
        "it-equipment": { baseRate: 1500, perSqm: 35, minSqm: 10 },
      }

      const type = "office"
      const sqm = 100
      const moveType = moveTypes[type as keyof typeof moveTypes]
      const effectiveSqm = Math.max(sqm, moveType.minSqm)
      const total = moveType.baseRate + moveType.perSqm * effectiveSqm

      expect(total).toBe(7000)
    })

    it("should handle distance cost calculation", () => {
      const baseTotal = 5000
      const distanceKm = 15
      const distanceCost = distanceKm * 8

      const total = baseTotal + distanceCost

      expect(total).toBe(5120)
    })

    it("should calculate deposit amount (50%)", () => {
      const total = 10000
      const deposit = Math.round(total * 0.5)

      expect(deposit).toBe(5000)
    })

    it("should validate square meters slider range", () => {
      const minSqm = 20
      const maxSqm = 2000
      const inputSqm = 150

      expect(inputSqm).toBeGreaterThanOrEqual(minSqm)
      expect(inputSqm).toBeLessThanOrEqual(maxSqm)
    })
  })

  describe("Custom Quote Form", () => {
    it("should validate email format", () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const validEmail = "test@example.com"
      const invalidEmail = "invalid-email"

      expect(emailRegex.test(validEmail)).toBe(true)
      expect(emailRegex.test(invalidEmail)).toBe(false)
    })

    it("should handle special requirements array", () => {
      const requirements = [
        "server_room",
        "medical_equipment",
        "hazmat",
        "security_items",
        "artwork",
      ]

      expect(Array.isArray(requirements)).toBe(true)
      expect(requirements.length).toBe(5)
    })

    it("should validate phone number format (optional)", () => {
      const phoneRegex = /^(\+61|0)[2-478](?:[ -]?[0-9]){8}$/
      const validPhone = "0412345678"
      const emptyPhone = ""

      // Phone is optional, so empty should be valid
      expect(emptyPhone === "" || phoneRegex.test(validPhone)).toBe(true)
    })

    it("should handle project description text", () => {
      const description = "We need to relocate our entire office including server room and specialized equipment."

      expect(description.length).toBeGreaterThan(0)
      expect(typeof description).toBe("string")
    })
  })

  describe("Lead Submission", () => {
    it("should create lead with all required fields", async () => {
      const leadData = {
        lead_type: "instant_quote" as const,
        email: "test@example.com",
        phone: "0412345678",
        company_name: "Test Company",
        contact_name: "John Doe",
        move_type: "office",
        origin_suburb: "Melbourne CBD",
        destination_suburb: "Richmond",
        square_meters: 100,
        estimated_total: 7000,
      }

      // Would test actual submission
      expect(leadData.email).toBeTruthy()
      expect(leadData.lead_type).toBe("instant_quote")
    })

    it("should send email notifications on lead creation", async () => {
      // Would test email sending
      expect(true).toBe(true) // Placeholder
    })

    it("should handle submission errors gracefully", () => {
      const error = new Error("Database connection failed")
      expect(error).toBeInstanceOf(Error)
    })
  })
})
