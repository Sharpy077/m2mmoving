/**
 * BRIDGE - Human Handoff Coordinator Agent
 * Manages escalations, schedules callbacks, and bridges AI-human interactions
 */

import { BaseAgent, type AgentInput, type AgentOutput } from "../base-agent"
import type { AgentIdentity, AgentConfig, InterAgentMessage } from "../types"
import * as db from "./db"

// =============================================================================
// BRIDGE AGENT
// =============================================================================

export class BridgeAgent extends BaseAgent {
  constructor(config?: Partial<AgentConfig>) {
    super({
      codename: "BRIDGE_HH",
      enabled: true,
      model: "anthropic/claude-sonnet-4-20250514",
      temperature: 0.5,
      maxTokens: 1500,
      systemPrompt: BRIDGE_SYSTEM_PROMPT,
      tools: [
        "createEscalation",
        "scheduleCallback",
        "assignToHuman",
        "getAvailableAgents",
        "prepareHandoffContext",
        "notifyHuman",
        "resolveEscalation",
        "trackResolution",
      ],
      triggers: [
        { event: "escalation_requested", action: "process_escalation", priority: 1 },
        { event: "callback_requested", action: "schedule_callback", priority: 1 },
        { event: "human_available", action: "assign_queue", priority: 2 },
      ],
      escalationRules: [{ condition: "urgent_priority", reason: "compliance_issue", priority: "urgent" }],
      rateLimits: { requestsPerMinute: 40, tokensPerDay: 150000 },
      ...config,
    })
  }

  protected getIdentity(): AgentIdentity {
    return {
      codename: "BRIDGE_HH",
      name: "Bridge",
      description: "AI Human Handoff Agent - Manages escalations and AI-human coordination",
      version: "1.0.0",
      capabilities: [
        "Escalation Management",
        "Callback Scheduling",
        "Human Assignment",
        "Context Preparation",
        "Resolution Tracking",
        "Priority Routing",
        "Skills Matching",
        "SLA Monitoring",
      ],
      status: "idle",
    }
  }

