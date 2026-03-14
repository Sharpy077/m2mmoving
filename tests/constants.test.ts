import { describe, it, expect } from "vitest"
import {
  COMPANY_NAME,
  COMPANY_ABN,
  COMPANY_PHONE,
  EMAIL_NOTIFICATIONS,
  EMAIL_SALES,
  EMAIL_ADMIN,
  EMAIL_OPERATIONS,
  EMAIL_FROM,
  DISTANCE_RATE_PER_KM,
  DEPOSIT_PERCENTAGE,
} from "@/lib/constants"

describe("lib/constants", () => {
  describe("Company identity", () => {
    it("exports the correct company name", () => {
      expect(COMPANY_NAME).toBe("M&M Commercial Moving")
    })

    it("exports the correct ABN", () => {
      expect(COMPANY_ABN).toBe("71 661 027 309")
    })

    it("exports the correct phone number", () => {
      expect(COMPANY_PHONE).toBe("03 8820 1801")
    })
  })

  describe("Email addresses", () => {
    it("exports notifications email", () => {
      expect(EMAIL_NOTIFICATIONS).toBe("notifications@m2mmoving.au")
    })

    it("exports sales email", () => {
      expect(EMAIL_SALES).toBe("sales@m2mmoving.au")
    })

    it("exports admin email", () => {
      expect(EMAIL_ADMIN).toBe("admin@m2mmoving.au")
    })

    it("exports operations email", () => {
      expect(EMAIL_OPERATIONS).toBe("operations@m2mmoving.au")
    })

    it("EMAIL_FROM includes company name and notifications email", () => {
      expect(EMAIL_FROM).toContain(COMPANY_NAME)
      expect(EMAIL_FROM).toContain(EMAIL_NOTIFICATIONS)
    })
  })

  describe("Pricing constants", () => {
    it("exports distance rate as $8 per km", () => {
      expect(DISTANCE_RATE_PER_KM).toBe(8)
    })

    it("exports deposit percentage as 50%", () => {
      expect(DEPOSIT_PERCENTAGE).toBe(0.5)
    })

    it("deposit percentage calculates correctly for a $10,000 quote", () => {
      const total = 10_000
      expect(Math.round(total * DEPOSIT_PERCENTAGE)).toBe(5_000)
    })

    it("distance rate calculates correctly for 25 km", () => {
      expect(25 * DISTANCE_RATE_PER_KM).toBe(200)
    })
  })
})
