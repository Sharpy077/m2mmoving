/**
 * Conversation Guardrails
 * Implements safety checks and validation to prevent customer loss
 */

import type { ConversationStage, ConversationContext } from "./state-machine"

export interface GuardrailCheck {
  passed: boolean
  violations: GuardrailViolation[]
  recommendations: string[]
}

export interface GuardrailViolation {
  type: GuardrailViolationType
  severity: "warning" | "error" | "critical"
  message: string
  suggestedFix: string
}

export type GuardrailViolationType =
  | "empty_response"
  | "no_followup_question"
  | "tool_without_text"
  | "stuck_in_stage"
  | "excessive_errors"
  | "long_idle_time"
  | "missing_acknowledgment"
  | "multiple_questions"
  | "invalid_transition"
  | "incomplete_data"

export interface ResponseValidation {
  hasText: boolean
  hasQuestion: boolean
  hasAcknowledgment: boolean
  questionCount: number
  toolCalls: string[]
}

export interface ConversationHealth {
  score: number // 0-100
  status: "healthy" | "at_risk" | "critical"
  issues: string[]
  actions: string[]
}

/**
 * Validate a response before sending
 */
export function validateResponse(
  responseText: string,
  toolCalls: string[],
  currentStage: ConversationStage,
  previousUserMessage: string,
): GuardrailCheck {
  const violations: GuardrailViolation[] = []
  const recommendations: string[] = []

  // Check for empty response with tool calls
  if (!responseText.trim() && toolCalls.length > 0) {
    violations.push({
      type: "tool_without_text",
      severity: "error",
      message: "Tool was called but no text response was provided",
      suggestedFix: "Add acknowledgment text after tool call",
    })
  }

  // Check for empty response entirely
  if (!responseText.trim() && toolCalls.length === 0) {
    violations.push({
      type: "empty_response",
      severity: "critical",
      message: "No response generated for user message",
      suggestedFix: "Generate a response acknowledging the user input",
    })
  }

  // Check for follow-up in non-terminal stages
  const terminalStages: ConversationStage[] = ["complete", "human_escalation"]
  if (!terminalStages.includes(currentStage)) {
    const hasQuestion = responseText.includes("?")
    const hasCallToAction = /please|would you|can you|let me know|select|choose/i.test(responseText)

    if (!hasQuestion && !hasCallToAction) {
      violations.push({
        type: "no_followup_question",
        severity: "warning",
        message: "Response does not prompt for next action",
        suggestedFix: "Add a question or call-to-action to continue the conversation",
      })
    }
  }

  // Check for acknowledgment of user input
  if (previousUserMessage && previousUserMessage.length > 10) {
    const acknowledgmentPatterns = [
      /great|perfect|excellent|thanks|thank you|got it|understood|i see|okay|right/i,
      /i've|i have|noted|recorded|confirmed/i,
      new RegExp(previousUserMessage.split(" ").slice(0, 3).join("|"), "i"),
    ]

    const hasAcknowledgment = acknowledgmentPatterns.some((pattern) => pattern.test(responseText))

    if (!hasAcknowledgment && currentStage !== "greeting") {
      recommendations.push("Consider acknowledging the user's previous message before proceeding")
    }
  }

  // Check for multiple questions (should ask one at a time)
  const questionCount = (responseText.match(/\?/g) || []).length
  if (questionCount > 2) {
    violations.push({
      type: "multiple_questions",
      severity: "warning",
      message: `Response contains ${questionCount} questions`,
      suggestedFix: "Ask one question at a time to avoid overwhelming the user",
    })
  }

  return {
    passed: violations.filter((v) => v.severity === "critical" || v.severity === "error").length === 0,
    violations,
    recommendations,
  }
}

/**
 * Check conversation health
 */
