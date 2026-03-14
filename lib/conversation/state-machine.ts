/**
 * Conversation State Machine
 * Manages conversation flow transitions with validation and guardrails
 */

export type ConversationStage =
  | "greeting"
  | "business_lookup"
  | "business_confirm"
  | "service_select"
  | "qualifying_questions"
  | "location_origin"
  | "location_destination"
  | "quote_generated"
  | "date_select"
  | "contact_collect"
  | "payment"
  | "complete"
  | "error_recovery"
  | "human_escalation"

export interface StageRequirements {
  requiredFields: string[]
  nextStages: ConversationStage[]
  fallbackStage: ConversationStage
  maxIdleTimeMs: number
  reengagementPrompt: string
  qualifyingQuestions?: string[]
}

export interface ConversationContext {
  stage: ConversationStage
  businessName?: string
  businessAbn?: string
  serviceType?: string
  squareMeters?: number
  workstationCount?: number
  originSuburb?: string
  destinationSuburb?: string
  quoteAmount?: number
  selectedDate?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  depositAmount?: number
  lastMessageTime: number
  errorCount: number
  stageStartTime: number
  qualifyingAnswers: Record<string, string | number>
  inventoryItems: InventoryItem[]
}

export interface InventoryItem {
  category: string
  itemType: string
  quantity: number
  notes?: string
}

export interface TransitionResult {
  allowed: boolean
  reason?: string
  missingFields?: string[]
  suggestedAction?: string
}

export interface ReengagementCheck {
  needsReengagement: boolean
  idleTimeMs: number
  prompt?: string
  urgencyLevel: "low" | "medium" | "high" | "critical"
}

// Stage configuration with requirements and transitions
const STAGE_CONFIG: Record<ConversationStage, StageRequirements> = {
  greeting: {
    requiredFields: [],
    nextStages: ["business_lookup", "service_select"],
    fallbackStage: "greeting",
    maxIdleTimeMs: 60000, // 1 minute
    reengagementPrompt:
      "Hi there! I'm Maya from M&M Commercial Moving. Would you like help getting a quote for your business move?",
  },
  business_lookup: {
    requiredFields: [],
    nextStages: ["business_confirm", "service_select"],
    fallbackStage: "greeting",
    maxIdleTimeMs: 90000,
    reengagementPrompt: "I can look up your business by name or ABN. What's your business name?",
  },
  business_confirm: {
    requiredFields: ["businessName", "businessAbn"],
    nextStages: ["service_select"],
    fallbackStage: "business_lookup",
    maxIdleTimeMs: 60000,
    reengagementPrompt: "Is this the correct business? Just confirm and we can proceed with your quote.",
  },
  service_select: {
    requiredFields: [],
    nextStages: ["qualifying_questions"],
    fallbackStage: "service_select",
    maxIdleTimeMs: 90000,
    reengagementPrompt:
      "What type of move are you planning? We handle office relocations, warehouse moves, data centres, IT equipment, and retail stores.",
  },
  qualifying_questions: {
    requiredFields: ["serviceType"],
    nextStages: ["location_origin"],
    fallbackStage: "service_select",
    maxIdleTimeMs: 120000, // 2 minutes for detailed questions
    reengagementPrompt:
      "I just need a few more details to give you an accurate quote. Can you tell me about the size of your move?",
    qualifyingQuestions: [
      "How many workstations or desks need to be moved?",
      "Do you have any server rooms or IT infrastructure?",
      "Are there any heavy or specialty items like safes or machinery?",
    ],
  },
  location_origin: {
    requiredFields: ["serviceType", "squareMeters"],
    nextStages: ["location_destination"],
    fallbackStage: "qualifying_questions",
    maxIdleTimeMs: 60000,
    reengagementPrompt: "Where are you moving from? Just need the suburb name.",
  },
  location_destination: {
    requiredFields: ["originSuburb"],
    nextStages: ["quote_generated"],
    fallbackStage: "location_origin",
    maxIdleTimeMs: 60000,
    reengagementPrompt: "And where are you moving to?",
  },
  quote_generated: {
    requiredFields: ["originSuburb", "destinationSuburb", "squareMeters", "serviceType"],
    nextStages: ["date_select", "qualifying_questions"],
    fallbackStage: "location_destination",
    maxIdleTimeMs: 180000, // 3 minutes to review quote
    reengagementPrompt:
      "Have you had a chance to review the quote? I'm happy to answer any questions or adjust the services included.",
  },
  date_select: {
    requiredFields: ["quoteAmount"],
    nextStages: ["contact_collect"],
    fallbackStage: "quote_generated",
    maxIdleTimeMs: 120000,
    reengagementPrompt: "When would you like to schedule your move? I can show you our available dates.",
  },
  contact_collect: {
    requiredFields: ["selectedDate"],
    nextStages: ["payment"],
    fallbackStage: "date_select",
    maxIdleTimeMs: 120000,
    reengagementPrompt:
      "I just need your contact details to confirm the booking. What's the best name and number for you?",
  },
  payment: {
    requiredFields: ["contactName", "contactEmail", "contactPhone"],
    nextStages: ["complete"],
    fallbackStage: "contact_collect",
    maxIdleTimeMs: 300000, // 5 minutes for payment
    reengagementPrompt:
      "To secure your booking, we just need the 50% deposit. Would you like to proceed with the payment?",
  },
  complete: {
    requiredFields: ["depositAmount"],
    nextStages: [],
    fallbackStage: "complete",
    maxIdleTimeMs: Number.POSITIVE_INFINITY,
    reengagementPrompt: "Your booking is confirmed! Is there anything else I can help you with?",
  },
  error_recovery: {
    requiredFields: [],
    nextStages: ["greeting", "business_lookup", "service_select", "human_escalation"],
    fallbackStage: "human_escalation",
    maxIdleTimeMs: 60000,
    reengagementPrompt: "I apologise for the technical difficulty. Let me try to help you again. Where were we?",
  },
  human_escalation: {
    requiredFields: [],
    nextStages: ["greeting"],
    fallbackStage: "human_escalation",
    maxIdleTimeMs: Number.POSITIVE_INFINITY,
    reengagementPrompt:
      "I've notified our team to give you a call. Is there anything else I can help with in the meantime?",
  },
}

