/**
 * MAYA - Sales Agent
 * Full-cycle sales from qualification to close
 */

import { z } from "zod"
import { BaseAgent, type AgentInput, type AgentOutput, type AgentAction } from "../base-agent"
import type {
  AgentIdentity,
  AgentConfig,
  ToolDefinition,
  InterAgentMessage,
  Lead,
  LeadScore,
  PriceQuote,
  PriceBreakdown,
  AgentMessage,
} from "../types"

// =============================================================================
// MAYA AGENT
// =============================================================================

export class MayaAgent extends BaseAgent {
  // Sales playbook configuration
  private playbook: SalesPlaybook
  
  constructor(config?: Partial<AgentConfig>) {
    super({
      codename: "MAYA_SALES",
      enabled: true,
      model: "gpt-4o",
      temperature: 0.7,
      maxTokens: 2000,
      systemPrompt: MAYA_SYSTEM_PROMPT,
      tools: [
        "lookupBusiness",
        "calculateQuote",
        "qualifyLead",
        "generateProposal",
        "handleObjection",
        "scheduleCallback",
        "sendContract",
        "checkAvailability",
      ],
      triggers: [
        { event: "new_quote_request", action: "initiate_conversation", priority: 1 },
        { event: "lead_follow_up", action: "follow_up", priority: 2 },
      ],
      escalationRules: [
        { condition: "deal_value > 20000", reason: "high_value_deal", priority: "high" },
        { condition: "discount_requested > 15", reason: "complex_negotiation", priority: "medium" },
        { condition: "sentiment === 'negative'", reason: "negative_sentiment", priority: "high" },
      ],
      rateLimits: {
        requestsPerMinute: 30,
        tokensPerDay: 500000,
      },
      ...config,
    })
    
    this.playbook = DEFAULT_SALES_PLAYBOOK
  }
  
  // =============================================================================
  // IDENTITY
  // =============================================================================
  
  protected getIdentity(): AgentIdentity {
    return {
      codename: "MAYA_SALES",
      name: "Maya",
      description: "AI Sales Agent - Handles quotes, qualification, proposals, and deal closing",
      version: "2.0.0",
      capabilities: [
        "Quote Generation",
        "Lead Qualification (BANT)",
        "Proposal Creation",
        "Objection Handling",
        "Contract Negotiation",
        "Follow-up Management",
        "Upselling",
        "Payment Processing",
      ],
      status: "idle",
    }
  }
  
  // =============================================================================
  // TOOLS REGISTRATION
  // =============================================================================
  