export function checkConversationHealth(context: ConversationContext): ConversationHealth {
  const issues: string[] = []
  const actions: string[] = []
  let score = 100

  // Check error count
  if (context.errorCount > 0) {
    score -= context.errorCount * 15
    issues.push(`${context.errorCount} error(s) encountered`)
    if (context.errorCount >= 2) {
      actions.push("Consider offering human assistance")
    }
  }

  // Check idle time
  const idleTimeMs = Date.now() - context.lastMessageTime
  const idleMinutes = idleTimeMs / 60000

  if (idleMinutes > 5) {
    score -= Math.min(30, idleMinutes * 3)
    issues.push(`User idle for ${Math.round(idleMinutes)} minutes`)
    actions.push("Send re-engagement message")
  }

  // Check stage duration
  const stageTimeMs = Date.now() - context.stageStartTime
  const stageMinutes = stageTimeMs / 60000

  if (stageMinutes > 10 && !["complete", "payment"].includes(context.stage)) {
    score -= 20
    issues.push(`Stuck in ${context.stage} stage for ${Math.round(stageMinutes)} minutes`)
    actions.push("Offer to restart or provide alternative path")
  }

  // Check data completeness for current stage
  if (context.stage === "quote_generated" && !context.quoteAmount) {
    score -= 25
    issues.push("Quote stage reached without quote amount")
    actions.push("Recalculate quote with available data")
  }

  // Determine status
  let status: "healthy" | "at_risk" | "critical"
  if (score >= 70) {
    status = "healthy"
  } else if (score >= 40) {
    status = "at_risk"
  } else {
    status = "critical"
  }

  return {
    score: Math.max(0, score),
    status,
    issues,
    actions,
  }
}

/**
 * Generate recovery response based on current state
 */
export function generateRecoveryResponse(context: ConversationContext, errorType: string): string {
  const recoveryResponses: Record<ConversationStage, string> = {
    greeting:
      "G'day! I'm Maya from M&M Commercial Moving. I had a small hiccup there. How can I help you with your move today?",
    business_lookup:
      "Apologies for that interruption. I was looking up your business details. Could you please tell me your business name or ABN again?",
    business_confirm:
      "Sorry about that. I found your business earlier. Could you confirm if the details I showed were correct?",
    service_select:
      "I apologise for the delay. What type of move are you planning? Office, warehouse, data centre, IT equipment, or retail?",
    qualifying_questions:
      "Sorry for the interruption. I was gathering some details about your move. What were you telling me about the size of your space?",
    location_origin: "Apologies, I missed that. What suburb are you moving from?",
    location_destination: "Sorry about that. And which suburb are you moving to?",
    quote_generated: "I apologise for the technical difficulty. Let me recalculate your quote. One moment...",
    date_select: "Sorry for the delay. When would you like to schedule your move?",
    contact_collect:
      "Apologies for that interruption. I just need your contact details to confirm the booking. What's the best name and phone number for you?",
    payment:
      "I apologise for the technical issue. Your booking details are safe. Would you like to continue with the deposit payment?",
    complete: "Your booking is confirmed! Sorry for any confusion. Is there anything else I can help you with?",
    error_recovery:
      "I sincerely apologise for the difficulties. Would you prefer to continue with me, or shall I arrange for someone to call you?",
    human_escalation:
      "I've experienced some technical issues and want to make sure you get the help you need. Would you like me to have one of our team members call you right away?",
  }

  return recoveryResponses[context.stage] || recoveryResponses.error_recovery
}

/**
 * Generate forced follow-up after tool call
 */
