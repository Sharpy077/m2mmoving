/**
 * Re-engagement Service
 * Handles proactive messages to prevent customer drop-off
 */

import type { ConversationStage } from "./state-machine"

export interface ReengagementConfig {
  idleWarningMs: number // Time before sending warning (default 2 min)
  idleFinalMs: number // Time before final message (default 5 min)
  recoveryOfferMs: number // Time before recovery offer (default 10 min)
  maxReengagements: number // Max re-engagement attempts per session
}

export interface ReengagementMessage {
  type: "idle_warning" | "idle_final" | "recovery_offer" | "special_offer"
  message: string
  options?: { label: string; value: string }[]
  urgency: "low" | "medium" | "high"
}

const DEFAULT_CONFIG: ReengagementConfig = {
  idleWarningMs: 2 * 60 * 1000, // 2 minutes
  idleFinalMs: 5 * 60 * 1000, // 5 minutes
  recoveryOfferMs: 10 * 60 * 1000, // 10 minutes
  maxReengagements: 3,
}

/**
 * Stage-specific re-engagement messages
 */
const REENGAGEMENT_MESSAGES: Record<
  ConversationStage,
  {
    warning: string
    final: string
    recovery: string
  }
> = {
  greeting: {
    warning: "Still there? I'm ready to help you get a quote whenever you are!",
    final: "No worries if you're busy - just say 'Hi' when you're ready to continue.",
    recovery: "Welcome back! Would you like to start fresh with a new quote?",
  },
  business_lookup: {
    warning: "Take your time finding your business details. I'm here when you're ready!",
    final:
      "If you're having trouble finding your business, we can proceed without it. Just let me know your company name.",
    recovery: "Ready to continue? I can look up your business, or we can proceed with just your company name.",
  },
  business_confirm: {
    warning: "Just checking - were those business details correct?",
    final: "I'll keep your details saved. Type 'yes' to confirm or 'no' to try a different search.",
    recovery: "Welcome back! I still have your business details. Ready to continue with your quote?",
  },
  service_select: {
    warning: "Which type of move are you planning? I'm here to help you choose the right service.",
    final: "Our most popular options are Office Relocation and IT Equipment moves. Which suits your needs?",
    recovery: "Ready to continue? Just select your move type above or tell me what you need.",
  },
  qualifying_questions: {
    warning: "Take your time with the details - accurate information helps me give you the best quote.",
    final: "If you're unsure about any details, just give me your best estimate. We can fine-tune later.",
    recovery: "Welcome back! I've saved your progress. Ready to continue answering a few questions about your move?",
  },
  location_origin: {
    warning: "What suburb are you moving from? This helps me calculate the distance.",
    final: "Just need your current suburb name to continue with the quote.",
    recovery: "I've got your details saved. What suburb are you moving from?",
  },
  location_destination: {
    warning: "And where are you moving to?",
    final: "Almost there! Just need your destination suburb to calculate the quote.",
    recovery: "We're nearly done gathering details. What suburb are you moving to?",
  },
  quote_generated: {
    warning: "What do you think of the quote? I'm happy to answer any questions.",
    final: "This quote is valid for 7 days. Would you like to check available dates to book?",
    recovery: "Welcome back! Your quote is still available. Ready to book a date?",
  },
  date_select: {
    warning: "Our calendar is filling up fast this month. Have you found a date that works?",
    final: "If you're flexible, I can suggest dates with the best availability.",
    recovery: "Ready to pick a date? I'll show you our current availability.",
  },
  contact_collect: {
    warning: "Just need your contact details to finalise the booking.",
    final: "We're so close! Just your name and phone number to complete the booking.",
    recovery: "You're almost done! Just need your contact details to secure your booking.",
  },
  payment: {
    warning: "Take your time with payment. Your booking details are safe.",
    final: "Having trouble with payment? I can arrange for someone to call you instead.",
    recovery: "Your booking is still reserved. Ready to complete the deposit payment?",
  },
  complete: {
    warning: "",
    final: "",
    recovery: "Your booking is confirmed! Is there anything else I can help with?",
  },
  error_recovery: {
    warning: "I apologise for the difficulties. Would you like to try again?",
    final: "I'm having some technical issues. Would you prefer someone to call you?",
    recovery: "Sorry about the interruption. Shall we continue where we left off?",
  },
  human_escalation: {
    warning: "",
    final: "",
    recovery: "A team member will be in touch shortly. Is there anything else I can help with in the meantime?",
  },
}

/**
 * Re-engagement Manager
 */
export class ReengagementManager {
  private config: ReengagementConfig
  private timers: Map<string, NodeJS.Timeout> = new Map()
  private attemptCounts: Map<string, number> = new Map()
  private callbacks: Map<string, (message: ReengagementMessage) => void> = new Map()

