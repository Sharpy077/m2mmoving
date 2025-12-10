/**
 * SENTINEL - Customer Support Agent
 * 24/7 customer support, issue resolution, and satisfaction management
 */

import { z } from "zod"
import { BaseAgent, type AgentInput, type AgentOutput, type AgentAction } from "../base-agent"
import type {
  AgentIdentity,
  AgentConfig,
  ToolDefinition,
  InterAgentMessage,
  SupportTicket,
  TicketMessage,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  Job,
  AgentMessage,
} from "../types"

// =============================================================================
// SENTINEL AGENT
// =============================================================================

export class SentinelAgent extends BaseAgent {
  // Support configuration
  private supportConfig: SupportConfig

  constructor(config?: Partial<AgentConfig>) {
    super({
      codename: "SENTINEL_CS",
      enabled: true,
      model: "gpt-4o",
      temperature: 0.5, // Lower temperature for more consistent support responses
      maxTokens: 1500,
      systemPrompt: SENTINEL_SYSTEM_PROMPT,
      tools: [
        "getBookingStatus",
        "modifyBooking",
        "createTicket",
        "updateTicket",
        "searchFAQ",
        "sendNotification",
        "offerCompensation",
        "escalateToHuman",
      ],
      triggers: [
        { event: "support_request", action: "handle_inquiry", priority: 1 },
        { event: "complaint_received", action: "handle_complaint", priority: 1 },
        { event: "booking_inquiry", action: "check_status", priority: 2 },
      ],
      escalationRules: [
        { condition: "category === 'damage'", reason: "damage_claim", priority: "high" },
        { condition: "sentiment === 'negative'", reason: "negative_sentiment", priority: "high" },
        { condition: "customer_requested_human", reason: "customer_requested", priority: "medium" },
        { condition: "ticket_value > 500", reason: "high_value_deal", priority: "medium" },
      ],
      rateLimits: {
        requestsPerMinute: 60,
        tokensPerDay: 750000,
      },
      ...config,
    })

    this.supportConfig = DEFAULT_SUPPORT_CONFIG
  }

  // =============================================================================
  // IDENTITY
  // =============================================================================

  protected getIdentity(): AgentIdentity {
    return {
      codename: "SENTINEL_CS",
      name: "Sentinel",
      description: "AI Customer Support Agent - Handles inquiries, complaints, booking management, and issue resolution",
      version: "1.0.0",
      capabilities: [
        "Inquiry Handling",
        "Booking Management",
        "Complaint Resolution",
        "Status Updates",
        "FAQ Automation",
        "Ticket Management",
        "Escalation Routing",
        "CSAT Collection",
      ],
      status: "idle",
    }
  }

  // =============================================================================
  // TOOLS REGISTRATION
  // =============================================================================

  protected registerTools(): void {
    // Get Booking Status
    this.registerTool({
      name: "getBookingStatus",
      description: "Get the current status of a booking/move",
      parameters: {
        type: "object",
        properties: {
          bookingId: { type: "string", description: "Booking ID" },
          email: { type: "string", description: "Customer email for lookup" },
          phone: { type: "string", description: "Customer phone for lookup" },
        },
        required: [],
      },
      handler: async (params) => this.getBookingStatus(params as BookingLookup),
    })

    // Modify Booking
    this.registerTool({
      name: "modifyBooking",
      description: "Modify an existing booking (reschedule, update details)",
      parameters: {
        type: "object",
        properties: {
          bookingId: { type: "string", description: "Booking ID to modify" },
          action: { type: "string", enum: ["reschedule", "update_address", "add_service", "cancel"], description: "Type of modification" },
          newDate: { type: "string", description: "New date for reschedule" },
          newAddress: { type: "string", description: "New address" },
          additionalService: { type: "string", description: "Service to add" },
          reason: { type: "string", description: "Reason for modification" },
        },
        required: ["bookingId", "action"],
      },
      handler: async (params) => this.modifyBooking(params as ModifyBookingParams),
    })

    // Create Ticket
    this.registerTool({
      name: "createTicket",
      description: "Create a support ticket for tracking an issue",
      parameters: {
        type: "object",
        properties: {
          customerId: { type: "string", description: "Customer ID" },
          category: { type: "string", enum: ["inquiry", "booking", "complaint", "damage", "refund", "other"], description: "Ticket category" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Priority level" },
          subject: { type: "string", description: "Ticket subject" },
          description: { type: "string", description: "Detailed description" },
          bookingId: { type: "string", description: "Related booking ID" },
        },
        required: ["category", "subject", "description"],
      },
      handler: async (params) => this.createTicket(params as CreateTicketParams),
    })

    // Update Ticket
    this.registerTool({
      name: "updateTicket",
      description: "Update an existing support ticket",
      parameters: {
        type: "object",
        properties: {
          ticketId: { type: "string", description: "Ticket ID" },
          status: { type: "string", enum: ["open", "pending", "in_progress", "resolved", "closed"], description: "New status" },
          resolution: { type: "string", description: "Resolution details" },
          note: { type: "string", description: "Internal note to add" },
        },
        required: ["ticketId"],
      },
      handler: async (params) => this.updateTicket(params as UpdateTicketParams),
    })

    // Search FAQ
    this.registerTool({
      name: "searchFAQ",
      description: "Search the FAQ knowledge base for answers",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          category: { type: "string", description: "Optional category filter" },
        },
        required: ["query"],
      },
      handler: async (params) => this.searchFAQ(params as { query: string; category?: string }),
    })

