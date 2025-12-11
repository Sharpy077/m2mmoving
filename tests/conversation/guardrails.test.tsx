/**
 * Guardrails Test Suite
 * Tests for conversation guardrails and error handling
 */

import { describe, it, expect, beforeEach } from "vitest"
import {
  validateResponse,
  checkConversationHealth,
  generateRecoveryResponse,
  generateToolFollowUp,
  validateUserInput,
  shouldEscalateToHuman,
} from "@/lib/conversation/guardrails"
import type { ConversationContext } from "@/lib/conversation/state-machine"

describe("Conversation Guardrails", () => {
  let mockContext: ConversationContext

  beforeEach(() => {
    mockContext = {
      stage: "service_select",
      lastMessageTime: Date.now(),
      errorCount: 0,
      stageStartTime: Date.now(),
      qualifyingAnswers: {},
      inventoryItems: [],
    }
  })

  describe("validateResponse", () => {
    it("should pass for valid response with question", () => {
      const result = validateResponse(
        "Great! What type of move are you planning?",
        [],
        "service_select",
        "I need a quote",
      )
      expect(result.passed).toBe(true)
      expect(result.violations).toHaveLength(0)
    })

    it("should flag empty response with tool calls", () => {
      const result = validateResponse("", ["lookupBusiness"], "business_lookup", "My business is Test Company")
      expect(result.passed).toBe(false)
      expect(result.violations.some((v) => v.type === "tool_without_text")).toBe(true)
    })

    it("should flag completely empty response", () => {
      const result = validateResponse("", [], "service_select", "test")
      expect(result.passed).toBe(false)
      expect(result.violations.some((v) => v.type === "empty_response")).toBe(true)
    })

    it("should warn about too many questions", () => {
      const result = validateResponse(
        "What's your business? What type of move? When do you need it? Where from? Where to?",
        [],
        "greeting",
        "hi",
      )
      expect(result.violations.some((v) => v.type === "multiple_questions")).toBe(true)
    })

    it("should not flag terminal stages without questions", () => {
      const result = validateResponse("Your booking is confirmed!", [], "complete", "thanks")
      expect(result.passed).toBe(true)
    })
  })

  describe("checkConversationHealth", () => {
    it("should return healthy for normal conversation", () => {
      const health = checkConversationHealth(mockContext)
      expect(health.status).toBe("healthy")
      expect(health.score).toBeGreaterThanOrEqual(70)
    })

    it("should degrade score for errors", () => {
      mockContext.errorCount = 2
      const health = checkConversationHealth(mockContext)
      expect(health.score).toBeLessThan(100)
      expect(health.issues).toContain("2 error(s) encountered")
    })

    it("should flag extended idle time", () => {
      mockContext.lastMessageTime = Date.now() - 600000 // 10 minutes ago
      const health = checkConversationHealth(mockContext)
      expect(health.issues.some((i) => i.includes("idle"))).toBe(true)
      expect(health.actions).toContain("Send re-engagement message")
    })

    it("should flag stuck in stage", () => {
      mockContext.stageStartTime = Date.now() - 660000 // 11 minutes ago
      const health = checkConversationHealth(mockContext)
      expect(health.issues.some((i) => i.includes("Stuck"))).toBe(true)
    })
  })

  describe("generateRecoveryResponse", () => {
    it("should generate appropriate recovery for each stage", () => {
      const stages = [
        "greeting",
        "business_lookup",
        "service_select",
        "qualifying_questions",
        "quote_generated",
        "payment",
      ] as const

      stages.forEach((stage) => {
        mockContext.stage = stage
        const response = generateRecoveryResponse(mockContext, "unknown")
        expect(response).toBeTruthy()
        expect(response.length).toBeGreaterThan(10)
      })
    })
  })

  describe("generateToolFollowUp", () => {
    it("should generate follow-up for business lookup with results", () => {
      const followUp = generateToolFollowUp(
        "lookupBusiness",
        { results: [{ name: "Test Co", abn: "123" }] },
        mockContext,
      )
      expect(followUp).toContain("found")
    })

    it("should generate follow-up for business lookup without results", () => {
      const followUp = generateToolFollowUp("lookupBusiness", { results: [] }, mockContext)
      expect(followUp).toContain("couldn't find")
    })

    it("should generate follow-up for quote calculation", () => {
      const followUp = generateToolFollowUp("calculateQuote", { estimatedTotal: 5000 }, mockContext)
      expect(followUp).toContain("quote")
    })
  })

  describe("validateUserInput", () => {
    it("should sanitize HTML tags", () => {
      const result = validateUserInput("<script>alert('xss')</script>test", "greeting")
      expect(result.sanitized).toBe("alert('xss')test")
    })

    it("should truncate very long input", () => {
      const longInput = "a".repeat(3000)
      const result = validateUserInput(longInput, "greeting")
      expect(result.sanitized.length).toBe(2000)
      expect(result.warnings).toContain("Input truncated to 2000 characters")
    })

    it("should reject empty input", () => {
      const result = validateUserInput("   ", "greeting")
      expect(result.valid).toBe(false)
    })

    it("should validate ABN format in business_lookup stage", () => {
      const result = validateUserInput("ABN 12345", "business_lookup")
      expect(result.warnings.some((w) => w.includes("ABN"))).toBe(true)
    })
  })

  describe("shouldEscalateToHuman", () => {
    it("should escalate after multiple errors", () => {
      mockContext.errorCount = 3
      const result = shouldEscalateToHuman(mockContext)
      expect(result.shouldEscalate).toBe(true)
      expect(result.reason).toBe("Multiple consecutive errors")
      expect(result.urgency).toBe("high")
    })

    it("should escalate on payment timeout", () => {
      mockContext.stage = "payment"
      mockContext.stageStartTime = Date.now() - 700000 // 11+ minutes
      const result = shouldEscalateToHuman(mockContext)
      expect(result.shouldEscalate).toBe(true)
      expect(result.reason).toBe("Payment stage timeout")
    })

    it("should not escalate for normal conversation", () => {
      const result = shouldEscalateToHuman(mockContext)
      expect(result.shouldEscalate).toBe(false)
    })
  })
})
