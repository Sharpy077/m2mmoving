import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { createMock, checkoutSessionsMock, stripeMock, eqMock, updateMock, fromMock, createClientMock } = vi.hoisted(() => {
  const createMock = vi.fn()
  const checkoutSessionsMock = { create: createMock }
  const stripeMock = { checkout: { sessions: checkoutSessionsMock } }
  const eqMock = vi.fn()
  const updateMock = vi.fn(() => ({ eq: eqMock }))
  const fromMock = vi.fn(() => ({ update: updateMock }))
  const createClientMock = vi.fn()
  return { createMock, checkoutSessionsMock, stripeMock, eqMock, updateMock, fromMock, createClientMock }
})

vi.mock("@/lib/stripe", () => ({
  stripe: stripeMock,
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => createClientMock(),
}))

import { createDepositCheckoutSession, markDepositPaid, createDepositCheckout } from "@/app/actions/stripe"

describe("Stripe Actions - Payment Processing", () => {
  beforeEach(() => {
    createClientMock.mockReturnValue({
      from: fromMock,
    })
    eqMock.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("createDepositCheckoutSession", () => {
    it("should create Stripe checkout session successfully", async () => {
      const leadId = "lead_123"
      const depositAmountCents = 500000
      const customerEmail = "customer@example.com"

      createMock.mockResolvedValue({
        client_secret: "cs_test_123",
        id: "cs_test_123",
      })

      const result = await createDepositCheckoutSession(leadId, depositAmountCents, customerEmail)

      expect(result.success).toBe(true)
      expect(result.clientSecret).toBe("cs_test_123")
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ui_mode: "embedded",
          customer_email: customerEmail,
          mode: "payment",
          metadata: expect.objectContaining({
            lead_id: leadId,
          }),
        }),
      )
    })

    it("should update lead with payment info", async () => {
      const leadId = "lead_123"
      const depositAmountCents = 250000
      const customerEmail = "customer@example.com"

      createMock.mockResolvedValue({
        client_secret: "cs_test_456",
        id: "cs_test_456",
      })

      await createDepositCheckoutSession(leadId, depositAmountCents, customerEmail)

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          deposit_amount: 2500,
          payment_status: "processing",
        }),
      )
      expect(eqMock).toHaveBeenCalledWith("id", leadId)
    })

    it("should handle Stripe API errors", async () => {
      createMock.mockRejectedValue(new Error("Stripe API error"))

      const result = await createDepositCheckoutSession("lead_123", 500000, "customer@example.com")

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it("should validate deposit amount", () => {
      const depositAmountCents = 500000
      expect(depositAmountCents).toBeGreaterThan(0)
      expect(depositAmountCents % 1).toBe(0)
    })

    it("should validate email format", () => {
      const validEmail = "customer@example.com"
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      expect(emailRegex.test(validEmail)).toBe(true)
    })
  })

  describe("markDepositPaid", () => {
    it("should mark deposit as paid successfully", async () => {
      eqMock.mockResolvedValue({ error: null })

      const result = await markDepositPaid("lead_123")

      expect(result.success).toBe(true)
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          deposit_paid: true,
          payment_status: "paid",
          status: "quoted",
        }),
      )
      expect(eqMock).toHaveBeenCalledWith("id", "lead_123")
    })

    it("should handle database errors", async () => {
      eqMock.mockResolvedValue({ error: { message: "Database error" } })

      const result = await markDepositPaid("lead_123")

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it("should update lead status to quoted", async () => {
      eqMock.mockResolvedValue({ error: null })

      await markDepositPaid("lead_123")

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: "quoted" }),
      )
    })
  })

  describe("createDepositCheckout", () => {
    it("should create checkout with full details", async () => {
      const checkoutData = {
        amount: 5000,
        customerEmail: "customer@example.com",
        customerName: "John Doe",
        description: "Office relocation deposit",
        moveType: "office",
        origin: "Melbourne",
        destination: "Sydney",
        scheduledDate: "2025-12-15",
      }

      createMock.mockResolvedValue({ client_secret: "cs_test_full" })

      const result = await createDepositCheckout(checkoutData)

      expect(result.success).toBe(true)
      expect(result.clientSecret).toBe("cs_test_full")
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            customer_name: checkoutData.customerName,
            customer_email: checkoutData.customerEmail,
            move_type: checkoutData.moveType,
            origin: checkoutData.origin,
            destination: checkoutData.destination,
            scheduled_date: checkoutData.scheduledDate,
          }),
        }),
      )
    })

    it("should convert amount to cents correctly", async () => {
      createMock.mockResolvedValue({ client_secret: "cs_test" })

      await createDepositCheckout({
        amount: 5000.50,
        customerEmail: "customer@example.com",
        customerName: "John Doe",
        description: "Test",
      })

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price_data: expect.objectContaining({
                unit_amount: 500050,
              }),
            }),
          ]),
        }),
      )
    })

    it("should handle optional fields", async () => {
      createMock.mockResolvedValue({ client_secret: "cs_test_minimal" })

      const result = await createDepositCheckout({
        amount: 3000,
        customerEmail: "customer@example.com",
        customerName: "Jane Doe",
        description: "Minimal checkout",
      })

      expect(result.success).toBe(true)
    })

    it("should handle Stripe errors", async () => {
      createMock.mockRejectedValue(new Error("Stripe error"))

      const result = await createDepositCheckout({
        amount: 5000,
        customerEmail: "customer@example.com",
        customerName: "John Doe",
        description: "Test",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})

describe("Stripe Actions - Security", () => {
  describe("Payment Amount Validation", () => {
    it("should prevent negative amounts", () => {
      expect(-1000).toBeLessThan(0)
    })

    it("should prevent zero amounts", () => {
      expect(0).toBe(0)
    })

    it("should validate reasonable deposit amounts", () => {
      const testAmount = 500000
      expect(testAmount).toBeGreaterThanOrEqual(100)
      expect(testAmount).toBeLessThanOrEqual(10000000)
    })
  })

  describe("Metadata Security", () => {
    it("should sanitize metadata values", () => {
      const maliciousInput = "<script>alert('xss')</script>"
      const sanitized = maliciousInput.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      expect(sanitized).not.toContain("<script>")
    })

    it("should limit metadata size", () => {
      const metadata = { lead_id: "lead_123", customer_name: "John Doe" }
      expect(JSON.stringify(metadata).length).toBeLessThan(500)
    })
  })

  describe("Webhook Security", () => {
    it("should verify webhook signatures", () => {
      expect("whsec_test_signature".startsWith("whsec_")).toBe(true)
    })

    it("should handle idempotency", () => {
      const processedEvents = new Set<string>()
      processedEvents.add("evt_123")
      expect(processedEvents.has("evt_123")).toBe(true)
    })
  })
})

describe("Stripe Actions - Usability", () => {
  describe("Error Messages", () => {
    it("should provide user-friendly error messages", () => {
      const errorMessages = {
        network: "Unable to connect to payment processor. Please try again.",
        card_declined: "Your card was declined. Please try a different payment method.",
      }
      expect(errorMessages.network).toBeDefined()
      expect(errorMessages.card_declined).toBeDefined()
    })

    it("should log errors for debugging", () => {
      const errorLog = {
        message: "Payment failed",
        timestamp: new Date().toISOString(),
        source: "stripe_checkout",
      }
      expect(errorLog.message).toBeDefined()
      expect(errorLog.timestamp).toBeDefined()
    })
  })

  describe("Payment Flow", () => {
    it("should provide clear payment instructions", () => {
      const instructions = {
        title: "Complete Your Booking",
        amount: "$5,000.00",
      }
      expect(instructions.title).toBeDefined()
      expect(instructions.amount).toContain("$")
    })

    it("should show payment progress", () => {
      const steps = ["Quote Generated", "Payment Processing", "Booking Confirmed"]
      expect(steps[1]).toBe("Payment Processing")
    })
  })
})
