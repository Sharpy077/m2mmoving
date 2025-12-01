/**
 * BRIDGE - Human Handoff Coordinator Agent
 * Manages escalations, schedules callbacks, and bridges AI-human interactions
 */

import { BaseAgent, type AgentInput, type AgentOutput } from "../base-agent"
import type { AgentIdentity, AgentConfig, InterAgentMessage, EscalationTicket } from "../types"

// =============================================================================
// BRIDGE AGENT
// =============================================================================

export class BridgeAgent extends BaseAgent {
  private escalationQueue: EscalationItem[] = []
  private callbackQueue: CallbackItem[] = []
  private humanAgents: HumanAgent[] = []
  
  constructor(config?: Partial<AgentConfig>) {
    super({
      codename: "BRIDGE_HH",
      enabled: true,
      model: "gpt-4o",
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
      escalationRules: [
        { condition: "urgent_priority", reason: "compliance_issue", priority: "urgent" },
      ],
      rateLimits: { requestsPerMinute: 40, tokensPerDay: 150000 },
      ...config,
    })
    
    this.initializeHumanAgents()
  }
  
  private initializeHumanAgents() {
    this.humanAgents = [
      { id: "h1", name: "Sarah K.", role: "sales_lead", status: "available", skills: ["sales", "negotiation"] },
      { id: "h2", name: "Mike T.", role: "operations_lead", status: "available", skills: ["operations", "scheduling"] },
      { id: "h3", name: "Emma R.", role: "support_lead", status: "busy", skills: ["support", "complaints"] },
      { id: "h4", name: "James L.", role: "manager", status: "available", skills: ["sales", "support", "operations"] },
    ]
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
          context: { type: "object", description: "Context data" },
        },
        required: ["fromAgent", "reason", "priority"],
      },
      handler: async (params) => this.createEscalation(params as EscalationParams),
    })
    
    this.registerTool({
      name: "scheduleCallback",
      description: "Schedule a callback for a customer",
      parameters: {
        type: "object",
        properties: {
          customerId: { type: "string", description: "Customer ID" },
          phone: { type: "string", description: "Phone number" },
          preferredTime: { type: "string", description: "Preferred callback time" },
          reason: { type: "string", description: "Callback reason" },
          assignTo: { type: "string", description: "Specific human to assign" },
        },
        required: ["customerId", "phone", "reason"],
      },
      handler: async (params) => this.scheduleCallback(params as CallbackParams),
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
      handler: async (params) => this.assignToHuman(params as AssignParams),
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
      handler: async (params) => this.getAvailableAgents(params as AvailableParams),
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
      handler: async (params) => this.prepareHandoffContext(params as ContextParams),
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
        },
        required: ["humanId", "message"],
      },
      handler: async (params) => this.notifyHuman(params as NotifyParams),
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
      handler: async (params) => this.resolveEscalation(params as ResolveParams),
    })
    
    this.registerTool({
      name: "trackResolution",
      description: "Track resolution metrics",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", description: "Tracking period" },
          byAgent: { type: "boolean", description: "Group by agent" },
        },
        required: [],
      },
      handler: async (params) => this.trackResolution(params as TrackParams),
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
          return await this.handleEscalation(input)
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
      default:
        return { success: false, error: `Unknown event: ${event.name}` }
    }
  }
  
  private async handleEscalation(input: AgentInput): Promise<AgentOutput> {
    // Handle direct escalation input from other agents
    const escalation = input.metadata as EscalationParams
    return await this.processEscalationRequest(escalation)
  }
  
  public async handleInterAgentMessage(message: InterAgentMessage): Promise<void> {
    // Process inter-agent escalation requests
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
  // ESCALATION WORKFLOWS
  // =============================================================================
  
  private async processEscalationRequest(data: Record<string, unknown>): Promise<AgentOutput> {
    const escalation = await this.createEscalation({
      fromAgent: data.fromAgent as string,
      reason: data.reason as string,
      priority: data.priority as string || "medium",
      context: data.context as Record<string, unknown>,
    })
    
    // Find and assign appropriate human
    const skill = this.getRequiredSkill(data.reason as string)
    const available = await this.getAvailableAgents({ skill, priority: data.priority as string })
    
    if ((available.data as any)?.agents?.length > 0) {
      const assignee = (available.data as any).agents[0]
      await this.assignToHuman({
        escalationId: (escalation.data as any).id,
        humanId: assignee.id,
      })
      
      await this.notifyHuman({
        humanId: assignee.id,
        message: `New ${data.priority} escalation: ${data.reason}`,
        channel: data.priority === "urgent" ? "sms" : "slack",
        urgency: data.priority === "urgent" ? "urgent" : "normal",
      })
    }
    
    return {
      success: true,
      response: "Escalation created and assigned",
      data: escalation.data,
    }
  }
  
  private async processCallbackRequest(data: Record<string, unknown>): Promise<AgentOutput> {
    return await this.scheduleCallback({
      customerId: data.customerId as string,
      phone: data.phone as string,
      preferredTime: data.preferredTime as string,
      reason: data.reason as string,
    })
  }
  
  private async processHumanAvailable(data: Record<string, unknown>): Promise<AgentOutput> {
    const humanId = data.humanId as string
    
    // Update agent status
    const agent = this.humanAgents.find(a => a.id === humanId)
    if (agent) {
      agent.status = "available"
    }
    
    // Check if there are pending escalations to assign
    const pending = this.escalationQueue.filter(e => !e.assignedTo && e.status === "pending")
    
    if (pending.length > 0) {
      // Sort by priority and assign first
      const sorted = pending.sort((a, b) => this.priorityWeight(b.priority) - this.priorityWeight(a.priority))
      await this.assignToHuman({
        escalationId: sorted[0].id,
        humanId,
      })
    }
    
    return { success: true, response: "Human availability processed" }
  }
  
  // =============================================================================
  // TOOL IMPLEMENTATIONS
  // =============================================================================
  
  private async createEscalation(params: EscalationParams) {
    const item: EscalationItem = {
      id: `ESC-${Date.now()}`,
      fromAgent: params.fromAgent,
      reason: params.reason,
      priority: params.priority,
      context: params.context || {},
      status: "pending",
      createdAt: new Date(),
    }
    
    this.escalationQueue.push(item)
    this.log("info", "createEscalation", `Created ${params.priority} escalation from ${params.fromAgent}`)
    
    return { success: true, data: item }
  }
  
  private async scheduleCallback(params: CallbackParams) {
    const callback: CallbackItem = {
      id: `CB-${Date.now()}`,
      customerId: params.customerId,
      phone: params.phone,
      preferredTime: params.preferredTime || "next_available",
      reason: params.reason,
      status: "scheduled",
      createdAt: new Date(),
    }
    
    this.callbackQueue.push(callback)
    this.log("info", "scheduleCallback", `Scheduled callback for ${params.customerId}`)
    
    return {
      success: true,
      data: {
        ...callback,
        estimatedCallTime: this.estimateCallTime(params.preferredTime),
      },
    }
  }
  
  private async assignToHuman(params: AssignParams) {
    const escalation = this.escalationQueue.find(e => e.id === params.escalationId)
    if (!escalation) {
      return { success: false, error: "Escalation not found" }
    }
    
    // Auto-select if no human specified
    const humanId = params.humanId || await this.autoSelectHuman(escalation)
    const human = this.humanAgents.find(a => a.id === humanId)
    
    if (!human) {
      return { success: false, error: "No human agent available" }
    }
    
    escalation.assignedTo = humanId
    escalation.status = "assigned"
    escalation.assignedAt = new Date()
    human.status = "busy"
    
    this.log("info", "assignToHuman", `Assigned ${params.escalationId} to ${human.name}`)
    
    return {
      success: true,
      data: {
        escalationId: params.escalationId,
        assignedTo: { id: human.id, name: human.name, role: human.role },
      },
    }
  }
  
  private async getAvailableAgents(params: AvailableParams) {
    let available = this.humanAgents.filter(a => a.status === "available")
    
    if (params.skill) {
      available = available.filter(a => a.skills.includes(params.skill!))
    }
    
    // For urgent, include managers
    if (params.priority === "urgent") {
      available = available.concat(this.humanAgents.filter(a => a.role === "manager" && a.status === "busy"))
    }
    
    return {
      success: true,
      data: {
        agents: available.map(a => ({ id: a.id, name: a.name, role: a.role, skills: a.skills })),
        total: available.length,
      },
    }
  }
  
  private async prepareHandoffContext(params: ContextParams) {
    const escalation = this.escalationQueue.find(e => e.id === params.escalationId)
    if (!escalation) {
      return { success: false, error: "Escalation not found" }
    }
    
    const context: any = {
      escalationId: escalation.id,
      originalAgent: escalation.fromAgent,
      reason: escalation.reason,
      priority: escalation.priority,
      createdAt: escalation.createdAt,
    }
    
    if (params.includeHistory !== false) {
      context.conversationHistory = escalation.context.conversationHistory || []
    }
    
    if (params.includeSummary !== false) {
      context.summary = this.generateSummary(escalation)
    }
    
    return { success: true, data: context }
  }
  
  private async notifyHuman(params: NotifyParams) {
    const human = this.humanAgents.find(a => a.id === params.humanId)
    if (!human) {
      return { success: false, error: "Human agent not found" }
    }
    
    const notification = {
      to: human.name,
      channel: params.channel || "slack",
      message: params.message,
      urgency: params.urgency || "normal",
      sentAt: new Date(),
    }
    
    this.log("info", "notifyHuman", `Notified ${human.name} via ${params.channel}`)
    
    return { success: true, data: notification }
  }
  
  private async resolveEscalation(params: ResolveParams) {
    const escalation = this.escalationQueue.find(e => e.id === params.escalationId)
    if (!escalation) {
      return { success: false, error: "Escalation not found" }
    }
    
    escalation.status = params.outcome
    escalation.resolvedAt = new Date()
    escalation.resolution = params.resolution
    
    // Free up human agent
    if (escalation.assignedTo) {
      const human = this.humanAgents.find(a => a.id === escalation.assignedTo)
      if (human) human.status = "available"
    }
    
    this.log("info", "resolveEscalation", `Resolved ${params.escalationId}: ${params.outcome}`)
    
    return {
      success: true,
      data: {
        id: escalation.id,
        outcome: params.outcome,
        resolution: params.resolution,
        timeToResolve: escalation.resolvedAt.getTime() - escalation.createdAt.getTime(),
      },
    }
  }
  
  private async trackResolution(params: TrackParams) {
    const resolved = this.escalationQueue.filter(e => e.status === "resolved")
    
    const avgTimeMs = resolved.length > 0
      ? resolved.reduce((sum, e) => sum + (e.resolvedAt?.getTime() || 0) - e.createdAt.getTime(), 0) / resolved.length
      : 0
    
    return {
      success: true,
      data: {
        period: params.period || "all",
        totalEscalations: this.escalationQueue.length,
        resolved: resolved.length,
        pending: this.escalationQueue.filter(e => e.status === "pending").length,
        avgResolutionTime: `${Math.round(avgTimeMs / 60000)} minutes`,
        byPriority: {
          urgent: this.escalationQueue.filter(e => e.priority === "urgent").length,
          high: this.escalationQueue.filter(e => e.priority === "high").length,
          medium: this.escalationQueue.filter(e => e.priority === "medium").length,
          low: this.escalationQueue.filter(e => e.priority === "low").length,
        },
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
    }
    return skillMap[reason] || "support"
  }
  
  private priorityWeight(priority: string): number {
    const weights: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 }
    return weights[priority] || 0
  }
  
  private async autoSelectHuman(escalation: EscalationItem): Promise<string> {
    const skill = this.getRequiredSkill(escalation.reason)
    const available = this.humanAgents
      .filter(a => a.status === "available" && a.skills.includes(skill))
    
    return available.length > 0 ? available[0].id : this.humanAgents.find(a => a.role === "manager")?.id || ""
  }
  
  private estimateCallTime(preferredTime?: string): string {
    if (preferredTime && preferredTime !== "next_available") {
      return preferredTime
    }
    
    const now = new Date()
    now.setMinutes(now.getMinutes() + 30) // Within 30 minutes
    return now.toISOString()
  }
  
  private generateSummary(escalation: EscalationItem): string {
    return `Escalation from ${escalation.fromAgent} regarding "${escalation.reason}". Priority: ${escalation.priority}. Created: ${escalation.createdAt.toLocaleString()}.`
  }
}