  constructor(config: Partial<ReengagementConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Start monitoring for idle user
   */
  startMonitoring(
    conversationId: string,
    currentStage: ConversationStage,
    onReengage: (message: ReengagementMessage) => void,
  ): void {
    // Clear existing timers
    this.stopMonitoring(conversationId)

    // Store callback
    this.callbacks.set(conversationId, onReengage)

    // Get current attempt count
    const attempts = this.attemptCounts.get(conversationId) || 0

    if (attempts >= this.config.maxReengagements) {
      // Max attempts reached, don't schedule more
      return
    }

    // Schedule warning message
    const warningTimer = setTimeout(() => {
      const stageMessages = REENGAGEMENT_MESSAGES[currentStage]
      if (stageMessages.warning) {
        onReengage({
          type: "idle_warning",
          message: stageMessages.warning,
          urgency: "low",
        })
        this.attemptCounts.set(conversationId, attempts + 1)
      }
    }, this.config.idleWarningMs)

    // Schedule final message
    const finalTimer = setTimeout(() => {
      const stageMessages = REENGAGEMENT_MESSAGES[currentStage]
      if (stageMessages.final) {
        onReengage({
          type: "idle_final",
          message: stageMessages.final,
          options: this.getStageOptions(currentStage),
          urgency: "medium",
        })
        this.attemptCounts.set(conversationId, attempts + 2)
      }
    }, this.config.idleFinalMs)

    // Schedule recovery offer
    const recoveryTimer = setTimeout(() => {
      const stageMessages = REENGAGEMENT_MESSAGES[currentStage]
      onReengage({
        type: "recovery_offer",
        message: stageMessages.recovery,
        options: [
          { label: "Continue", value: "continue" },
          { label: "Start Over", value: "restart" },
          { label: "Call Me Instead", value: "callback" },
        ],
        urgency: "high",
      })
    }, this.config.recoveryOfferMs)

    // Store timers
    this.timers.set(`${conversationId}-warning`, warningTimer)
    this.timers.set(`${conversationId}-final`, finalTimer)
    this.timers.set(`${conversationId}-recovery`, recoveryTimer)
  }

  /**
   * Stop monitoring (called when user sends a message)
   */
  stopMonitoring(conversationId: string): void {
    const timerKeys = [`${conversationId}-warning`, `${conversationId}-final`, `${conversationId}-recovery`]

    timerKeys.forEach((key) => {
      const timer = this.timers.get(key)
      if (timer) {
        clearTimeout(timer)
        this.timers.delete(key)
      }
    })
  }

  /**
   * Reset attempt count (called on successful interaction)
   */
  resetAttempts(conversationId: string): void {
    this.attemptCounts.delete(conversationId)
  }

  /**
   * Get stage-specific quick options
   */
  private getStageOptions(stage: ConversationStage): { label: string; value: string }[] | undefined {
    switch (stage) {
      case "service_select":
        return [
          { label: "Office Move", value: "office" },
          { label: "Warehouse Move", value: "warehouse" },
          { label: "IT Equipment", value: "it_equipment" },
        ]
      case "qualifying_questions":
        return [
          { label: "Small (<50 sqm)", value: "small" },
          { label: "Medium (50-200 sqm)", value: "medium" },
          { label: "Large (200+ sqm)", value: "large" },
        ]
      case "quote_generated":
        return [
          { label: "Check Dates", value: "check_dates" },
          { label: "Ask Question", value: "question" },
          { label: "Get Callback", value: "callback" },
        ]
      default:
        return undefined
    }
  }

  /**
   * Generate recovery message for returning user
   */
  static getRecoveryMessage(
    stage: ConversationStage,
    context?: {
      businessName?: string
      quoteAmount?: number
      selectedDate?: string
    },
  ): ReengagementMessage {
    let message = REENGAGEMENT_MESSAGES[stage].recovery

    // Personalize if we have context
    if (context?.businessName) {
      message = message.replace("Welcome back!", `Welcome back from ${context.businessName}!`)
    }
    if (context?.quoteAmount) {
      message += ` Your quote of $${context.quoteAmount.toLocaleString()} is still valid.`
    }
    if (context?.selectedDate) {
      message += ` You had selected ${context.selectedDate} for your move.`
    }

    return {
      type: "recovery_offer",
      message,
      options: [
        { label: "Continue", value: "continue" },
        { label: "Start Fresh", value: "restart" },
        { label: "Talk to Someone", value: "callback" },
      ],
      urgency: "medium",
    }
  }

  /**
   * Cleanup all timers
   */
  cleanup(): void {
    this.timers.forEach((timer) => clearTimeout(timer))
    this.timers.clear()
    this.attemptCounts.clear()
    this.callbacks.clear()
  }
}

/**
 * Create singleton instance
 */
let reengagementManager: ReengagementManager | null = null

export function getReengagementManager(): ReengagementManager {
  if (!reengagementManager) {
    reengagementManager = new ReengagementManager()
  }
  return reengagementManager
}