// Qualifying questions by service type
const SERVICE_QUALIFYING_QUESTIONS: Record<string, string[]> = {
  office: [
    "How many workstations or desks need to be moved?",
    "Do you have a server room or IT infrastructure?",
    "Are there any heavy items like safes or large copiers?",
    "What floor is your current office on?",
  ],
  warehouse: [
    "Do you have pallet racking that needs to be moved?",
    "Approximately how many pallets of stock are there?",
    "Is there any heavy machinery or forklifts?",
    "What's the approximate square meterage?",
  ],
  datacenter: [
    "How many server racks need to be relocated?",
    "Is there any UPS or cooling equipment?",
    "Do you need IT setup assistance at the new location?",
    "Is this a hot or cold migration?",
  ],
  "it-equipment": [
    "How many computers and monitors are being moved?",
    "Are there any servers or network equipment?",
    "Do you need cable management and setup at the destination?",
    "Will staff be onsite to log back in after the move?",
  ],
  retail: [
    "Do you have display fixtures or shelving that needs moving?",
    "Is there point-of-sale equipment to relocate?",
    "Will the new location need fit-out assistance?",
    "What's the approximate store size in square metres?",
  ],
}

export class ConversationStateMachine {
  private context: ConversationContext

  constructor(initialContext?: Partial<ConversationContext>) {
    this.context = {
      stage: "greeting",
      lastMessageTime: Date.now(),
      errorCount: 0,
      stageStartTime: Date.now(),
      qualifyingAnswers: {},
      inventoryItems: [],
      ...initialContext,
    }
  }

  /**
   * Get current conversation context
   */
  getContext(): ConversationContext {
    return { ...this.context }
  }

  /**
   * Get current stage configuration
   */
  getStageConfig(): StageRequirements {
    return STAGE_CONFIG[this.context.stage]
  }