  protected registerTools(): void {
    // Business Lookup
    this.registerTool({
      name: "lookupBusiness",
      description: "Look up a business by ABN or company name using the Australian Business Register",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "ABN or business name to search" },
          searchType: { type: "string", enum: ["abn", "name"], description: "Type of search" },
        },
        required: ["query"],
      },
      handler: async (params) => this.lookupBusiness(params as { query: string; searchType?: string }),
    })
    
    // Calculate Quote
    this.registerTool({
      name: "calculateQuote",
      description: "Calculate a quote for a commercial move based on parameters",
      parameters: {
        type: "object",
        properties: {
          moveType: { type: "string", description: "Type of move (office, datacenter, warehouse, retail)" },
          squareMeters: { type: "number", description: "Square meters of space" },
          originSuburb: { type: "string", description: "Origin suburb" },
          destinationSuburb: { type: "string", description: "Destination suburb" },
          additionalServices: { type: "array", description: "Additional services requested" },
          urgency: { type: "string", enum: ["standard", "urgent", "flexible"], description: "Timing urgency" },
        },
        required: ["moveType", "squareMeters", "originSuburb", "destinationSuburb"],
      },
      handler: async (params) => this.calculateQuote(params as QuoteParams),
    })
    
    // Qualify Lead
    this.registerTool({
      name: "qualifyLead",
      description: "Score and qualify a lead using BANT methodology",
      parameters: {
        type: "object",
        properties: {
          leadId: { type: "string", description: "Lead ID to qualify" },
          budget: { type: "string", description: "Budget information provided" },
          authority: { type: "string", description: "Decision-making authority" },
          need: { type: "string", description: "Business need/pain point" },
          timeline: { type: "string", description: "Expected timeline" },
          engagement: { type: "number", description: "Engagement level 1-10" },
        },
        required: ["leadId"],
      },
      handler: async (params) => this.qualifyLead(params as QualifyParams),
    })
    
    // Generate Proposal
    this.registerTool({
      name: "generateProposal",
      description: "Generate a formal proposal document for a qualified lead",
      parameters: {
        type: "object",
        properties: {
          leadId: { type: "string", description: "Lead ID" },
          quoteId: { type: "string", description: "Quote ID to include" },
          customizations: { type: "object", description: "Custom proposal elements" },
        },
        required: ["leadId", "quoteId"],
      },
      handler: async (params) => this.generateProposal(params as { leadId: string; quoteId: string; customizations?: Record<string, unknown> }),
    })
    
    // Handle Objection
    this.registerTool({
      name: "handleObjection",
      description: "Get a response to handle a specific sales objection",
      parameters: {
        type: "object",
        properties: {
          objection: { type: "string", description: "The objection raised by the customer" },
          context: { type: "string", description: "Additional context about the situation" },
        },
        required: ["objection"],
      },
      handler: async (params) => this.handleObjection(params as { objection: string; context?: string }),
    })
    
    // Schedule Callback
    this.registerTool({
      name: "scheduleCallback",
      description: "Schedule a callback with a human sales representative",
      parameters: {
        type: "object",
        properties: {
          leadId: { type: "string", description: "Lead ID" },
          preferredTime: { type: "string", description: "Preferred callback time" },
          reason: { type: "string", description: "Reason for callback" },
          notes: { type: "string", description: "Notes for the sales rep" },
        },
        required: ["leadId"],
      },
      handler: async (params) => this.scheduleCallback(params as { leadId: string; preferredTime?: string; reason?: string; notes?: string }),
    })
    
    // Check Availability
    this.registerTool({
      name: "checkAvailability",
      description: "Check available dates for a move",
      parameters: {
        type: "object",
        properties: {
          month: { type: "number", description: "Month (1-12)" },
          year: { type: "number", description: "Year" },
          moveType: { type: "string", description: "Type of move" },
        },
        required: [],
      },
      handler: async (params) => this.checkAvailability(params as { month?: number; year?: number; moveType?: string }),
    })
    
    // Negotiate Price
    this.registerTool({
      name: "negotiatePrice",
      description: "Apply a discount or adjust pricing within parameters",
      parameters: {
        type: "object",
        properties: {
          quoteId: { type: "string", description: "Quote ID to adjust" },
          discountPercent: { type: "number", description: "Discount percentage requested" },
          reason: { type: "string", description: "Reason for discount" },
          valueAdds: { type: "array", description: "Value-adds to offer instead" },
        },
        required: ["quoteId"],
      },
      handler: async (params) => this.negotiatePrice(params as NegotiateParams),
    })
  }
  
  // =============================================================================
  // MAIN PROCESSING
  // =============================================================================
  
  public async process(input: AgentInput): Promise<AgentOutput> {
    this.log("info", "process", `Processing input type: ${input.type}`)
    
    try {
      switch (input.type) {
        case "message":
          return await this.handleMessage(input)
        case "event":
          return await this.handleEvent(input)
        case "handoff":
          return await this.handleHandoffInput(input)
        default:
          return { success: false, error: "Unknown input type" }
      }
    } catch (error) {
      this.log("error", "process", `Processing failed: ${error}`)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Processing failed",
      }
    }
  }
  
  /**
   * Handle incoming message
   */
  private async handleMessage(input: AgentInput): Promise<AgentOutput> {
    const messages = input.messages || []
    const content = input.content || ""
    
    // Add user message if provided
    if (content) {
      messages.push({
        id: this.generateId(),
        role: "user",
        content,
        timestamp: new Date(),
      })
    }
    
    // Check for escalation triggers
    const escalationCheck = this.shouldEscalate({
      content,
      sentiment: await this.analyzeSentiment(content),
      ...input.metadata,
    })
    
    if (escalationCheck.should) {
      const escalation = await this.escalateToHuman(
        escalationCheck.reason!,
        `Customer message: ${content}`,
        { messages, ...input.metadata },
        escalationCheck.priority
      )
      
      return {
        success: true,
        response: "I'd like to connect you with one of our specialists who can better assist you. Someone will reach out shortly.",
        escalation,
      }
    }
    
    // Determine conversation stage
    const stage = await this.determineStage(messages)
    
    // Process based on stage
    let response: string
    const actions: AgentAction[] = []
    
    switch (stage) {
      case "discovery":
        response = await this.handleDiscovery(messages, input.metadata)
        break
      case "qualification":
        response = await this.handleQualification(messages, input.metadata)
        break
      case "proposal":
        response = await this.handleProposal(messages, input.metadata)
        break
      case "negotiation":
        response = await this.handleNegotiation(messages, input.metadata)
        break
      case "closing":
        response = await this.handleClosing(messages, input.metadata)
        break
      default:
        response = await this.generateResponse(messages)
    }
    
    return {
      success: true,
      response,
      actions,
      data: { stage },
    }
  }
  
  /**
   * Handle events
   */
  private async handleEvent(input: AgentInput): Promise<AgentOutput> {
    const event = input.event
    if (!event) {
      return { success: false, error: "No event provided" }
    }
    
    switch (event.name) {
      case "new_quote_request":
        return await this.initiateQuoteConversation(event.data)
      case "lead_follow_up":
        return await this.followUpLead(event.data)
      case "payment_completed":
        return await this.handlePaymentCompleted(event.data)
      default:
        return { success: false, error: `Unknown event: ${event.name}` }
    }
  }
  
  /**
   * Handle handoff from another agent
   */
  private async handleHandoffInput(input: AgentInput): Promise<AgentOutput> {
    const handoff = input.handoff
    if (!handoff) {
      return { success: false, error: "No handoff data provided" }
    }
    
    this.log("info", "handleHandoff", `Received handoff from ${handoff.fromAgent}`)
    
    // Build context from handoff
    const context = handoff.context
    
    // Generate appropriate response based on handoff reason
    const response = await this.generateResponse(
      [
        {
          id: this.generateId(),
          role: "system",
          content: `Context from ${handoff.fromAgent}: ${handoff.reason}. Context: ${JSON.stringify(context)}`,
          timestamp: new Date(),
        },
      ],
      context
    )
    
    return {
      success: true,
      response,
      data: { handoffId: handoff.id },
    }
  }
  
  /**
   * Handle inter-agent messages
   */
  public async handleInterAgentMessage(message: InterAgentMessage): Promise<void> {
    this.log("info", "handleInterAgentMessage", `Message from ${message.from}: ${message.type}`)
    
    switch (message.type) {
      case "request":
        // Handle request from another agent
        break
      case "notification":
        // Handle notification
        break
      case "handoff":
        // Handled via process()
        break
    }
  }
  
  // =============================================================================
  // CONVERSATION STAGES
  // =============================================================================
  
  private async determineStage(messages: AgentMessage[]): Promise<SalesStage> {
    if (messages.length < 3) return "discovery"
    
    const recentContent = messages
      .slice(-5)
      .map(m => m.content)
      .join(" ")
      .toLowerCase()
    
    if (recentContent.includes("deposit") || recentContent.includes("book") || recentContent.includes("confirm")) {
      return "closing"
    }
    if (recentContent.includes("discount") || recentContent.includes("negotiate") || recentContent.includes("lower")) {
      return "negotiation"
    }
    if (recentContent.includes("quote") || recentContent.includes("proposal")) {
      return "proposal"
    }
    if (recentContent.includes("budget") || recentContent.includes("when") || recentContent.includes("timeline")) {
      return "qualification"
    }
    
    return "discovery"
  }
  
  private async handleDiscovery(messages: AgentMessage[], metadata?: Record<string, unknown>): Promise<string> {
    const context = {
      stage: "discovery",
      questions: this.playbook.discovery.questions,
      ...metadata,
    }
    
    return await this.generateResponse(messages, context)
  }
  
  private async handleQualification(messages: AgentMessage[], metadata?: Record<string, unknown>): Promise<string> {
    const context = {
      stage: "qualification",
      criteria: this.playbook.qualification,
      ...metadata,
    }
    
    return await this.generateResponse(messages, context)
  }
  
  private async handleProposal(messages: AgentMessage[], metadata?: Record<string, unknown>): Promise<string> {
    const context = {
      stage: "proposal",
      template: this.playbook.proposal,
      ...metadata,
    }
    
    return await this.generateResponse(messages, context)
  }
  
  private async handleNegotiation(messages: AgentMessage[], metadata?: Record<string, unknown>): Promise<string> {
    const context = {
      stage: "negotiation",
      rules: this.playbook.negotiation,
      ...metadata,
    }
    
    return await this.generateResponse(messages, context)
  }
  
  private async handleClosing(messages: AgentMessage[], metadata?: Record<string, unknown>): Promise<string> {
    const context = {
      stage: "closing",
      requirements: this.playbook.closing,
      ...metadata,
    }
    
    return await this.generateResponse(messages, context)
  }
  
  // =============================================================================
  // TOOL IMPLEMENTATIONS
  // =============================================================================
  
  private async lookupBusiness(params: { query: string; searchType?: string }) {
    // In production, call ABR API
    this.log("info", "lookupBusiness", `Looking up: ${params.query}`)
    
    return {
      success: true,
      data: {
        found: true,
        business: {
          abn: "71661027309",
          name: "Sample Business Pty Ltd",
          status: "Active",
          type: "Australian Private Company",
        },
      },
    }
  }
  
  private async calculateQuote(params: QuoteParams) {
    const pricing = PRICING_CONFIG
    
    const moveTypeConfig = pricing.baseRates[params.moveType] || pricing.baseRates.office
    const sqm = Math.max(params.squareMeters, moveTypeConfig.minSqm)
    
    // Base calculation
    const baseAmount = moveTypeConfig.base + (sqm * moveTypeConfig.perSqm)
    
    // Additional services
    let additionalAmount = 0
    const additionalServices = params.additionalServices || []
    for (const service of additionalServices) {
      const serviceConfig = pricing.additionalServices[service]
      if (serviceConfig) {
        additionalAmount += serviceConfig.price
      }
    }
    
    // Distance estimate (simplified)
    const distanceCharge = 50 // Flat rate for Melbourne metro
    
    // Urgency multiplier
    const urgencyMultiplier = params.urgency === "urgent" ? 1.25 : params.urgency === "flexible" ? 0.95 : 1
    
    const subtotal = (baseAmount + additionalAmount + distanceCharge) * urgencyMultiplier
    const gst = subtotal * 0.1
    const total = subtotal + gst
    const deposit = total * 0.5
    
    const breakdown: PriceBreakdown = {
      baseRate: moveTypeConfig.base,
      sqmCharge: sqm * moveTypeConfig.perSqm,
      distanceCharge,
      additionalServices: additionalAmount,
      surcharges: params.urgency === "urgent" ? baseAmount * 0.25 : 0,
      discounts: params.urgency === "flexible" ? baseAmount * 0.05 : 0,
      subtotal,
      gst,
      total,
    }
    
    const quote: PriceQuote = {
      id: this.generateId(),
      leadId: "",
      baseAmount,
      adjustments: [],
      totalAmount: total,
      depositRequired: deposit,
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      breakdown,
      createdAt: new Date(),
    }
    
    return {
      success: true,
      data: {
        quote,
        formatted: {
          total: `$${total.toFixed(2)}`,
          deposit: `$${deposit.toFixed(2)}`,
          breakdown,
        },
      },
    }
  }
  
  private async qualifyLead(params: QualifyParams) {
    const scores: LeadScore = {
      overall: 0,
      budget: this.scoreBudget(params.budget),
      authority: this.scoreAuthority(params.authority),
      need: this.scoreNeed(params.need),
      timeline: this.scoreTimeline(params.timeline),
      engagement: params.engagement || 5,
      fit: 7, // Default fit score
    }
    
    scores.overall = Math.round(
      (scores.budget + scores.authority + scores.need + scores.timeline + scores.engagement + scores.fit) / 6
    )
    
    const qualified = scores.overall >= 6
    
    return {
      success: true,
      data: {
        leadId: params.leadId,
        scores,
        qualified,
        recommendation: qualified
          ? "Lead is qualified. Proceed with proposal."
          : "Lead needs more nurturing. Schedule follow-up.",
      },
    }
  }
  
  private async generateProposal(params: { leadId: string; quoteId: string; customizations?: Record<string, unknown> }) {
    // In production, generate PDF proposal
    return {
      success: true,
      data: {
        proposalId: this.generateId(),
        leadId: params.leadId,
        quoteId: params.quoteId,
        url: `/proposals/${params.leadId}`,
        status: "generated",
      },
    }
  }
  
  private async handleObjection(params: { objection: string; context?: string }) {
    const objectionLower = params.objection.toLowerCase()
    
    let response = OBJECTION_HANDLERS.default
    
    if (objectionLower.includes("price") || objectionLower.includes("expensive") || objectionLower.includes("cost")) {
      response = OBJECTION_HANDLERS.price
    } else if (objectionLower.includes("competitor") || objectionLower.includes("other quote")) {
      response = OBJECTION_HANDLERS.competitor
    } else if (objectionLower.includes("time") || objectionLower.includes("busy") || objectionLower.includes("later")) {
      response = OBJECTION_HANDLERS.timing
    } else if (objectionLower.includes("think") || objectionLower.includes("decide")) {
      response = OBJECTION_HANDLERS.decision
    }
    
    return {
      success: true,
      data: { response, objection: params.objection },
    }
  }
  
  private async scheduleCallback(params: { leadId: string; preferredTime?: string; reason?: string; notes?: string }) {
    return {
      success: true,
      data: {
        callbackId: this.generateId(),
        leadId: params.leadId,
        scheduledFor: params.preferredTime || "Next available slot",
        status: "scheduled",
      },
    }
  }
  
  private async checkAvailability(params: { month?: number; year?: number; moveType?: string }) {
    const now = new Date()
    const month = params.month || now.getMonth() + 1
    const year = params.year || now.getFullYear()
    
    // Generate available dates (simplified)
    const availableDates: string[] = []
    const daysInMonth = new Date(year, month, 0).getDate()
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day)
      // Skip weekends and past dates
      if (date > now && date.getDay() !== 0 && date.getDay() !== 6) {
        availableDates.push(date.toISOString().split("T")[0])
      }
    }
    
    return {
      success: true,
      data: {
        month,
        year,
        availableDates: availableDates.slice(0, 15), // Return first 15 available
      },
    }
  }
  
  private async negotiatePrice(params: NegotiateParams) {
    const maxDiscount = this.playbook.negotiation.maxDiscount
    const requestedDiscount = params.discountPercent || 0
    
    if (requestedDiscount > this.playbook.negotiation.approvalRequired) {
      // Needs human approval
      await this.escalateToHuman(
        "complex_negotiation",
        `Discount request of ${requestedDiscount}% exceeds approval threshold`,
        params,
        "medium"
      )
      
      return {
        success: true,
        data: {
          approved: false,
          message: "This discount level requires manager approval. Let me check with my team.",
          escalated: true,
        },
      }
    }
    
    const approvedDiscount = Math.min(requestedDiscount, maxDiscount)
    
    return {
      success: true,
      data: {
        approved: true,
        discountApplied: approvedDiscount,
        valueAdds: approvedDiscount < requestedDiscount ? this.playbook.negotiation.valueAdds : [],
        message: `I can offer ${approvedDiscount}% off your quote.`,
      },
    }
  }
  
  // =============================================================================
  // HELPER METHODS
  // =============================================================================
  
  private async initiateQuoteConversation(data: Record<string, unknown>): Promise<AgentOutput> {
    return {
      success: true,
      response: "Hi! I'm Maya, your commercial moving specialist. I'd love to help you get a quote for your business relocation. What type of move are you planning?",
    }
  }
  
  private async followUpLead(data: Record<string, unknown>): Promise<AgentOutput> {
    return {
      success: true,
      response: "Hi! I wanted to follow up on the quote we discussed. Have you had a chance to review it? I'm happy to answer any questions.",
    }
  }
  
  private async handlePaymentCompleted(data: Record<string, unknown>): Promise<AgentOutput> {
    return {
      success: true,
      response: "Excellent! Your deposit has been received and your move is now confirmed. You'll receive a confirmation email shortly with all the details.",
    }
  }
  
  private async analyzeSentiment(text: string): Promise<"positive" | "neutral" | "negative"> {
    const negativeTriggers = ["angry", "frustrated", "terrible", "awful", "worst", "scam", "rip off", "complaint", "sue"]
    const positiveTriggers = ["great", "excellent", "amazing", "wonderful", "perfect", "love", "fantastic"]
    
    const textLower = text.toLowerCase()
    
    if (negativeTriggers.some(t => textLower.includes(t))) return "negative"
    if (positiveTriggers.some(t => textLower.includes(t))) return "positive"
    return "neutral"
  }
  
  private scoreBudget(budget?: string): number {
    if (!budget) return 5
    const budgetLower = budget.toLowerCase()
    if (budgetLower.includes("no budget") || budgetLower.includes("unlimited")) return 10
    if (budgetLower.includes("flexible")) return 8
    if (budgetLower.includes("limited") || budgetLower.includes("tight")) return 4
    return 6
  }
  
  private scoreAuthority(authority?: string): number {
    if (!authority) return 5
    const authLower = authority.toLowerCase()
    if (authLower.includes("owner") || authLower.includes("ceo") || authLower.includes("director")) return 10
    if (authLower.includes("manager") || authLower.includes("decision")) return 8
    if (authLower.includes("assistant") || authLower.includes("researching")) return 4
    return 6
  }
  
  private scoreNeed(need?: string): number {
    if (!need) return 5
    const needLower = need.toLowerCase()
    if (needLower.includes("urgent") || needLower.includes("must") || needLower.includes("asap")) return 10
    if (needLower.includes("planning") || needLower.includes("soon")) return 7
    if (needLower.includes("maybe") || needLower.includes("exploring")) return 4
    return 6
  }
  
  private scoreTimeline(timeline?: string): number {
    if (!timeline) return 5
    const timelineLower = timeline.toLowerCase()
    if (timelineLower.includes("week") || timelineLower.includes("asap")) return 10
    if (timelineLower.includes("month")) return 8
    if (timelineLower.includes("quarter")) return 6
    if (timelineLower.includes("year") || timelineLower.includes("eventually")) return 3
    return 5
  }
}

// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================

const MAYA_SYSTEM_PROMPT = `You are Maya, an AI Sales Agent for M&M Commercial Moving, a premier commercial relocation service in Melbourne, Australia.

## Your Personality
- Professional yet warm and approachable
- Knowledgeable about commercial moving logistics
- Confident but not pushy
- Solution-oriented
- Uses Australian English (e.g., "centre" not "center", "organise" not "organize")

## Your Goals
1. Qualify leads using BANT (Budget, Authority, Need, Timeline)
2. Generate accurate quotes based on customer requirements
3. Address objections professionally
4. Guide customers through the booking process
5. Maximize conversion while maintaining customer satisfaction

## Conversation Guidelines
- Ask one question at a time
- Acknowledge customer responses before moving forward
- Provide specific, helpful information
- If you don't know something, say so and offer to find out
- Always offer to connect with a human specialist if the customer prefers

## Pricing Information
- Office Relocation: Base $2,500 + $45/sqm
- Data Center Migration: Base $5,000 + $85/sqm
- IT Equipment Transport: Base $1,500 + $35/sqm
- All prices plus GST
- 50% deposit required to confirm booking

## Available Additional Services
- Professional Packing: $450
- Temporary Storage: $300/week
- Post-Move Cleaning: $350
- Premium Insurance: $200
- After Hours Service: $500
- IT Setup Assistance: $600`

