/**
 * State Machine Test Suite
 * Tests for conversation state management and transitions
 */

import { describe, it, expect, beforeEach } from "vitest"
import { ConversationStateMachine } from "@/lib/conversation/state-machine"

describe("ConversationStateMachine", () => {
  let machine: ConversationStateMachine

  beforeEach(() => {
    machine = new ConversationStateMachine()
  })

  describe("initialization", () => {
    it("should start in greeting stage", () => {
      const context = machine.getContext()
      expect(context.stage).toBe("greeting")
    })

    it("should initialize with empty qualifying answers", () => {
      const context = machine.getContext()
      expect(context.qualifyingAnswers).toEqual({})
    })

    it("should initialize with empty inventory", () => {
      const context = machine.getContext()
      expect(context.inventoryItems).toEqual([])
    })
  })

  describe("transitions", () => {
    it("should allow valid transition from greeting to business_lookup", () => {
      const result = machine.transitionTo("business_lookup")
      expect(result.allowed).toBe(true)
      expect(machine.getContext().stage).toBe("business_lookup")
    })

    it("should reject invalid transition", () => {
      const result = machine.canTransitionTo("payment")
      expect(result.allowed).toBe(false)
      expect(result.reason).toBeTruthy()
    })

    it("should always allow transition to error_recovery", () => {
      const result = machine.transitionTo("error_recovery")
      expect(result.allowed).toBe(true)
    })

    it("should always allow transition to human_escalation", () => {
      const result = machine.transitionTo("human_escalation")
      expect(result.allowed).toBe(true)
    })

    it("should check required fields for transition", () => {
      // Navigate to location_destination stage with required context data
      machine.transitionTo("service_select")
      machine.updateContext({ serviceType: "office" })
      machine.transitionTo("qualifying_questions")
      machine.updateContext({ squareMeters: 200 })
      machine.transitionTo("location_origin")
      machine.updateContext({ originSuburb: "Melbourne CBD" })
      machine.transitionTo("location_destination")
      // Now try to go to quote_generated - missing destinationSuburb
      const result = machine.canTransitionTo("quote_generated")
      expect(result.allowed).toBe(false)
      expect(result.missingFields).toBeDefined()
    })
  })

  describe("context updates", () => {
    it("should update context without changing stage", () => {
      machine.updateContext({ businessName: "Test Company" })
      const context = machine.getContext()
      expect(context.businessName).toBe("Test Company")
      expect(context.stage).toBe("greeting")
    })

    it("should update lastMessageTime on context update", () => {
      const before = machine.getContext().lastMessageTime
      // Small delay to ensure time difference
      machine.updateContext({ businessName: "Test" })
      const after = machine.getContext().lastMessageTime
      expect(after).toBeGreaterThanOrEqual(before)
    })
  })

  describe("error handling", () => {
    it("should increment error count", () => {
      machine.recordError()
      expect(machine.getContext().errorCount).toBe(1)
    })

    it("should escalate after 3 errors", () => {
      machine.recordError()
      machine.recordError()
      const result = machine.recordError()
      expect(result.shouldEscalate).toBe(true)
      expect(machine.getContext().stage).toBe("human_escalation")
    })

    it("should clear errors", () => {
      machine.recordError()
      machine.clearErrors()
      expect(machine.getContext().errorCount).toBe(0)
    })
  })

  describe("re-engagement", () => {
    it("should detect need for re-engagement after idle", () => {
      // Simulate idle by setting lastMessageTime in the past
      const context = machine.getContext()
      const newContext = {
        ...context,
        lastMessageTime: Date.now() - 120000, // 2 minutes ago
      }
      const newMachine = new ConversationStateMachine(newContext)

      const check = newMachine.checkReengagement()
      expect(check.needsReengagement).toBe(true)
      expect(check.prompt).toBeTruthy()
    })

    it("should not need re-engagement for recent message", () => {
      const check = machine.checkReengagement()
      expect(check.needsReengagement).toBe(false)
    })
  })

  describe("inventory management", () => {
    it("should add inventory items", () => {
      machine.addInventoryItem({
        category: "workstations",
        itemType: "desk",
        quantity: 10,
      })
      const context = machine.getContext()
      expect(context.inventoryItems).toHaveLength(1)
      expect(context.inventoryItems[0].quantity).toBe(10)
    })

    it("should combine duplicate items", () => {
      machine.addInventoryItem({
        category: "workstations",
        itemType: "desk",
        quantity: 5,
      })
      machine.addInventoryItem({
        category: "workstations",
        itemType: "desk",
        quantity: 3,
      })
      const context = machine.getContext()
      expect(context.inventoryItems).toHaveLength(1)
      expect(context.inventoryItems[0].quantity).toBe(8)
    })

    it("should calculate inventory summary", () => {
      machine.addInventoryItem({
        category: "workstations",
        itemType: "desk",
        quantity: 10,
      })
      machine.addInventoryItem({
        category: "seating",
        itemType: "office_chair",
        quantity: 10,
      })

      const summary = machine.getInventorySummary()
      expect(summary.totalItems).toBe(20)
      expect(summary.categories).toContain("workstations")
      expect(summary.categories).toContain("seating")
      expect(summary.estimatedSqm).toBeGreaterThan(0)
    })
  })

  describe("serialization", () => {
    it("should serialize to JSON", () => {
      machine.updateContext({ businessName: "Test Co", serviceType: "office" })
      const json = machine.toJSON()
      expect(json.businessName).toBe("Test Co")
      expect(json.serviceType).toBe("office")
    })

    it("should restore from JSON", () => {
      const data = {
        stage: "service_select" as const,
        businessName: "Test Co",
        lastMessageTime: Date.now(),
        errorCount: 0,
        stageStartTime: Date.now(),
        qualifyingAnswers: {},
        inventoryItems: [],
      }

      const restored = ConversationStateMachine.fromJSON(data)
      expect(restored.getContext().stage).toBe("service_select")
      expect(restored.getContext().businessName).toBe("Test Co")
    })
  })

  describe("qualifying questions", () => {
    it("should return questions for office service", () => {
      machine.updateContext({ serviceType: "office" })
      const questions = machine.getQualifyingQuestions()
      expect(questions.length).toBeGreaterThan(0)
      expect(questions.some((q) => q.includes("workstation"))).toBe(true)
    })

    it("should return empty for unknown service", () => {
      machine.updateContext({ serviceType: "unknown" })
      const questions = machine.getQualifyingQuestions()
      expect(questions).toEqual([])
    })

    it("should track unanswered questions", () => {
      machine.updateContext({ serviceType: "office" })
      const unanswered = machine.getUnansweredQualifyingQuestions()
      const total = machine.getQualifyingQuestions()
      expect(unanswered.length).toBe(total.length)
    })
  })

  describe("re-engagement urgency levels", () => {
    it("returns 'critical' urgency when idle at payment stage for over 10 minutes", () => {
      machine.transitionTo("payment")
      const context = machine.getContext()
      const pastTime = Date.now() - 11 * 60 * 1000 // 11 minutes ago
      const stalePaymentMachine = new ConversationStateMachine({
        ...context,
        stage: "payment",
        lastMessageTime: pastTime,
      })
      const check = stalePaymentMachine.checkReengagement()
      expect(check.needsReengagement).toBe(true)
      expect(check.urgencyLevel).toBe("critical")
    })

    it("returns 'high' urgency when idle at payment stage for 6 minutes", () => {
      const context = machine.getContext()
      const pastTime = Date.now() - 6 * 60 * 1000 // 6 minutes — over idle threshold but < 10min
      const stalePaymentMachine = new ConversationStateMachine({
        ...context,
        stage: "payment",
        lastMessageTime: pastTime,
      })
      const check = stalePaymentMachine.checkReengagement()
      expect(check.needsReengagement).toBe(true)
      expect(check.urgencyLevel).toBe("high")
    })

    it("returns 'high' urgency when idle at quote_generated stage for over 5 minutes", () => {
      const context = machine.getContext()
      const pastTime = Date.now() - 6 * 60 * 1000 // 6 minutes — over the 5-minute threshold
      const staleMachine = new ConversationStateMachine({
        ...context,
        stage: "quote_generated",
        lastMessageTime: pastTime,
      })
      const check = staleMachine.checkReengagement()
      expect(check.needsReengagement).toBe(true)
      expect(check.urgencyLevel).toBe("high")
    })

    it("returns 'medium' urgency for a generic stage idle beyond its max idle time", () => {
      const context = machine.getContext()
      // greeting maxIdleTimeMs = 60_000 (1 min); 2 min idle is past threshold but < 3×
      const pastTime = Date.now() - 2 * 60 * 1000
      const staleMachine = new ConversationStateMachine({
        ...context,
        stage: "greeting",
        lastMessageTime: pastTime,
      })
      const check = staleMachine.checkReengagement()
      expect(check.needsReengagement).toBe(true)
      expect(check.urgencyLevel).toBe("medium")
    })
  })

  describe("inventory sqm estimation by item type", () => {
    const sqmCases: Array<[string, string, number]> = [
      ["workstations", "desk", 2.5],
      ["workstations", "executive_desk", 4],
      ["seating", "office_chair", 0.5],
      ["storage", "filing_cabinet_4dr", 0.7],
      ["storage", "bookshelf", 1],
      ["meeting", "conference_table_large", 8],
      ["it", "server_rack", 2],
      ["it", "computer", 0.3],
      ["specialty", "copier", 1.5],
    ]

    it.each(sqmCases)(
      "estimates sqm correctly for %s / %s (expected %s m²)",
      (category, itemType, expectedSqmPerItem) => {
        const fresh = new ConversationStateMachine()
        fresh.addInventoryItem({ category, itemType, quantity: 1 })
        const summary = fresh.getInventorySummary()
        expect(summary.estimatedSqm).toBe(expectedSqmPerItem)
      },
    )

    it("uses 1 sqm as the fallback for unknown item types", () => {
      machine.addInventoryItem({ category: "misc", itemType: "unknown_item_xyz", quantity: 1 })
      const summary = machine.getInventorySummary()
      expect(summary.estimatedSqm).toBe(1)
    })

    it("accumulates sqm correctly across multiple item types", () => {
      machine.addInventoryItem({ category: "workstations", itemType: "desk", quantity: 10 }) // 10 * 2.5 = 25
      machine.addInventoryItem({ category: "it", itemType: "server_rack", quantity: 5 }) // 5 * 2 = 10
      const summary = machine.getInventorySummary()
      expect(summary.estimatedSqm).toBe(35)
    })
  })
})
