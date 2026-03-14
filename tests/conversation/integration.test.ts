/**
 * Integration Test Suite
 * End-to-end tests for conversation flow
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { ConversationStateMachine } from "@/lib/conversation/state-machine"
import { validateResponse, checkConversationHealth } from "@/lib/conversation/guardrails"
import { ErrorClassifier } from "@/lib/conversation/error-classifier"
import { FallbackProvider } from "@/lib/conversation/fallback-provider"
import { detectNegativeSentiment, detectHumanRequest } from "@/lib/conversation/human-escalation"
import { ConversationAnalytics } from "@/lib/conversation/analytics"

describe("Conversation Flow Integration", () => {
  let machine: ConversationStateMachine
  let analytics: ConversationAnalytics

  beforeEach(() => {
    machine = new ConversationStateMachine()
    analytics = new ConversationAnalytics("test-conversation")
    vi.clearAllMocks()
  })

  describe("Happy Path Flow", () => {
    it("should complete full conversation flow", () => {
      // Greeting -> Business
      machine.transitionTo("business_lookup")
      analytics.trackUserMessage()
      expect(machine.getContext().stage).toBe("business_lookup")

      // Business confirm
      machine.updateContext({ businessName: "Test Company", businessAbn: "12345678901" })
      machine.transitionTo("business_confirm")
      analytics.trackStageTransition("business_confirm")

      // Service selection
      machine.transitionTo("service_select")
      machine.updateContext({ serviceType: "office" })
      analytics.trackStageTransition("service_select")

      // Qualifying questions
      machine.transitionTo("qualifying_questions")
      machine.updateContext({ squareMeters: 200 })

      // Locations
      machine.transitionTo("location_origin")
      machine.updateContext({ originSuburb: "Melbourne CBD" })
      machine.transitionTo("location_destination")
      machine.updateContext({ destinationSuburb: "Richmond" })

      // Quote
      machine.transitionTo("quote_generated")
      machine.updateContext({ quoteAmount: 5000 })
      analytics.trackStageTransition("quote_generated")

      // Date
      machine.transitionTo("date_select")
      machine.updateContext({ selectedDate: "2024-12-15" })
      analytics.trackStageTransition("date_select")

      // Contact
      machine.transitionTo("contact_collect")
      machine.updateContext({
        contactName: "John Doe",
        contactEmail: "john@test.com",
        contactPhone: "0400000000",
      })
      analytics.trackStageTransition("contact_collect")

      // Payment
      machine.transitionTo("payment")
      machine.updateContext({ depositAmount: 2500 })
      analytics.trackStageTransition("payment")

      // Complete
      machine.transitionTo("complete")
      analytics.trackStageTransition("complete")

      const context = machine.getContext()
      expect(context.stage).toBe("complete")
      expect(context.quoteAmount).toBe(5000)

      const metrics = analytics.getMetrics()
      expect(metrics.completionStatus).toBe("completed")
      expect(metrics.conversionFunnel.paymentCompleted).toBe(true)
    })
  })

  describe("Error Recovery Flow", () => {
    it("should handle errors and recover", () => {
      machine.transitionTo("business_lookup")

      // Simulate error
      const error = new Error("Network error")
      const classified = ErrorClassifier.classify(error)
      expect(classified.type).toBe("network")

      machine.recordError()
      expect(machine.getContext().errorCount).toBe(1)

      // Check health
      const health = checkConversationHealth(machine.getContext())
      expect(health.score).toBeLessThan(100)

      // Recovery message
      machine.transitionTo("error_recovery")
      expect(machine.getContext().stage).toBe("error_recovery")

      // Resume
      machine.clearErrors()
      machine.transitionTo("business_lookup")
      expect(machine.getContext().errorCount).toBe(0)
    })

    it("should escalate after multiple errors", () => {
      machine.recordError()
      machine.recordError()
      const result = machine.recordError()

      expect(result.shouldEscalate).toBe(true)
      expect(machine.getContext().stage).toBe("human_escalation")
    })
  })

  describe("Guardrail Enforcement", () => {
    it("should validate responses have follow-up", () => {
      const result = validateResponse("I found your business.", [], "business_confirm", "My business is Test Co")

      // Should warn about no follow-up question
      expect(result.violations.length > 0 || result.recommendations.length > 0).toBe(true)
    })

    it("should enforce tool call acknowledgment", () => {
      const result = validateResponse("", ["lookupBusiness"], "business_lookup", "Test Company")

      expect(result.passed).toBe(false)
      expect(result.violations.some((v) => v.type === "tool_without_text")).toBe(true)
    })
  })

  describe("Human Escalation Detection", () => {
    it("should detect negative sentiment", () => {
      expect(detectNegativeSentiment("I'm so frustrated with this!")).toBe(true)
      expect(detectNegativeSentiment("This is great, thanks!")).toBe(false)
    })

    it("should detect human assistance requests", () => {
      expect(detectHumanRequest("I want to speak to a human")).toBe(true)
      expect(detectHumanRequest("Can someone call me?")).toBe(true)
      expect(detectHumanRequest("What's the price?")).toBe(false)
    })
  })

  describe("Fallback Strategies", () => {
    it("should provide appropriate fallback for each error type", () => {
      const errorTypes = ["network", "api", "model", "timeout", "stream"]

      errorTypes.forEach((errorType) => {
        const fallback = FallbackProvider.getFallback({
          conversationId: "test",
          lastUserMessage: "test",
          conversationStep: "service",
          errorType,
          retryCount: 2,
        })

        expect(fallback.message).toBeTruthy()
        expect(fallback.actions.length).toBeGreaterThan(0)
      })
    })
  })

  describe("Re-engagement", () => {
    it("should trigger re-engagement after idle", () => {
      const context = machine.getContext()
      const idleContext = {
        ...context,
        lastMessageTime: Date.now() - 120000, // 2 minutes ago
      }

      const idleMachine = new ConversationStateMachine(idleContext)
      const check = idleMachine.checkReengagement()

      expect(check.needsReengagement).toBe(true)
      expect(check.prompt).toBeTruthy()
    })
  })

  describe("Analytics Tracking", () => {
    it("should track conversion funnel", () => {
      analytics.trackStageTransition("business_confirm")
      analytics.trackStageTransition("service_select")
      analytics.trackStageTransition("quote_generated")

      const metrics = analytics.getMetrics()
      expect(metrics.conversionFunnel.businessIdentified).toBe(true)
      expect(metrics.conversionFunnel.serviceSelected).toBe(true)
      expect(metrics.conversionFunnel.quoteGenerated).toBe(true)
      expect(metrics.conversionFunnel.paymentCompleted).toBe(false)
    })

    it("should calculate conversion percentage", () => {
      analytics.trackStageTransition("business_confirm")
      analytics.trackStageTransition("service_select")
      analytics.trackStageTransition("quote_generated")
      analytics.trackStageTransition("date_select")

      const percentage = analytics.getConversionPercentage()
      expect(percentage).toBeGreaterThan(0)
      expect(percentage).toBeLessThan(100)
    })
  })
})