  protected registerTools(): void {
    this.registerTool({
      name: "createEscalation",
      description: "Create an escalation ticket",
      parameters: {
        type: "object",
        properties: {
          fromAgent: { type: "string", description: "Originating agent" },
          reason: { type: "string", description: "Escalation reason" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Priority" },
          customerEmail: { type: "string", description: "Customer email" },
          customerName: { type: "string", description: "Customer name" },
          customerPhone: { type: "string", description: "Customer phone" },
          conversationId: { type: "string", description: "Conversation ID" },
          conversationSummary: { type: "string", description: "Conversation summary" },
          context: { type: "object", description: "Context data" },
        },
        required: ["fromAgent", "reason", "priority"],
      },
      handler: async (params) => this.handleCreateEscalation(params as EscalationParams),
    })

    this.registerTool({
      name: "scheduleCallback",
      description: "Schedule a callback for a customer",
      parameters: {
        type: "object",
        properties: {
          customerEmail: { type: "string", description: "Customer email" },
          customerName: { type: "string", description: "Customer name" },
          phone: { type: "string", description: "Phone number" },
          preferredTime: { type: "string", description: "Preferred callback time" },
          reason: { type: "string", description: "Callback reason" },
          priority: { type: "string", description: "Priority level" },
        },
        required: ["phone", "reason"],
      },
      handler: async (params) => this.handleScheduleCallback(params as CallbackParams),
    })

    this.registerTool({
      name: "assignToHuman",
      description: "Assign escalation to a human agent",
      parameters: {
        type: "object",
        properties: {
          escalationId: { type: "string", description: "Escalation ID" },
          humanId: { type: "string", description: "Human agent ID" },
          notes: { type: "string", description: "Assignment notes" },
        },
        required: ["escalationId"],
      },
      handler: async (params) => this.handleAssignToHuman(params as AssignParams),
    })

    this.registerTool({
      name: "getAvailableAgents",
      description: "Get available human agents",
      parameters: {
        type: "object",
        properties: {
          skill: { type: "string", description: "Required skill" },
          priority: { type: "string", description: "Priority level" },
        },
        required: [],
      },
      handler: async (params) => this.handleGetAvailableAgents(params as AvailableParams),
    })

    this.registerTool({
      name: "prepareHandoffContext",
      description: "Prepare context for human handoff",
      parameters: {
        type: "object",
        properties: {
          escalationId: { type: "string", description: "Escalation ID" },
          includeHistory: { type: "boolean", description: "Include conversation history" },
          includeSummary: { type: "boolean", description: "Generate AI summary" },
        },
        required: ["escalationId"],
      },
      handler: async (params) => this.handlePrepareContext(params as ContextParams),
    })

    this.registerTool({
      name: "notifyHuman",
      description: "Send notification to human agent",
      parameters: {
        type: "object",
        properties: {
          humanId: { type: "string", description: "Human agent ID" },
          message: { type: "string", description: "Notification message" },
          channel: { type: "string", enum: ["slack", "sms", "email", "push"], description: "Notification channel" },
          urgency: { type: "string", enum: ["normal", "urgent"], description: "Urgency" },
          escalationId: { type: "string", description: "Related escalation" },
        },
        required: ["humanId", "message"],
      },
      handler: async (params) => this.handleNotifyHuman(params as NotifyParams),
    })

    this.registerTool({
      name: "resolveEscalation",
      description: "Mark escalation as resolved",
      parameters: {
        type: "object",
        properties: {
          escalationId: { type: "string", description: "Escalation ID" },
          resolution: { type: "string", description: "Resolution notes" },
          outcome: { type: "string", enum: ["resolved", "deferred", "cancelled"], description: "Outcome" },
        },
        required: ["escalationId", "outcome"],
      },
      handler: async (params) => this.handleResolveEscalation(params as ResolveParams),
    })

    this.registerTool({
      name: "trackResolution",
      description: "Track resolution metrics",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", description: "Tracking period" },
        },
        required: [],
      },
      handler: async (params) => this.handleTrackResolution(params as TrackParams),
    })
  }

  public async process(input: AgentInput): Promise<AgentOutput> {
    this.log("info", "process", `Processing: ${input.type}`)

    try {
      switch (input.type) {
        case "message":
          return await this.handleMessage(input)
        case "event":
          return await this.handleEvent(input)
        case "escalation":
          return await this.handleEscalationInput(input)
        case "scheduled":
          return await this.handleScheduledTask(input)
        default:
          return { success: false, error: "Unknown input type" }
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Processing failed" }
    }
  }

  private async handleMessage(input: AgentInput): Promise<AgentOutput> {
    const response = await this.generateResponse(input.messages || [])
    return { success: true, response }
  }

  private async handleEvent(input: AgentInput): Promise<AgentOutput> {
    const event = input.event
    if (!event) return { success: false, error: "No event" }

    switch (event.name) {
      case "escalation_requested":
        return await this.processEscalationRequest(event.data)
      case "callback_requested":
        return await this.processCallbackRequest(event.data)
      case "human_available":
        return await this.processHumanAvailable(event.data)
      case "sla_check":
        return await this.processSLACheck()
      default:
        return { success: false, error: `Unknown event: ${event.name}` }
    }
  }

  private async handleEscalationInput(input: AgentInput): Promise<AgentOutput> {
    const escalation = input.metadata as EscalationParams
    return await this.processEscalationRequest(escalation)
  }

  private async handleScheduledTask(input: AgentInput): Promise<AgentOutput> {
    const taskType = input.metadata?.taskType as string

    switch (taskType) {
      case "sla_check":
        return await this.processSLACheck()
      case "pending_callbacks":
        return await this.processPendingCallbacks()
      default:
        return { success: false, error: `Unknown task: ${taskType}` }
    }
  }

  public async handleInterAgentMessage(message: InterAgentMessage): Promise<void> {
    if (message.type === "escalation") {
      await this.processEscalationRequest({
        fromAgent: message.from,
        reason: message.payload.reason,
        priority: message.payload.priority,
        context: message.payload.context,
      })
    }
  }

  // =============================================================================
  // ESCALATION WORKFLOWS - Using Database
  // =============================================================================

  private async processEscalationRequest(data: Record<string, unknown>): Promise<AgentOutput> {
    const escalation = await db.createEscalation({
      from_agent: data.fromAgent as string,
      reason: data.reason as string,
      priority: (data.priority as string) || "medium",
      customer_email: data.customerEmail as string,
      customer_name: data.customerName as string,
      customer_phone: data.customerPhone as string,
      conversation_id: data.conversationId as string,
      conversation_summary: data.conversationSummary as string,
      context: data.context as Record<string, unknown>,
    })

    if (!escalation) {
      return { success: false, error: "Failed to create escalation" }
    }

    // Find and assign appropriate human
    const skill = this.getRequiredSkill(data.reason as string)
    const available = await db.getAvailableAgents({ skill, priority: data.priority as string })

    if (available.length > 0) {
      const assignee = available[0]
      await db.assignEscalation(escalation.id, assignee.id)

      // Notify the human
      await db.createNotification({
        agent_id: assignee.id,
        type: "new_escalation",
        channel: data.priority === "urgent" ? "sms" : "slack",
        urgency: data.priority === "urgent" ? "urgent" : "normal",
        title: `New ${data.priority} escalation`,
        message: `Escalation from ${data.fromAgent}: ${data.reason}`,
        related_escalation_id: escalation.id,
      })

      this.log("info", "processEscalationRequest", `Assigned ${escalation.ticket_number} to ${assignee.name}`)
    } else {
      this.log("warn", "processEscalationRequest", `No agents available for escalation ${escalation.ticket_number}`)
    }

    return {
      success: true,
      response: "Escalation created and assigned",
      data: {
        escalationId: escalation.id,
        ticketNumber: escalation.ticket_number,
        status: escalation.status,
      },
    }
  }

  private async processCallbackRequest(data: Record<string, unknown>): Promise<AgentOutput> {
    const callback = await db.scheduleCallback({
      customer_email: data.customerEmail as string,
      customer_name: data.customerName as string,
      phone: data.phone as string,
      preferred_time: data.preferredTime as string,
      reason: data.reason as string,
      priority: data.priority as string,
    })

    if (!callback) {
      return { success: false, error: "Failed to schedule callback" }
    }

    return {
      success: true,
      response: "Callback scheduled",
      data: {
        callbackId: callback.id,
        ticketNumber: callback.ticket_number,
        scheduledFor: callback.scheduled_for,
      },
    }
  }

  private async processHumanAvailable(data: Record<string, unknown>): Promise<AgentOutput> {
    const humanId = data.humanId as string

    await db.updateAgentStatus(humanId, "available")

    // Check for pending escalations
    const pending = await db.getPendingEscalations()
    const unassigned = pending.filter((e) => !e.assigned_to)

    if (unassigned.length > 0) {
      // Sort by priority and assign first
      const sorted = unassigned.sort((a, b) => this.priorityWeight(b.priority) - this.priorityWeight(a.priority))
      await db.assignEscalation(sorted[0].id, humanId)

      return {
        success: true,
        response: `Assigned pending escalation ${sorted[0].ticket_number}`,
      }
    }

    return { success: true, response: "Human availability updated" }
  }

  private async processSLACheck(): Promise<AgentOutput> {
    const pending = await db.getPendingEscalations()
    let breaches = 0

    for (const escalation of pending) {
      const breached = await db.checkSLABreach(escalation.id)
      if (breached) {
        breaches++
        // Auto-escalate if SLA breached
        this.log("warn", "processSLACheck", `SLA breached for ${escalation.ticket_number}`)
      }
    }

    return {
      success: true,
      response: `SLA check completed. ${breaches} breaches detected.`,
    }
  }

  private async processPendingCallbacks(): Promise<AgentOutput> {
    const pending = await db.getPendingCallbacks()

    return {
      success: true,
      response: `${pending.length} callbacks pending`,
      data: { pending: pending.length },
    }
  }

  // =============================================================================
  // TOOL IMPLEMENTATIONS - Using Database
  // =============================================================================

  private async handleCreateEscalation(params: EscalationParams) {
    const escalation = await db.createEscalation({
      from_agent: params.fromAgent,
      reason: params.reason,
      priority: params.priority,
      customer_email: params.customerEmail,
      customer_name: params.customerName,
      customer_phone: params.customerPhone,
      conversation_id: params.conversationId,
      conversation_summary: params.conversationSummary,
      context: params.context,
    })

    if (!escalation) {
      return { success: false, error: "Failed to create escalation" }
    }

    this.log("info", "handleCreateEscalation", `Created ${params.priority} escalation from ${params.fromAgent}`)

    return {
      success: true,
      data: {
        id: escalation.id,
        ticketNumber: escalation.ticket_number,
        status: escalation.status,
      },
    }
  }

  private async handleScheduleCallback(params: CallbackParams) {
    const callback = await db.scheduleCallback({
      customer_email: params.customerEmail,
      customer_name: params.customerName,
      phone: params.phone,
      preferred_time: params.preferredTime,
      reason: params.reason,
      priority: params.priority,
    })

    if (!callback) {
      return { success: false, error: "Failed to schedule callback" }
    }

    this.log("info", "handleScheduleCallback", `Scheduled callback for ${params.phone}`)

    return {
      success: true,
      data: {
        id: callback.id,
        ticketNumber: callback.ticket_number,
        scheduledFor: callback.scheduled_for,
        status: callback.status,
      },
    }
  }

  private async handleAssignToHuman(params: AssignParams) {
    const escalation = await db.getEscalationById(params.escalationId)
    if (!escalation) {
      return { success: false, error: "Escalation not found" }
    }

    // Auto-select if no human specified
    let humanId = params.humanId
    if (!humanId) {
      const skill = this.getRequiredSkill(escalation.reason)
      const available = await db.getAvailableAgents({ skill, priority: escalation.priority })
      if (available.length === 0) {
        return { success: false, error: "No human agent available" }
      }
      humanId = available[0].id
    }

    const updated = await db.assignEscalation(params.escalationId, humanId, params.notes)
    if (!updated) {
      return { success: false, error: "Failed to assign escalation" }
    }

    const agent = await db.getAgentById(humanId)

    this.log("info", "handleAssignToHuman", `Assigned ${params.escalationId} to ${agent?.name}`)

    return {
      success: true,
      data: {
        escalationId: params.escalationId,
        assignedTo: { id: humanId, name: agent?.name, role: agent?.role },
      },
    }
  }

  private async handleGetAvailableAgents(params: AvailableParams) {
    const agents = await db.getAvailableAgents(params)

    return {
      success: true,
      data: {
        agents: agents.map((a) => ({
          id: a.id,
          name: a.name,
          role: a.role,
          skills: a.skills,
          currentLoad: a.current_load,
        })),
        total: agents.length,
      },
    }
  }

  private async handlePrepareContext(params: ContextParams) {
    const escalation = await db.getEscalationById(params.escalationId)
    if (!escalation) {
      return { success: false, error: "Escalation not found" }
    }

    const context: Record<string, unknown> = {
      escalationId: escalation.id,
      ticketNumber: escalation.ticket_number,
      originalAgent: escalation.from_agent,
      reason: escalation.reason,
      priority: escalation.priority,
      customer: {
        email: escalation.customer_email,
        name: escalation.customer_name,
        phone: escalation.customer_phone,
      },
      createdAt: escalation.created_at,
    }

    if (params.includeHistory !== false && escalation.context) {
      context.conversationHistory = escalation.context
    }

    if (params.includeSummary !== false) {
      context.summary = escalation.conversation_summary || this.generateSummary(escalation)
    }

    return { success: true, data: context }
  }

  private async handleNotifyHuman(params: NotifyParams) {
    const agent = await db.getAgentById(params.humanId)
    if (!agent) {
      return { success: false, error: "Human agent not found" }
    }

    const notification = await db.createNotification({
      agent_id: params.humanId,
      type: "escalation_update",
      channel: params.channel || "slack",
      urgency: params.urgency || "normal",
      title: params.urgency === "urgent" ? "URGENT" : "Notification",
      message: params.message,
      related_escalation_id: params.escalationId,
    })

    if (notification) {
      await db.markNotificationSent(notification.id)
    }

    this.log("info", "handleNotifyHuman", `Notified ${agent.name} via ${params.channel}`)

    return {
      success: true,
      data: {
        notificationId: notification?.id,
        to: agent.name,
        channel: params.channel || "slack",
        status: "sent",
      },
    }
  }

  private async handleResolveEscalation(params: ResolveParams) {
    const escalation = await db.resolveEscalation(params.escalationId, params.resolution || "", params.outcome)

    if (!escalation) {
      return { success: false, error: "Failed to resolve escalation" }
    }

    this.log("info", "handleResolveEscalation", `Resolved ${escalation.ticket_number}: ${params.outcome}`)

    return {
      success: true,
      data: {
        id: escalation.id,
        ticketNumber: escalation.ticket_number,
        outcome: params.outcome,
        resolution: params.resolution,
        timeToResolve: escalation.time_to_resolve_ms
          ? `${Math.round(escalation.time_to_resolve_ms / 60000)} minutes`
          : null,
      },
    }
  }

  private async handleTrackResolution(params: TrackParams) {
    const stats = await db.getEscalationStats()

    return {
      success: true,
      data: {
        period: params.period || "all",
        ...stats,
        avgTimeToAssign: `${stats.avgTimeToAssign} minutes`,
        avgTimeToResolve: `${stats.avgTimeToResolve} minutes`,
      },
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private getRequiredSkill(reason: string): string {
    const skillMap: Record<string, string> = {
      negative_sentiment: "support",
      high_value_deal: "sales",
      compliance_issue: "operations",
      complex_quote: "sales",
      technical_issue: "operations",
      customer_complaint: "support",
      pricing_dispute: "sales",
    }
    return skillMap[reason] || "support"
  }

  private priorityWeight(priority: string): number {
    const weights: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 }
    return weights[priority] || 0
  }

  private generateSummary(escalation: db.Escalation): string {
    return (
      `Escalation from ${escalation.from_agent} regarding "${escalation.reason}". ` +
      `Priority: ${escalation.priority}. ` +
      `Customer: ${escalation.customer_name || escalation.customer_email || "Unknown"}. ` +
      `Created: ${new Date(escalation.created_at).toLocaleString()}.`
    )
  }

  public async getEscalationStats(): Promise<Awaited<ReturnType<typeof db.getEscalationStats>>> {
    return db.getEscalationStats()
  }
}

// =============================================================================
// TYPES
// =============================================================================

const BRIDGE_SYSTEM_PROMPT = `You are Bridge, an AI Human Handoff Agent for M&M Commercial Moving.

## Your Role
- Manage escalations from AI to humans
- Schedule customer callbacks
- Match escalations to appropriate human agents based on skills
- Track SLAs and resolution times
- Prepare context for smooth handoffs

## Priority Levels
- URGENT: 15 min first response, 60 min resolution
- HIGH: 30 min first response, 2 hour resolution  
- MEDIUM: 1 hour first response, 4 hour resolution
- LOW: 2 hour first response, 8 hour resolution

## Skills Matching
- Sales issues → sales, negotiation skills
- Support issues → support, complaints skills
- Operations issues → operations, scheduling skills
- Complex escalations → manager level`

interface EscalationParams {
  fromAgent: string
  reason: string
  priority: string
  customerEmail?: string
  customerName?: string
  customerPhone?: string
  conversationId?: string
  conversationSummary?: string
  context?: Record<string, unknown>
}

interface CallbackParams {
  customerEmail?: string
  customerName?: string
  phone: string
  preferredTime?: string
  reason: string
  priority?: string
}

interface AssignParams {
  escalationId: string
  humanId?: string
  notes?: string
}

interface AvailableParams {
  skill?: string
  priority?: string
}

interface ContextParams {
  escalationId: string
  includeHistory?: boolean
  includeSummary?: boolean
}

interface NotifyParams {
  humanId: string
  message: string
  channel?: string
  urgency?: string
  escalationId?: string
}

interface ResolveParams {
  escalationId: string
  resolution?: string
  outcome: string
}

interface TrackParams {
  period?: string
}

// =============================================================================
// FACTORY
// =============================================================================

let bridgeInstance: BridgeAgent | null = null

export function getBridge(): BridgeAgent {
  if (!bridgeInstance) bridgeInstance = new BridgeAgent()
  return bridgeInstance
}

export function resetBridge(): void {
  bridgeInstance = null
}
