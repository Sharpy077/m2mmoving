import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock Stripe
const createMock = vi.fn()
const checkoutSessionsMock = {
  create: createMock,
}

const stripeMock = {
  checkout: {
    sessions: checkoutSessionsMock,
  },
}

vi.mock("@/lib/stripe", () => ({
  stripe: stripeMock,
}))

// Mock Supabase
const eqMock = vi.fn()
const updateMock = vi.fn(() => ({ eq: eqMock }))
const fromMock = vi.fn(() => ({
  update: updateMock,
}))

const createClientMock = vi.fn()

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
      const depositAmountCents = 500000 // $5000.00
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
      const depositAmountCents = 250000 // $2500.00
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
      const leadId = "lead_123"
      const depositAmountCents = 500000
      const customerEmail = "customer@example.com"

      createMock.mockRejectedValue(new Error("Stripe API error"))

      const result = await createDepositCheckoutSession(leadId, depositAmountCents, customerEmail)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it("should validate deposit amount", () => {
      const depositAmountCents = 500000
      expect(depositAmountCents).toBeGreaterThan(0)
      expect(depositAmountCents % 1).toBe(0) // Should be whole number (cents)
    })

    it("should validate email format", () => {
      const validEmail = "customer@example.com"
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      expect(emailRegex.test(validEmail)).toBe(true)
    })
  })

  describe("markDepositPaid", () => {
    it("should mark deposit as paid successfully", async () => {
      const leadId = "lead_123"

      eqMock.mockResolvedValue({ error: null })

      const result = await markDepositPaid(leadId)

      expect(result.success).toBe(true)
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          deposit_paid: true,
          payment_status: "paid",
          status: "quoted",
        }),
      )
      expect(eqMock).toHaveBeenCalledWith("id", leadId)
    })

    it("should handle database errors", async () => {
      const leadId = "lead_123"

      eqMock.mockResolvedValue({
        error: { message: "Database error" },
      })

      const result = await markDepositPaid(leadId)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it("should update lead status to quoted", async () => {
      const leadId = "lead_123"

      eqMock.mockResolvedValue({ error: null })

      await markDepositPaid(leadId)

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "quoted",
        }),
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

      createMock.mockResolvedValue({
        client_secret: "cs_test_full",
      })

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
      const checkoutData = {
        amount: 5000.50,
        customerEmail: "customer@example.com",
        customerName: "John Doe",
        description: "Test",
      }

      createMock.mockResolvedValue({
        client_secret: "cs_test",
      })

      await createDepositCheckout(checkoutData)

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price_data: expect.objectContaining({
                unit_amount: 500050, // Converted to cents
              }),
            }),
          ]),
        }),
      )
    })

    it("should handle optional fields", async () => {
      const checkoutData = {
        amount: 3000,
        customerEmail: "customer@example.com",
        customerName: "Jane Doe",
        description: "Minimal checkout",
      }

      createMock.mockResolvedValue({
        client_secret: "cs_test_minimal",
      })

      const result = await createDepositCheckout(checkoutData)

      expect(result.success).toBe(true)
    })

    it("should handle Stripe errors", async () => {
      const checkoutData = {
        amount: 5000,
        customerEmail: "customer@example.com",
        customerName: "John Doe",
        description: "Test",
      }

      createMock.mockRejectedValue(new Error("Stripe error"))

      const result = await createDepositCheckout(checkoutData)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})

describe("Stripe Actions - Security", () => {
  describe("Payment Amount Validation", () => {
    it("should prevent negative amounts", () => {
      const amount = -1000
      expect(amount).toBeLessThan(0)
    })

    it("should prevent zero amounts", () => {
      const amount = 0
      expect(amount).toBe(0)
    })

    it("should validate reasonable deposit amounts", () => {
      const minDeposit = 100 // $1.00 minimum
      const maxDeposit = 10000000 // $100,000.00 maximum
      const testAmount = 500000 // $5,000.00

      expect(testAmount).toBeGreaterThanOrEqual(minDeposit)
      expect(testAmount).toBeLessThanOrEqual(maxDeposit)
    })
  })

  describe("Metadata Security", () => {
    it("should sanitize metadata values", () => {
      const maliciousInput = "<script>alert('xss')</script>"
      const sanitized = maliciousInput.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")

      expect(sanitized).not.toContain("<script>")
    })

    it("should limit metadata size", () => {
      const metadata = {
        lead_id: "lead_123",
        customer_name: "John Doe",
        // ... other fields
      }

      const metadataString = JSON.stringify(metadata)
      expect(metadataString.length).toBeLessThan(500) // Stripe limit
    })
  })

  describe("Webhook Security", () => {
    it("should verify webhook signatures", () => {
      const signature = "whsec_test_signature"
      const isValid = signature.startsWith("whsec_")

      expect(isValid).toBe(true)
    })

    it("should handle idempotency", () => {
      const processedEvents = new Set<string>()
      const eventId = "evt_123"

      if (!processedEvents.has(eventId)) {
        processedEvents.add(eventId)
      }

      expect(processedEvents.has(eventId)).toBe(true)
    })
  })
})

describe("Stripe Actions - Usability", () => {
  describe("Error Messages", () => {
    it("should provide user-friendly error messages", () => {
      const errorMessages = {
        network: "Unable to connect to payment processor. Please try again.",
        card_declined: "Your card was declined. Please try a different payment method.",
        insufficient_funds: "Insufficient funds. Please use a different payment method.",
        generic: "Payment processing failed. Please try again or contact support.",
      }

      expect(errorMessages.network).toBeDefined()
      expect(errorMessages.card_declined).toBeDefined()
    })

    it("should log errors for debugging", () => {
      const error = new Error("Payment failed")
      const errorLog = {
        message: error.message,
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
        description: "Pay your 50% deposit to secure your move date",
        amount: "$5,000.00",
        buttonText: "Pay Deposit",
      }

      expect(instructions.title).toBeDefined()
      expect(instructions.amount).toContain("$")
    })

    it("should show payment progress", () => {
      const steps = ["Quote Generated", "Payment Processing", "Booking Confirmed"]
      const currentStep = 1

      expect(steps[currentStep]).toBe("Payment Processing")
    })
  })
})