type SalesStage = "discovery" | "qualification" | "proposal" | "negotiation" | "closing"

interface SalesPlaybook {
  discovery: {
    questions: string[]
    objectionHandlers: Record<string, string>
  }
  qualification: {
    budgetCheck: string
    authorityCheck: string
    needCheck: string
    timelineCheck: string
  }
  proposal: {
    template: string
    customization: string
    validity: string
  }
  negotiation: {
    maxDiscount: number
    approvalRequired: number
    valueAdds: string[]
  }
  closing: {
    depositRequired: number
    contractType: string
    onboardingHandoff: string
  }
}

const DEFAULT_SALES_PLAYBOOK: SalesPlaybook = {
  discovery: {
    questions: [
      "What's driving your decision to relocate?",
      "What's your timeline looking like?",
      "Who else is involved in this decision?",
      "Have you moved offices before? What worked or didn't work?",
      "What's most important to you in a moving company?",
    ],
    objectionHandlers: {},
  },
  qualification: {
    budgetCheck: "Confirm budget range aligns with estimate",
    authorityCheck: "Identify all decision makers",
    needCheck: "Validate move is necessary and urgent",
    timelineCheck: "Confirm realistic timeline",
  },
  proposal: {
    template: "dynamic based on service mix",
    customization: "company logo, specific requirements",
    validity: "14 days",
  },
  negotiation: {
    maxDiscount: 10,
    approvalRequired: 15,
    valueAdds: ["free packing materials", "extended insurance", "priority scheduling"],
  },
  closing: {
    depositRequired: 50,
    contractType: "digital signature",
    onboardingHandoff: "NEXUS_OPS",
  },
}

