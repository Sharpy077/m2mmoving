/**
 * Human Escalation Service
 * Handles escalation to human agents when Maya encounters issues
 */

import { createBrowserClient } from "@supabase/ssr"

export interface EscalationRequest {
  conversationId: string
  reason: EscalationReason
  customerData?: {
    name?: string
    phone?: string
    email?: string
    businessName?: string
  }
  conversationSummary?: string
  errorCount: number
  stage: string
  urgency: "low" | "medium" | "high" | "critical"
}

export type EscalationReason =
  | "multiple_errors"
  | "customer_request"
  | "payment_issue"
  | "complex_requirements"
  | "extended_idle"
  | "negative_sentiment"
  | "technical_failure"

export interface EscalationResult {
  success: boolean
  ticketId?: string
  estimatedWaitTime?: string
  callbackScheduled?: boolean
  error?: string
}

export interface EscalationTicket {
  id: string
  conversationId: string
  reason: EscalationReason
  urgency: "low" | "medium" | "high" | "critical"
  status: "pending" | "assigned" | "in_progress" | "resolved"
  createdAt: string
  customerData?: Record<string, unknown>
  conversationSummary?: string
  assignedAgent?: string
}

/**
 * Human Escalation Service
 */
export class HumanEscalationService {
  private static getSupabase() {
    return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  }

  /**
   * Request escalation to human agent
   */
  static async requestEscalation(request: EscalationRequest): Promise<EscalationResult> {
    try {
      const ticketId = `ESC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

      // Try to store in database
      try {
        const supabase = this.getSupabase()
        await supabase.from("escalation_tickets").insert({
          id: ticketId,
          conversation_id: request.conversationId,
          reason: request.reason,
          urgency: request.urgency,
          status: "pending",
          customer_data: request.customerData,
          conversation_summary: request.conversationSummary,
          error_count: request.errorCount,
          stage: request.stage,
        })
      } catch (dbError) {
        // Continue even if database fails - we'll handle via callback
        console.error("[HumanEscalation] Database error:", dbError)
      }

      // Send notification (email/SMS) to support team
      await this.notifySupport(request, ticketId)

      return {
        success: true,
        ticketId,
        estimatedWaitTime: this.getEstimatedWaitTime(request.urgency),
        callbackScheduled: !!request.customerData?.phone,
      }
    } catch (error) {
      console.error("[HumanEscalation] Failed to create escalation:", error)
      return {
        success: false,
        error: "Unable to connect to support team. Please call 03 8820 1801 directly.",
      }
    }
  }

  /**
   * Notify support team of escalation
   */
  private static async notifySupport(request: EscalationRequest, ticketId: string): Promise<void> {
    try {
      const response = await fetch("/api/notifications/escalation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          ...request,
        }),
      })

      if (!response.ok) {
        console.error("[HumanEscalation] Failed to send notification")
      }
    } catch (error) {
      console.error("[HumanEscalation] Notification error:", error)
    }
  }

  /**
   * Get estimated wait time based on urgency
   */
  private static getEstimatedWaitTime(urgency: string): string {
    switch (urgency) {
      case "critical":
        return "within 5 minutes"
      case "high":
        return "within 15 minutes"
      case "medium":
        return "within 30 minutes"
      default:
        return "within 1 hour"
    }
  }

  /**
   * Request callback from support team
   */
  static async requestCallback(
    conversationId: string,
    phone: string,
    name?: string,
    preferredTime?: string,
  ): Promise<EscalationResult> {
    return this.requestEscalation({
      conversationId,
      reason: "customer_request",
      customerData: { phone, name },
      errorCount: 0,
      stage: "callback_requested",
      urgency: preferredTime === "now" ? "high" : "medium",
    })
  }

  /**
   * Generate escalation summary for handoff
   */
  static generateHandoffSummary(context: {
    stage: string
    businessName?: string
    serviceType?: string
    quoteAmount?: number
    selectedDate?: string
    errorCount: number
    conversationHistory?: string[]
  }): string {
    const parts: string[] = []

    parts.push(`Current Stage: ${context.stage}`)

    if (context.businessName) {
      parts.push(`Business: ${context.businessName}`)
    }

    if (context.serviceType) {
      parts.push(`Service Type: ${context.serviceType}`)
    }

    if (context.quoteAmount) {
      parts.push(`Quote Amount: $${context.quoteAmount.toLocaleString()}`)
    }

    if (context.selectedDate) {
      parts.push(`Preferred Date: ${context.selectedDate}`)
    }

    if (context.errorCount > 0) {
      parts.push(`Errors Encountered: ${context.errorCount}`)
    }

    return parts.join("\n")
  }
}

/**
 * Detect if conversation sentiment suggests escalation needed
 */
export function detectNegativeSentiment(message: string): boolean {
  const negativePatterns = [
    /frustrated/i,
    /annoyed/i,
    /angry/i,
    /this (isn't|is not|doesn't|does not) work/i,
    /speak to (a |someone|human|person|real)/i,
    /talk to (a |someone|human|person|real)/i,
    /manager/i,
    /supervisor/i,
    /complaint/i,
    /useless/i,
    /terrible/i,
    /worst/i,
    /ridiculous/i,
    /waste of time/i,
    /give up/i,
    /forget it/i,
  ]

  return negativePatterns.some((pattern) => pattern.test(message))
}

/**
 * Check if user is explicitly requesting human assistance
 */
export function detectHumanRequest(message: string): boolean {
  const humanRequestPatterns = [
    /speak to (a |an |)?(human|person|agent|someone|representative)/i,
    /talk to (a |an |)?(human|person|agent|someone|representative)/i,
    /call me/i,
    /phone call/i,
    /want (to |)(speak|talk) to/i,
    /real person/i,
    /actual person/i,
    /can someone call/i,
    /prefer (to |)(call|phone|speak)/i,
  ]

  return humanRequestPatterns.some((pattern) => pattern.test(message))
}