  /**
   * Get qualifying questions for current service type
   */
  getQualifyingQuestions(): string[] {
    if (!this.context.serviceType) return []
    return SERVICE_QUALIFYING_QUESTIONS[this.context.serviceType] || []
  }

  /**
   * Check if transition to a new stage is allowed
   */
  canTransitionTo(targetStage: ConversationStage): TransitionResult {
    const currentConfig = STAGE_CONFIG[this.context.stage]

    // Check if transition is allowed from current stage
    if (
      !currentConfig.nextStages.includes(targetStage) &&
      targetStage !== "error_recovery" &&
      targetStage !== "human_escalation"
    ) {
      return {
        allowed: false,
        reason: `Cannot transition from ${this.context.stage} to ${targetStage}`,
        suggestedAction: `Stay in ${this.context.stage} or move to one of: ${currentConfig.nextStages.join(", ")}`,
      }
    }

    // Check if required fields for target stage are present
    const targetConfig = STAGE_CONFIG[targetStage]
    const missingFields = targetConfig.requiredFields.filter(
      (field) => !this.context[field as keyof ConversationContext],
    )

    if (missingFields.length > 0) {
      return {
        allowed: false,
        reason: `Missing required fields for ${targetStage}`,
        missingFields,
        suggestedAction: `Collect: ${missingFields.join(", ")}`,
      }
    }

    return { allowed: true }
  }

  /**
   * Transition to a new stage
   */
  transitionTo(targetStage: ConversationStage, updates?: Partial<ConversationContext>): TransitionResult {
    const canTransition = this.canTransitionTo(targetStage)

    if (!canTransition.allowed && targetStage !== "error_recovery" && targetStage !== "human_escalation") {
      return canTransition
    }

    this.context = {
      ...this.context,
      ...updates,
      stage: targetStage,
      stageStartTime: Date.now(),
      lastMessageTime: Date.now(),
    }

    return { allowed: true }
  }

  /**
   * Update context without changing stage
   */
  updateContext(updates: Partial<ConversationContext>): void {
    this.context = {
      ...this.context,
      ...updates,
      lastMessageTime: Date.now(),
    }
  }

  /**
   * Record an error and check if escalation is needed
   */
  recordError(): { shouldEscalate: boolean; errorCount: number } {
    this.context.errorCount++
    const shouldEscalate = this.context.errorCount >= 3

    if (shouldEscalate) {
      this.transitionTo("human_escalation")
    }

    return {
      shouldEscalate,
      errorCount: this.context.errorCount,
    }
  }

  /**
   * Reset error count (call after successful interaction)
   */
  clearErrors(): void {
    this.context.errorCount = 0
  }

  /**
   * Check if re-engagement is needed
   */
  checkReengagement(): ReengagementCheck {
    const config = STAGE_CONFIG[this.context.stage]
    const idleTimeMs = Date.now() - this.context.lastMessageTime

    if (idleTimeMs < config.maxIdleTimeMs) {
      return {
        needsReengagement: false,
        idleTimeMs,
        urgencyLevel: "low",
      }
    }

    // Determine urgency based on stage and idle time
    let urgencyLevel: "low" | "medium" | "high" | "critical" = "medium"

    if (this.context.stage === "payment") {
      urgencyLevel = idleTimeMs > 600000 ? "critical" : "high"
    } else if (this.context.stage === "quote_generated") {
      urgencyLevel = idleTimeMs > 300000 ? "high" : "medium"
    } else if (idleTimeMs > config.maxIdleTimeMs * 3) {
      urgencyLevel = "high"
    }

    return {
      needsReengagement: true,
      idleTimeMs,
      prompt: config.reengagementPrompt,
      urgencyLevel,
    }
  }