export function generateToolFollowUp(
  toolName: string,
  toolResult: Record<string, unknown>,
  context: ConversationContext,
): string {
  const followUps: Record<string, (result: Record<string, unknown>, ctx: ConversationContext) => string> = {
    lookupBusiness: (result) => {
      if (result.results && Array.isArray(result.results) && result.results.length > 0) {
        return "I found your business! Please confirm if these details are correct."
      }
      return "I couldn't find a business with those details. Could you try your ABN or a different spelling of the business name?"
    },

    confirmBusiness: (result) => {
      if (result.confirmed) {
        return `Great! I've got ${result.name} on file. Now, what type of move are you planning? Select from the options below or tell me more about your needs.`
      }
      return "No problem, let's try again. What's your business name or ABN?"
    },

    showServiceOptions: () => {
      return "Which type of move are you planning? Just select an option above or tell me about your specific needs."
    },

    calculateQuote: (result, ctx) => {
      if (result.estimatedTotal) {
        return `Based on your requirements, here's your quote. Would you like to check available dates to book this move?`
      }
      return "I need a bit more information to calculate an accurate quote. Could you tell me the approximate size of your space in square metres?"
    },

    checkAvailability: (result) => {
      if (result.dates && Array.isArray(result.dates) && result.dates.length > 0) {
        return "Here are our available dates. Select your preferred moving date from the calendar above."
      }
      return "Let me check other dates for you. What month works best?"
    },

    confirmBookingDate: (result) => {
      if (result.confirmedDate) {
        return `Perfect! I've locked in that date. Now I just need your contact details to finalise the booking. What's your name?`
      }
      return "Let me help you select a date. When would you like to move?"
    },

    collectContactInfo: (result) => {
      if (result.collected) {
        return `Thanks ${result.contactName?.split(" ")[0] || ""}! To secure your booking, we just need the 50% deposit. Ready to proceed with payment?`
      }
      return "I need a few more details. Could you provide your phone number and email?"
    },

    initiatePayment: () => {
      return "You can complete your deposit payment securely above. Once confirmed, you'll receive an email confirmation and invoice."
    },

    requestCallback: () => {
      return "No worries! I've arranged for our team to give you a call. Is there anything else I can help with in the meantime?"
    },
  }

  const followUpGenerator = followUps[toolName]
  if (followUpGenerator) {
    return followUpGenerator(toolResult, context)
  }

  return "Is there anything else you'd like to know about your move?"
}

/**
 * Validate input before processing
 */
export function validateUserInput(
  input: string,
  currentStage: ConversationStage,
): { valid: boolean; sanitized: string; warnings: string[] } {
  const warnings: string[] = []
  let sanitized = input.trim()

  // Remove potentially harmful content
  sanitized = sanitized.replace(/<[^>]*>/g, "") // Remove HTML tags
  sanitized = sanitized.replace(/javascript:/gi, "") // Remove javascript: URLs

  // Check for empty input
  if (!sanitized) {
    return {
      valid: false,
      sanitized: "",
      warnings: ["Empty input received"],
    }
  }

  // Check for excessive length
  if (sanitized.length > 2000) {
    sanitized = sanitized.substring(0, 2000)
    warnings.push("Input truncated to 2000 characters")
  }

  // Stage-specific validation
  if (currentStage === "business_lookup") {
    // ABN format check
    const abnMatch = sanitized.match(/\b\d{11}\b/)
    if (abnMatch && abnMatch[0].length !== 11) {
      warnings.push("ABN should be 11 digits")
    }
  }

  if (currentStage === "contact_collect") {
    // Email format check
    if (sanitized.includes("@") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized)) {
      warnings.push("Email format appears invalid")
    }

    // Phone format check (Australian)
    if (
      /\d{8,}/.test(sanitized.replace(/\D/g, "")) &&
      !/^(?:\+?61|0)[2-478](?:\d{8}|\d{4}\s?\d{4})$/.test(sanitized.replace(/\s/g, ""))
    ) {
      warnings.push("Phone number format may be invalid")
    }
  }

  return {
    valid: true,
    sanitized,
    warnings,
  }
}

/**
 * Check if human escalation is warranted
 */
export function shouldEscalateToHuman(context: ConversationContext): {
  shouldEscalate: boolean
  reason?: string
  urgency: "low" | "medium" | "high"
} {
  // Multiple consecutive errors
  if (context.errorCount >= 3) {
    return {
      shouldEscalate: true,
      reason: "Multiple consecutive errors",
      urgency: "high",
    }
  }

  // Stuck in payment stage
  const stageTimeMs = Date.now() - context.stageStartTime
  if (context.stage === "payment" && stageTimeMs > 600000) {
    // 10 minutes
    return {
      shouldEscalate: true,
      reason: "Payment stage timeout",
      urgency: "high",
    }
  }

  // Very long idle time
  const idleTimeMs = Date.now() - context.lastMessageTime
  if (idleTimeMs > 900000) {
    // 15 minutes
    return {
      shouldEscalate: true,
      reason: "Extended idle time",
      urgency: "medium",
    }
  }

  return {
    shouldEscalate: false,
    urgency: "low",
  }
}