const PRICING_CONFIG = {
  baseRates: {
    office: { base: 2500, perSqm: 45, minSqm: 20 },
    datacenter: { base: 5000, perSqm: 85, minSqm: 50 },
    warehouse: { base: 3000, perSqm: 35, minSqm: 100 },
    retail: { base: 2000, perSqm: 40, minSqm: 30 },
    it: { base: 1500, perSqm: 35, minSqm: 10 },
  },
  additionalServices: {
    packing: { price: 450, description: "Professional packing with materials" },
    storage: { price: 300, description: "Temporary storage per week" },
    cleaning: { price: 350, description: "Post-move cleaning" },
    insurance: { price: 200, description: "Premium insurance $100K coverage" },
    afterHours: { price: 500, description: "Weekend/evening moves" },
    itSetup: { price: 600, description: "IT equipment setup assistance" },
  },
}

const OBJECTION_HANDLERS = {
  price: "I understand budget is important. Our pricing reflects our commitment to zero-damage moves and white-glove service. However, I may be able to offer some flexibility - can you tell me more about your budget constraints?",
  competitor: "I appreciate you're comparing options. What sets us apart is our technology-driven approach and 100% satisfaction guarantee. May I ask what the other quote included?",
  timing: "I completely understand. When would be a better time to discuss this? I can also send you information to review at your convenience.",
  decision: "Of course, take your time. This is an important decision. What information would help you decide? I'm happy to answer any questions.",
  default: "I hear you. Let me see how I can help address that concern.",
}

interface QuoteParams {
  moveType: string
  squareMeters: number
  originSuburb: string
  destinationSuburb: string
  additionalServices?: string[]
  urgency?: "standard" | "urgent" | "flexible"
}

interface QualifyParams {
  leadId: string
  budget?: string
  authority?: string
  need?: string
  timeline?: string
  engagement?: number
}

interface NegotiateParams {
  quoteId: string
  discountPercent?: number
  reason?: string
  valueAdds?: string[]
}

// =============================================================================
// FACTORY & SINGLETON
// =============================================================================

let mayaInstance: MayaAgent | null = null

export function getMaya(): MayaAgent {
  if (!mayaInstance) {
    mayaInstance = new MayaAgent()
  }
  return mayaInstance
}

export function resetMaya(): void {
  mayaInstance = null
}