    // Send Notification
    this.registerTool({
      name: "sendNotification",
      description: "Send a notification to the customer",
      parameters: {
        type: "object",
        properties: {
          customerId: { type: "string", description: "Customer ID" },
          channel: { type: "string", enum: ["email", "sms", "both"], description: "Notification channel" },
          type: { type: "string", enum: ["status_update", "reminder", "confirmation", "follow_up"], description: "Notification type" },
          message: { type: "string", description: "Custom message" },
        },
        required: ["customerId", "channel", "type"],
      },
      handler: async (params) => this.sendNotification(params as NotificationParams),
    })

    // Offer Compensation
    this.registerTool({
      name: "offerCompensation",
      description: "Offer compensation to resolve an issue (within limits)",
      parameters: {
        type: "object",
        properties: {
          ticketId: { type: "string", description: "Related ticket ID" },
          type: { type: "string", enum: ["discount", "refund", "credit", "service"], description: "Compensation type" },
          amount: { type: "number", description: "Amount in AUD" },
          reason: { type: "string", description: "Reason for compensation" },
        },
        required: ["ticketId", "type", "reason"],
      },
      handler: async (params) => this.offerCompensation(params as CompensationParams),
    })

    // Schedule Follow-up
    this.registerTool({
      name: "scheduleFollowUp",
      description: "Schedule a follow-up contact with the customer",
      parameters: {
        type: "object",
        properties: {
          ticketId: { type: "string", description: "Ticket ID" },
          followUpDate: { type: "string", description: "Date for follow-up" },
          channel: { type: "string", enum: ["email", "phone", "sms"], description: "Follow-up channel" },
          notes: { type: "string", description: "Notes for follow-up" },
        },
        required: ["ticketId", "followUpDate"],
      },
      handler: async (params) => this.scheduleFollowUp(params as FollowUpParams),
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

    // Analyze intent and sentiment
    const intent = await this.classifyIntent(content)
    const sentiment = await this.analyzeSentiment(content)

    // Check for escalation triggers
    if (sentiment === "negative" || intent === "complaint" || intent === "damage") {
      const escalationCheck = this.shouldEscalate({
        content,
        sentiment,
        category: intent,
        ...input.metadata,
      })

      if (escalationCheck.should) {
        // Create ticket first
        const ticketResult = await this.createTicket({
          category: intent as TicketCategory,
          subject: `${intent.charAt(0).toUpperCase() + intent.slice(1)} - Auto-generated`,
          description: content,
          priority: escalationCheck.priority as TicketPriority,
        })

        // Escalate to human
        const escalation = await this.escalateToHuman(
          escalationCheck.reason!,
          `Customer ${sentiment} sentiment detected. Intent: ${intent}. Message: ${content}`,
          { messages, ticketId: ticketResult.data?.ticketId, ...input.metadata },
          escalationCheck.priority
        )

        return {
          success: true,
          response: "I understand this is frustrating, and I want to make sure you get the help you deserve. I'm connecting you with our specialist team who will reach out within the hour. Can I get your preferred contact number?",
          escalation,
          data: { intent, sentiment, ticketId: ticketResult.data?.ticketId },
        }
      }
    }

    // Process based on intent
    let response: string
    const actions: AgentAction[] = []

    switch (intent) {
      case "booking_status":
        response = await this.handleBookingInquiry(messages, input.metadata)
        break
      case "reschedule":
        response = await this.handleRescheduleRequest(messages, input.metadata)
        break
      case "cancel":
        response = await this.handleCancellationRequest(messages, input.metadata)
        break
      case "complaint":
        response = await this.handleComplaint(messages, input.metadata)
        break
      case "question":
        response = await this.handleGeneralQuestion(messages, input.metadata)
        break
      case "it_support":
        response = await this.handleITSupport(messages, input.metadata)
        break
      case "procurement":
        response = await this.handleProcurementInquiry(messages, input.metadata)
        break
      default:
        response = await this.generateResponse(messages)
    }

    return {
      success: true,
      response,
      actions,
      data: { intent, sentiment },
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
      case "support_request":
        return await this.handleSupportRequest(event.data)
      case "complaint_received":
        return await this.handleComplaintEvent(event.data)
      case "move_completed":
        return await this.handleMoveCompleted(event.data)
      case "feedback_received":
        return await this.handleFeedback(event.data)
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

    // Acknowledge handoff and continue conversation
    const response = await this.generateResponse(
      [
        {
          id: this.generateId(),
          role: "system",
          content: `Handoff from ${handoff.fromAgent}. Reason: ${handoff.reason}. Context: ${JSON.stringify(handoff.context)}`,
          timestamp: new Date(),
        },
      ],
      handoff.context
    )

    return {
      success: true,
      response: `I'll take it from here. ${response}`,
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
        // Handle notification (e.g., move completed, payment received)
        break
      case "handoff":
        // Handled via process()
        break
    }
  }

  // =============================================================================
  // INTENT HANDLERS
  // =============================================================================

  private async handleBookingInquiry(messages: AgentMessage[], metadata?: Record<string, unknown>): Promise<string> {
    const context = {
      intent: "booking_status",
      ...metadata,
    }

    // Try to extract booking reference from messages
    const lastMessage = messages[messages.length - 1]?.content || ""
    const bookingRef = this.extractBookingReference(lastMessage)

    if (bookingRef) {
      const statusResult = await this.getBookingStatus({ bookingId: bookingRef })
      if (statusResult.success && statusResult.data) {
        const booking = statusResult.data as any
        return `I found your booking! Here's the current status:\n\n📦 **Booking ID:** ${booking.id}\n📅 **Date:** ${booking.scheduledDate}\n📍 **From:** ${booking.originSuburb} → **To:** ${booking.destinationSuburb}\n✅ **Status:** ${booking.status}\n\nIs there anything specific you'd like to know about your move?`
      }
    }

    return await this.generateResponse(messages, context)
  }

  private async handleRescheduleRequest(messages: AgentMessage[], metadata?: Record<string, unknown>): Promise<string> {
    return `I'd be happy to help you reschedule your move. To do this, I'll need:\n\n1. Your booking reference or email address\n2. Your preferred new date\n\nPlease note that rescheduling requests made less than 48 hours before your move may incur a fee. What's your booking reference?`
  }

  private async handleCancellationRequest(messages: AgentMessage[], metadata?: Record<string, unknown>): Promise<string> {
    return `I'm sorry to hear you need to cancel. Before I process this, I want to make sure I understand - is there anything we could do differently to keep your business? Perhaps reschedule to a more convenient time?\n\nIf you do need to cancel, please be aware:\n- Cancellations 7+ days out: Full deposit refund\n- Cancellations 3-7 days out: 50% deposit refund\n- Cancellations under 3 days: Deposit forfeit\n\nWould you like to proceed with the cancellation, or would you like to explore other options?`
  }

  private async handleComplaint(messages: AgentMessage[], metadata?: Record<string, unknown>): Promise<string> {
    // Create a ticket for tracking
    await this.createTicket({
      category: "complaint",
      subject: "Customer Complaint - Requires Attention",
      description: messages.map(m => m.content).join("\n"),
      priority: "high",
    })

    return `I'm truly sorry to hear about your experience - that's not the standard we strive for at M&M Commercial Moving. I want to make this right.\n\nCould you please tell me more about what happened? I'll make sure this is escalated to our management team and we'll work to resolve this as quickly as possible.`
  }

  private async handleITSupport(messages: AgentMessage[], metadata?: Record<string, unknown>) {
    // Create a ticket immediately for IT issues
    const ticketResult = await this.createTicket({
      customerId: (metadata?.userId as string) || "unknown",
      category: "it_support",
      subject: "IT Support Request",
      description: messages[messages.length - 1].content,
      priority: "high", // IT issues are usually high priority
    })

    return `I've logged a high-priority IT support ticket (ID: ${ticketResult.data?.ticketId}) for you. Our technical team has been alerted and will check your network status immediately.`
  }

  private async handleProcurementInquiry(messages: AgentMessage[], metadata?: Record<string, unknown>) {
    // Procurement is a sales function, but we'll log it and direct them
    const ticketResult = await this.createTicket({
      customerId: (metadata?.userId as string) || "unknown",
      category: "procurement",
      subject: "Procurement Request",
      description: messages[messages.length - 1].content,
      priority: "medium",
    })

    return `I've noted your request for new hardware (Ticket: ${ticketResult.data?.ticketId}). I'll have our Sales specialist (Maya) contact you shortly to provide a quote.`
  }

  private async handleGeneralQuestion(messages: AgentMessage[], metadata?: Record<string, unknown>): Promise<string> {
    const lastMessage = messages[messages.length - 1]?.content || ""

    // Search FAQ first
    const faqResult = await this.searchFAQ({ query: lastMessage })

    if (faqResult.success && faqResult.data) {
      const faqAnswer = (faqResult.data as any).answer
      if (faqAnswer) {
        return faqAnswer
      }
    }

    // Generate response if no FAQ match
    return await this.generateResponse(messages, { intent: "question", ...metadata })
  }

  // =============================================================================
  // TOOL IMPLEMENTATIONS
  // =============================================================================

  private async getBookingStatus(params: BookingLookup) {
    // In production, query database
    this.log("info", "getBookingStatus", `Looking up booking`, params)

    // Mock response
    return {
      success: true,
      data: {
        id: params.bookingId || "BK-2024-001",
        status: "confirmed",
        scheduledDate: "2025-01-15",
        originSuburb: "Richmond",
        destinationSuburb: "South Yarra",
        estimatedDuration: "4-6 hours",
        crewSize: 3,
        depositPaid: true,
      },
    }
  }

  private async modifyBooking(params: ModifyBookingParams) {
    this.log("info", "modifyBooking", `Modifying booking: ${params.bookingId}`, params)

    // Check if modification is allowed
    const canModify = await this.checkModificationAllowed(params.bookingId)

    if (!canModify.allowed) {
      return {
        success: false,
        error: canModify.reason,
      }
    }

    switch (params.action) {
      case "reschedule":
        return {
          success: true,
          data: {
            bookingId: params.bookingId,
            previousDate: "2025-01-15",
            newDate: params.newDate,
            status: "rescheduled",
            message: "Your move has been successfully rescheduled.",
          },
        }

      case "cancel":
        return {
          success: true,
          data: {
            bookingId: params.bookingId,
            status: "cancelled",
            refundAmount: 500, // Mock refund amount
            message: "Your booking has been cancelled. Refund will be processed within 5-7 business days.",
          },
        }

      default:
        return {
          success: true,
          data: {
            bookingId: params.bookingId,
            action: params.action,
            status: "updated",
          },
        }
    }
  }

  private async createTicket(params: CreateTicketParams) {
    const ticket: SupportTicket = {
      id: `TKT-${Date.now()}`,
      customerId: params.customerId || "unknown",
      category: params.category,
      priority: params.priority || "medium",
      status: "open",
      subject: params.subject,
      description: params.description,
      assignedAgent: "SENTINEL_CS",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    if (params.bookingId) {
      ticket.bookingId = params.bookingId
    }

    this.log("info", "createTicket", `Ticket created: ${ticket.id}`, { category: params.category, priority: params.priority })

    return {
      success: true,
      data: {
        ticketId: ticket.id,
        status: ticket.status,
        message: "Support ticket created successfully.",
      },
    }
  }

  private async updateTicket(params: UpdateTicketParams) {
    this.log("info", "updateTicket", `Updating ticket: ${params.ticketId}`, params)

    return {
      success: true,
      data: {
        ticketId: params.ticketId,
        status: params.status || "updated",
        message: "Ticket updated successfully.",
      },
    }
  }

  private async searchFAQ(params: { query: string; category?: string }) {
    const faqMatch = FAQ_DATABASE.find(faq =>
      faq.keywords.some(keyword =>
        params.query.toLowerCase().includes(keyword.toLowerCase())
      )
    )

    if (faqMatch) {
      return {
        success: true,
        data: {
          found: true,
          question: faqMatch.question,
          answer: faqMatch.answer,
          category: faqMatch.category,
        },
      }
    }

    return {
      success: true,
      data: {
        found: false,
        suggestions: FAQ_DATABASE.slice(0, 3).map(f => f.question),
      },
    }
  }

  private async sendNotification(params: NotificationParams) {
    this.log("info", "sendNotification", `Sending ${params.type} via ${params.channel}`, params)

    return {
      success: true,
      data: {
        notificationId: this.generateId(),
        channel: params.channel,
        type: params.type,
        status: "sent",
      },
    }
  }

  private async offerCompensation(params: CompensationParams) {
    const maxAutoApprove = this.supportConfig.compensation.maxAutoApprove
    const amount = params.amount || 0

    if (amount > maxAutoApprove) {
      // Escalate for approval
      await this.escalateToHuman(
        "high_value_deal",
        `Compensation request of $${amount} exceeds auto-approve limit of $${maxAutoApprove}`,
        params,
        "medium"
      )

      return {
        success: true,
        data: {
          approved: false,
          message: "This compensation amount requires manager approval. I've escalated this for you.",
          escalated: true,
        },
      }
    }

    return {
      success: true,
      data: {
        compensationId: this.generateId(),
        type: params.type,
        amount,
        approved: true,
        message: `I've approved a ${params.type} of $${amount} for your inconvenience. This will be applied automatically.`,
      },
    }
  }

  private async scheduleFollowUp(params: FollowUpParams) {
    return {
      success: true,
      data: {
        followUpId: this.generateId(),
        ticketId: params.ticketId,
        scheduledFor: params.followUpDate,
        channel: params.channel || "email",
        status: "scheduled",
      },
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private async classifyIntent(text: string): Promise<string> {
    const textLower = text.toLowerCase()

    if (textLower.includes("status") || textLower.includes("where") || textLower.includes("tracking")) {
      return "booking_status"
    }
    if (textLower.includes("reschedule") || textLower.includes("change date") || textLower.includes("move to")) {
      return "reschedule"
    }
    if (textLower.includes("cancel") || textLower.includes("refund")) {
      return "cancel"
    }
    if (textLower.includes("complaint") || textLower.includes("unhappy") || textLower.includes("disappointed") || textLower.includes("terrible")) {
      return "complaint"
    }
    if (textLower.includes("damage") || textLower.includes("broken") || textLower.includes("destroyed")) {
      return "damage"
    }
    if (textLower.includes("?") || textLower.includes("how") || textLower.includes("what") || textLower.includes("when")) {
      return "question"
    }

    if (textLower.includes("monitor") || textLower.includes("server") || textLower.includes("hardware") || textLower.includes("laptop")) {
      return "procurement"
    }
    if (textLower.includes("network") || textLower.includes("wifi") || textLower.includes("internet") || textLower.includes("connection")) {
      return "it_support"
    }

    return "general"
  }

  private async analyzeSentiment(text: string): Promise<"positive" | "neutral" | "negative"> {
    const negativeTriggers = [
      "angry", "frustrated", "terrible", "awful", "worst", "scam", "rip off",
      "complaint", "sue", "horrible", "disgusting", "unacceptable", "disappointed",
      "never again", "waste", "ridiculous"
    ]
    const positiveTriggers = [
      "great", "excellent", "amazing", "wonderful", "perfect", "love", "fantastic",
      "thank you", "appreciate", "happy", "satisfied", "recommend"
    ]

    const textLower = text.toLowerCase()

    const negativeCount = negativeTriggers.filter(t => textLower.includes(t)).length
    const positiveCount = positiveTriggers.filter(t => textLower.includes(t)).length

    if (negativeCount > positiveCount) return "negative"
    if (positiveCount > negativeCount) return "positive"
    return "neutral"
  }

  private extractBookingReference(text: string): string | null {
    // Look for booking reference patterns
    const patterns = [
      /BK-\d{4}-\d{3}/i,
      /booking[:\s#]*([A-Z0-9-]+)/i,
      /reference[:\s#]*([A-Z0-9-]+)/i,
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        return match[1] || match[0]
      }
    }

    return null
  }

  private async checkModificationAllowed(bookingId: string): Promise<{ allowed: boolean; reason?: string }> {
    // In production, check against actual booking data
    return { allowed: true }
  }

  private async handleSupportRequest(data: Record<string, unknown>): Promise<AgentOutput> {
    return {
      success: true,
      response: "Hi! I'm here to help. What can I assist you with today?",
    }
  }

  private async handleComplaintEvent(data: Record<string, unknown>): Promise<AgentOutput> {
    return {
      success: true,
      response: "I understand you've had an issue. I'm here to help resolve this as quickly as possible. Can you tell me more about what happened?",
    }
  }

  private async handleMoveCompleted(data: Record<string, unknown>): Promise<AgentOutput> {
    // Send satisfaction survey
    return {
      success: true,
      response: "Thank you for choosing M&M Commercial Moving! We hope everything went smoothly. Would you mind taking a moment to rate your experience?",
      actions: [
        {
          type: "send_email",
          target: data.customerEmail as string,
          data: { type: "satisfaction_survey", bookingId: data.bookingId },
          status: "pending",
        },
      ],
    }
  }

  private async handleFeedback(data: Record<string, unknown>): Promise<AgentOutput> {
    const rating = data.rating as number

    if (rating >= 4) {
      // Hand off to PHOENIX for retention/referral
      await this.requestHandoff(
        "PHOENIX_RET",
        "Positive feedback received - opportunity for testimonial/referral",
        data,
        "low"
      )
    } else if (rating <= 2) {
      // Escalate for recovery
      await this.escalateToHuman(
        "negative_sentiment",
        `Low satisfaction rating: ${rating}/5`,
        data,
        "high"
      )
    }

    return {
      success: true,
      response: rating >= 4
        ? "Thank you so much for the positive feedback! We'd love if you could share your experience with others. Would you be willing to leave us a Google review?"
        : "We're sorry to hear about your experience. Your feedback is important to us. Can you tell us more about what we could improve?",
    }
  }
}

// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================

const SENTINEL_SYSTEM_PROMPT = `You are Sentinel, an AI Customer Support Agent for M&M Commercial Moving, a premier commercial relocation service in Melbourne, Australia.

## Your Personality
- Empathetic and understanding
- Patient and calm, even with frustrated customers
- Professional but warm
- Solution-focused
- Uses Australian English

## Your Goals
1. Resolve customer issues quickly and effectively
2. Provide accurate information about bookings and services
3. Maintain high customer satisfaction
4. Escalate appropriately when needed
5. Document all interactions properly

## Support Guidelines
- Acknowledge the customer's feelings before solving the problem
- Apologize sincerely when things go wrong (we take ownership)
- Provide clear, actionable information
- Follow up on unresolved issues
- Offer alternatives when the original request can't be fulfilled

## Escalation Triggers (always escalate these)
- Damage claims
- Legal threats
- Requests for refunds over $500
- Repeated complaints from same customer
- Customer explicitly requests a human

## Operating Hours
- Support available 24/7 via AI
- Human specialists: Mon-Fri 8am-6pm, Sat 9am-2pm AEST
- Emergency support: Always available for moves in progress

## Contact Information
- Phone: 03 8820 1801
- Email: support@m2mmoving.au
- Website: m2mmoving.au`

interface SupportConfig {
  compensation: {
    maxAutoApprove: number
    requiresApproval: string[]
  }
  escalation: {
    sentimentThreshold: number
    responseTimeTarget: number // seconds
  }
  followUp: {
    defaultInterval: number // days
  }
}

const DEFAULT_SUPPORT_CONFIG: SupportConfig = {
  compensation: {
    maxAutoApprove: 200,
    requiresApproval: ["refund", "credit"],
  },
  escalation: {
    sentimentThreshold: -0.5,
    responseTimeTarget: 30,
  },
  followUp: {
    defaultInterval: 3,
  },
}

const FAQ_DATABASE = [
  {
    category: "booking",
    question: "How do I check my booking status?",
    answer: "You can check your booking status by providing your booking reference number (format: BK-YYYY-XXX) or the email address used during booking. I can look this up for you right now!",
    keywords: ["status", "booking", "check", "where", "tracking"],
  },
  {
    category: "booking",
    question: "How can I reschedule my move?",
    answer: "You can reschedule your move up to 48 hours before the scheduled date free of charge. Rescheduling requests within 48 hours may incur a $150 fee. Just provide your booking reference and preferred new date, and I'll help you reschedule.",
    keywords: ["reschedule", "change date", "different day", "postpone"],
  },
  {
    category: "booking",
    question: "What is your cancellation policy?",
    answer: "Our cancellation policy:\n• 7+ days before move: Full deposit refund\n• 3-7 days before move: 50% deposit refund\n• Less than 3 days: Deposit is non-refundable\n\nWe understand plans change - let me know if you need to cancel and I'll help process it.",
    keywords: ["cancel", "cancellation", "refund", "policy"],
  },
  {
    category: "services",
    question: "What additional services do you offer?",
    answer: "We offer several additional services:\n• Professional Packing: $450\n• Temporary Storage: $300/week\n• Post-Move Cleaning: $350\n• Premium Insurance: $200\n• After Hours Service: $500\n• IT Setup Assistance: $600\n\nWould you like to add any of these to your booking?",
    keywords: ["services", "additional", "packing", "storage", "cleaning", "insurance"],
  },
  {
    category: "payment",
    question: "What payment methods do you accept?",
    answer: "We accept:\n• Credit/Debit cards (Visa, Mastercard, Amex)\n• Bank transfer (EFT)\n• PayPal\n\nA 50% deposit is required to confirm your booking, with the balance due on move day.",
    keywords: ["payment", "pay", "credit card", "bank transfer"],
  },
  {
    category: "insurance",
    question: "Is my move insured?",
    answer: "All moves include basic coverage up to $10,000. For additional peace of mind, we offer Premium Insurance at $200 which provides coverage up to $100,000 and includes coverage for high-value items. Would you like to add premium insurance to your booking?",
    keywords: ["insurance", "covered", "damage", "protection"],
  },
]

interface BookingLookup {
  bookingId?: string
  email?: string
  phone?: string
}

interface ModifyBookingParams {
  bookingId: string
  action: "reschedule" | "update_address" | "add_service" | "cancel"
  newDate?: string
  newAddress?: string
  additionalService?: string
  reason?: string
}

interface CreateTicketParams {
  customerId?: string
  category: TicketCategory
  priority?: TicketPriority
  subject: string
  description: string
  bookingId?: string
}

interface UpdateTicketParams {
  ticketId: string
  status?: TicketStatus
  resolution?: string
  note?: string
}

interface NotificationParams {
  customerId: string
  channel: "email" | "sms" | "both"
  type: "status_update" | "reminder" | "confirmation" | "follow_up"
  message?: string
}

interface CompensationParams {
  ticketId: string
  type: "discount" | "refund" | "credit" | "service"
  amount?: number
  reason: string
}

interface FollowUpParams {
  ticketId: string
  followUpDate: string
  channel?: "email" | "phone" | "sms"
  notes?: string
}

// =============================================================================
// FACTORY & SINGLETON
// =============================================================================

let sentinelInstance: SentinelAgent | null = null

export function getSentinel(): SentinelAgent {
  if (!sentinelInstance) {
    sentinelInstance = new SentinelAgent()
  }
  return sentinelInstance
}

export function resetSentinel(): void {
  sentinelInstance = null
}