  /**
   * Get suggested next action based on current state
   */
  getSuggestedAction(): string {
    const config = STAGE_CONFIG[this.context.stage]

    switch (this.context.stage) {
      case "greeting":
        return "Ask for business name or ABN"
      case "business_lookup":
        return "Look up business and confirm details"
      case "business_confirm":
        return "Show service options"
      case "service_select":
        return "Wait for service selection, then ask qualifying questions"
      case "qualifying_questions":
        const unanswered = this.getUnansweredQualifyingQuestions()
        return unanswered.length > 0 ? `Ask: ${unanswered[0]}` : "Ask for origin location"
      case "location_origin":
        return "Ask for destination location"
      case "location_destination":
        return "Calculate and present quote"
      case "quote_generated":
        return "Offer to show available dates"
      case "date_select":
        return "Collect contact information"
      case "contact_collect":
        return "Initiate payment"
      case "payment":
        return "Wait for payment completion"
      case "complete":
        return "Confirm booking and offer additional help"
      case "error_recovery":
        return "Apologize and resume from last known good state"
      case "human_escalation":
        return "Offer callback or direct phone number"
      default:
        return config.reengagementPrompt
    }
  }

  /**
   * Get unanswered qualifying questions for current service
   */
  getUnansweredQualifyingQuestions(): string[] {
    const questions = this.getQualifyingQuestions()
    const answeredKeys = Object.keys(this.context.qualifyingAnswers)

    return questions.filter((_, index) => !answeredKeys.includes(`q${index}`))
  }

  /**
   * Add inventory item
   */
  addInventoryItem(item: InventoryItem): void {
    const existingIndex = this.context.inventoryItems.findIndex(
      (i) => i.category === item.category && i.itemType === item.itemType,
    )

    if (existingIndex >= 0) {
      this.context.inventoryItems[existingIndex].quantity += item.quantity
    } else {
      this.context.inventoryItems.push(item)
    }

    this.context.lastMessageTime = Date.now()
  }

  /**
   * Get inventory summary for quote calculation
   */
  getInventorySummary(): { totalItems: number; estimatedSqm: number; categories: string[] } {
    const totalItems = this.context.inventoryItems.reduce((sum, item) => sum + item.quantity, 0)
    const categories = [...new Set(this.context.inventoryItems.map((i) => i.category))]

    // Rough estimation of square meters based on items
    const estimatedSqm = this.context.inventoryItems.reduce((sum, item) => {
      const sqmPerItem = getEstimatedSqmForItem(item.itemType)
      return sum + sqmPerItem * item.quantity
    }, 0)

    return { totalItems, estimatedSqm, categories }
  }

  /**
   * Export state for persistence
   */
  toJSON(): ConversationContext {
    return { ...this.context }
  }

  /**
   * Import state from persistence
   */
  static fromJSON(data: ConversationContext): ConversationStateMachine {
    return new ConversationStateMachine(data)
  }
}

/**
 * Estimate square meters for inventory items
 */
function getEstimatedSqmForItem(itemType: string): number {
  const estimates: Record<string, number> = {
    // Workstations
    desk: 2.5,
    workstation: 3,
    executive_desk: 4,
    reception_desk: 5,

    // Seating
    office_chair: 0.5,
    executive_chair: 0.7,
    visitor_chair: 0.4,
    conference_chair: 0.5,

    // Storage
    filing_cabinet_2dr: 0.5,
    filing_cabinet_4dr: 0.7,
    bookshelf: 1,
    storage_cabinet: 1.5,
    locker: 0.5,

    // Meeting
    conference_table_small: 4,
    conference_table_large: 8,
    whiteboard: 0.5,
    projector: 0.3,

    // IT
    computer: 0.3,
    monitor: 0.2,
    printer_small: 0.5,
    printer_large: 1,
    server_rack: 2,
    network_cabinet: 1,

    // Specialty
    safe_small: 0.5,
    safe_large: 1,
    copier: 1.5,
    plotter: 2,
  }

  return estimates[itemType] || 1
}

// Export singleton factory
let stateMachineInstance: ConversationStateMachine | null = null

export function getStateMachine(conversationId?: string): ConversationStateMachine {
  if (!stateMachineInstance) {
    stateMachineInstance = new ConversationStateMachine()
  }
  return stateMachineInstance
}

export function resetStateMachine(): void {
  stateMachineInstance = null
}