// =============================================================================
// TYPES & CONFIG
// =============================================================================

const BRIDGE_SYSTEM_PROMPT = `You are Bridge, an AI Human Handoff Agent for M&M Commercial Moving.

## Your Role
- Manage escalations from AI to humans
- Schedule customer callbacks
- Match escalations to appropriate human agents
- Prepare context for smooth handoffs
- Track resolution metrics

## Escalation Priority
- URGENT: Security, compliance, angry VIP customers
- HIGH: Negative sentiment, complex deals, complaints
- MEDIUM: Standard questions AI can't handle
- LOW: Requests for human preference

## Key Principles
- Speed matters - urgent items get immediate attention
- Context is king - provide complete handoff packages
- Track everything for improvement
- Never leave customers waiting`

interface EscalationItem {
  id: string
  fromAgent: string
  reason: string
  priority: string
  context: Record<string, unknown>
  status: string
  createdAt: Date
  assignedTo?: string
  assignedAt?: Date
  resolvedAt?: Date
  resolution?: string
}

interface CallbackItem {
  id: string
  customerId: string
  phone: string
  preferredTime: string
  reason: string
  status: string
  createdAt: Date
  completedAt?: Date
}

interface HumanAgent {
  id: string
  name: string
  role: string
  status: string
  skills: string[]
}

interface EscalationParams { fromAgent: string; reason: string; priority: string; context?: Record<string, unknown> }
interface CallbackParams { customerId: string; phone: string; preferredTime?: string; reason: string; assignTo?: string }
interface AssignParams { escalationId: string; humanId?: string; notes?: string }
interface AvailableParams { skill?: string; priority?: string }
interface ContextParams { escalationId: string; includeHistory?: boolean; includeSummary?: boolean }
interface NotifyParams { humanId: string; message: string; channel?: string; urgency?: string }
interface ResolveParams { escalationId: string; resolution?: string; outcome: string }
interface TrackParams { period?: string; byAgent?: boolean }

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

