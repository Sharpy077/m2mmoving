/**
 * CORTEX - Central AI Orchestrator
 * Coordinates all AI agents, maintains shared context, and resolves conflicts
 */

import { v4 as uuid } from "uuid"
import type {
  AgentCodename,
  InterAgentMessage,
  AgentHandoff,
  EscalationRequest,
  CustomerProfile,
  Lead,
  AgentLog,
  ConversationContext,
  Insight,
} from "../types"
import type { BaseAgent, AgentInput, AgentOutput } from "../base-agent"

// =============================================================================
// CORTEX ORCHESTRATOR
// =============================================================================

export class CortexOrchestrator {
  private agents: Map<AgentCodename, BaseAgent> = new Map()
  private messageQueue: InterAgentMessage[] = []
  private handoffQueue: AgentHandoff[] = []
  private escalationQueue: EscalationRequest[] = []
  
  // Shared memory across all agents
  private sharedMemory: {
    customers: Map<string, CustomerProfile>
    leads: Map<string, Lead>
    conversations: Map<string, ConversationContext>
    insights: Insight[]
  }
  
  // Configuration
  private config: CortexConfig
  
  constructor(config: CortexConfig) {
    this.config = config
    this.sharedMemory = {
      customers: new Map(),
      leads: new Map(),
      conversations: new Map(),
      insights: [],
    }
  }
  
  // =============================================================================
  // AGENT REGISTRATION
  // =============================================================================
  
  /**
   * Register an agent with CORTEX
   */
  public registerAgent(agent: BaseAgent): void {
    const identity = agent.getAgentIdentity()
    this.agents.set(identity.codename, agent)
    this.log("info", "registerAgent", `Agent registered: ${identity.codename} - ${identity.name}`)
  }
  
  /**
   * Unregister an agent
   */
  public unregisterAgent(codename: AgentCodename): void {
    this.agents.delete(codename)
    this.log("info", "unregisterAgent", `Agent unregistered: ${codename}`)
  }
  
  /**
   * Get a registered agent
   */
  public getAgent(codename: AgentCodename): BaseAgent | undefined {
    return this.agents.get(codename)
  }
  
  /**
   * Get all registered agents
   */
  public getAllAgents(): Map<AgentCodename, BaseAgent> {
    return this.agents
  }
  
  // =============================================================================
  // MESSAGE ROUTING
  // =============================================================================
  
  /**
   * Route a message between agents
   */
  public async routeMessage(message: InterAgentMessage): Promise<void> {
    this.messageQueue.push(message)
    this.log("info", "routeMessage", `Message queued: ${message.from} -> ${message.to}`, {
      type: message.type,
      id: message.id,
    })
    
    // Process immediately for now (in production, use a proper queue)
    await this.processMessageQueue()
  }
  
  /**
   * Process queued messages
   */
  private async processMessageQueue(): Promise<void> {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      if (!message) continue
      
      try {
        if (message.type === "handoff") {
          await this.handleHandoff(message)
        } else if (message.type === "escalation") {
          await this.handleEscalation(message)
        } else {
          await this.deliverMessage(message)
        }
      } catch (error) {
        this.log("error", "processMessageQueue", `Failed to process message: ${error}`, { message })
      }
    }
  }
  
  /**
   * Deliver a message to target agent
   */
  private async deliverMessage(message: InterAgentMessage): Promise<void> {
    const targetAgent = this.agents.get(message.to as AgentCodename)
    
    if (!targetAgent) {
      this.log("warn", "deliverMessage", `Target agent not found: ${message.to}`)
      return
    }
    
    await targetAgent.handleInterAgentMessage(message)
    this.log("info", "deliverMessage", `Message delivered: ${message.from} -> ${message.to}`)
  }
  
  // =============================================================================
  // HANDOFF MANAGEMENT
  // =============================================================================
  
  /**
   * Handle agent handoff request
   */
  private async handleHandoff(message: InterAgentMessage): Promise<void> {
    const handoff = message.payload.handoff as AgentHandoff
    this.handoffQueue.push(handoff)
    
    const targetAgent = this.agents.get(handoff.toAgent)
    if (!targetAgent) {
      this.log("error", "handleHandoff", `Target agent not available: ${handoff.toAgent}`)
      // Could trigger fallback logic here
      return
    }
    
    // Build input for target agent
    const input: AgentInput = {
      type: "handoff",
      handoff,
      customerId: handoff.customerId,
      leadId: handoff.leadId,
      metadata: handoff.context,
    }
    
    // Process with target agent
    const result = await targetAgent.process(input)
    
    // Update handoff status
    handoff.status = result.success ? "completed" : "rejected"
    
    this.log("info", "handleHandoff", `Handoff ${handoff.status}: ${handoff.fromAgent} -> ${handoff.toAgent}`)
  }
  
  /**
   * Get pending handoffs
   */
  public getPendingHandoffs(): AgentHandoff[] {
    return this.handoffQueue.filter(h => h.status === "pending")
  }
  
  // =============================================================================
  // ESCALATION MANAGEMENT
  // =============================================================================
  
  /**
   * Handle escalation to human
   */
  private async handleEscalation(message: InterAgentMessage): Promise<void> {
    const escalation = message.payload.escalation as EscalationRequest
    this.escalationQueue.push(escalation)
    
    // In production, this would:
    // 1. Create a ticket in support system
    // 2. Notify relevant human agents
    // 3. Send Slack/email notification
    // 4. Log for compliance
    
    this.log("warn", "handleEscalation", `Escalation created: ${escalation.reason}`, {
      priority: escalation.priority,
      fromAgent: escalation.fromAgent,
    })
    
    // For now, emit an event that can be handled elsewhere
    await this.notifyHumans(escalation)
  }
  
  /**
   * Notify human agents of escalation
   */
  private async notifyHumans(escalation: EscalationRequest): Promise<void> {
    // In production: send Slack, email, SMS based on priority
    this.log("info", "notifyHumans", `Human notification sent for escalation: ${escalation.id}`)
  }
  
  /**
   * Get pending escalations
   */
  public getPendingEscalations(): EscalationRequest[] {
    return this.escalationQueue.filter(e => e.status === "pending")
  }
  
  /**
   * Resolve an escalation
   */
  public resolveEscalation(
    escalationId: string,
    resolution: string,
    resolvedBy: string
  ): void {
    const escalation = this.escalationQueue.find(e => e.id === escalationId)
    if (escalation) {
      escalation.status = "resolved"
      escalation.assignedTo = resolvedBy
      escalation.resolvedAt = new Date()
      this.log("info", "resolveEscalation", `Escalation resolved: ${escalationId}`)
    }
  }
  
  // =============================================================================
  // INTELLIGENT ROUTING
  // =============================================================================
  
  /**
   * Determine which agent should handle an incoming request
   */
  public async routeIncomingRequest(request: IncomingRequest): Promise<AgentCodename> {
    // Intent-based routing
    const intent = await this.classifyIntent(request.content)
    
    switch (intent) {
      case "get_quote":
      case "pricing":
      case "book_move":
        return "MAYA_SALES"
      
      case "support":
      case "complaint":
      case "question":
      case "booking_change":
        return "SENTINEL_CS"
      
      case "lead_inquiry":
      case "new_business":
        return "HUNTER_LG"
      
      case "marketing":
      case "partnership":
        return "AURORA_MKT"
      
      default:
        // Default to sales for general inquiries
        return "MAYA_SALES"
    }
  }
  
  /**
   * Classify the intent of incoming content
   */
  private async classifyIntent(content: string): Promise<string> {
    const contentLower = content.toLowerCase()
    
    // Simple keyword-based classification
    // In production, use an ML model
    
    if (contentLower.includes("quote") || contentLower.includes("price") || contentLower.includes("cost")) {
      return "get_quote"
    }
    if (contentLower.includes("book") || contentLower.includes("schedule")) {
      return "book_move"
    }
    if (contentLower.includes("help") || contentLower.includes("support") || contentLower.includes("issue")) {
      return "support"
    }
    if (contentLower.includes("complaint") || contentLower.includes("damage") || contentLower.includes("problem")) {
      return "complaint"
    }
    if (contentLower.includes("change") || contentLower.includes("reschedule") || contentLower.includes("cancel")) {
      return "booking_change"
    }
    if (contentLower.includes("partner") || contentLower.includes("referral")) {
      return "partnership"
    }
    
    return "general"
  }
  
  // =============================================================================
  // SHARED MEMORY MANAGEMENT
  // =============================================================================
  
  /**
   * Store customer profile
   */
  public setCustomer(customerId: string, profile: CustomerProfile): void {
    this.sharedMemory.customers.set(customerId, profile)
  }
  
  /**
   * Get customer profile
   */
  public getCustomer(customerId: string): CustomerProfile | undefined {
    return this.sharedMemory.customers.get(customerId)
  }
  
  /**
   * Store lead
   */
  public setLead(leadId: string, lead: Lead): void {
    this.sharedMemory.leads.set(leadId, lead)
  }
  
  /**
   * Get lead
   */
  public getLead(leadId: string): Lead | undefined {
    return this.sharedMemory.leads.get(leadId)
  }
  
  /**
   * Store conversation context
   */
  public setConversation(conversationId: string, context: ConversationContext): void {
    this.sharedMemory.conversations.set(conversationId, context)
  }
  
  /**
   * Get conversation context
   */
  public getConversation(conversationId: string): ConversationContext | undefined {
    return this.sharedMemory.conversations.get(conversationId)
  }
  
  /**
   * Add insight
   */
  public addInsight(insight: Insight): void {
    this.sharedMemory.insights.push(insight)
    // Optionally notify ORACLE agent
    this.routeMessage({
      id: uuid(),
      from: "CORTEX_MAIN",
      to: "ORACLE_ANL",
      type: "notification",
      payload: { insight },
      timestamp: new Date(),
    })
  }
  
  /**
   * Get insights
   */
  public getInsights(filter?: { type?: string; priority?: string }): Insight[] {
    let insights = this.sharedMemory.insights
    
    if (filter?.type) {
      insights = insights.filter(i => i.type === filter.type)
    }
    if (filter?.priority) {
      insights = insights.filter(i => i.priority === filter.priority)
    }
    
    return insights
  }
  
  // =============================================================================
  // WORKFLOW ORCHESTRATION
  // =============================================================================
  
  /**
   * Execute a multi-agent workflow
   */
  public async executeWorkflow(workflow: Workflow): Promise<WorkflowResult> {
    const results: WorkflowStepResult[] = []
    let currentContext = workflow.initialContext
    
    this.log("info", "executeWorkflow", `Starting workflow: ${workflow.name}`)
    
    for (const step of workflow.steps) {
      const agent = this.agents.get(step.agent)
      if (!agent) {
        this.log("error", "executeWorkflow", `Agent not found: ${step.agent}`)
        continue
      }
      
      const input: AgentInput = {
        type: "message",
        content: step.prompt,
        metadata: { ...currentContext, ...step.context },
      }
      
      const result = await agent.process(input)
      
      results.push({
        step: step.name,
        agent: step.agent,
        success: result.success,
        output: result,
      })
      
      // Update context for next step
      if (result.data) {
        currentContext = { ...currentContext, ...result.data }
      }
      
      // Check if workflow should continue
      if (!result.success && step.required) {
        this.log("error", "executeWorkflow", `Required step failed: ${step.name}`)
        break
      }
    }
    
    this.log("info", "executeWorkflow", `Workflow completed: ${workflow.name}`)
    
    return {
      workflow: workflow.name,
      success: results.every(r => r.success),
      steps: results,
      finalContext: currentContext,
    }
  }
  
  // =============================================================================
  // CONFLICT RESOLUTION
  // =============================================================================
  
  /**
   * Resolve conflicts between agents
   */
  public async resolveConflict(conflict: AgentConflict): Promise<ConflictResolution> {
    this.log("warn", "resolveConflict", `Resolving conflict between ${conflict.agents.join(", ")}`)
    
    // Simple priority-based resolution
    // In production, use more sophisticated logic
    
    const priority: Record<AgentCodename, number> = {
      "MAYA_SALES": 10,        // Sales has high priority for customer interactions
      "SENTINEL_CS": 9,        // Support is next for customer issues
      "HUNTER_LG": 7,          // Lead gen for new prospects
      "AURORA_MKT": 5,         // Marketing for content
      "ORACLE_ANL": 4,         // Analytics for insights
      "NEXUS_OPS": 8,          // Operations for scheduling
      "PRISM_PRC": 6,          // Pricing for quotes
      "PHOENIX_RET": 5,        // Retention for existing customers
      "ECHO_REP": 4,           // Reputation for reviews
      "CIPHER_CI": 3,          // Competitive intel
      "BRIDGE_PRT": 3,         // Partner management
      "GUARDIAN_QA": 9,        // Quality/compliance has high priority
      "CORTEX_MAIN": 10,       // CORTEX always wins
    }
    
    // Find highest priority agent
    const winner = conflict.agents.reduce((a, b) =>
      (priority[a] || 0) >= (priority[b] || 0) ? a : b
    )
    
    return {
      winner,
      reason: "Priority-based resolution",
      action: conflict.proposedActions[winner] || "proceed",
    }
  }
  
  // =============================================================================
  // HEALTH & MONITORING
  // =============================================================================
  
  /**
   * Get system health status
   */
  public getHealthStatus(): SystemHealth {
    const agentStatuses: Record<string, string> = {}
    
    for (const [codename, agent] of this.agents) {
      agentStatuses[codename] = agent.getStatus()
    }
    
    return {
      status: "healthy",
      timestamp: new Date(),
      agents: agentStatuses,
      queues: {
        messages: this.messageQueue.length,
        handoffs: this.handoffQueue.filter(h => h.status === "pending").length,
        escalations: this.escalationQueue.filter(e => e.status === "pending").length,
      },
      memory: {
        customers: this.sharedMemory.customers.size,
        leads: this.sharedMemory.leads.size,
        conversations: this.sharedMemory.conversations.size,
        insights: this.sharedMemory.insights.length,
      },
    }
  }
  
  /**
   * Get agent performance metrics
   */
  public async getAgentMetrics(): Promise<Record<AgentCodename, AgentMetrics>> {
    const metrics: Record<string, AgentMetrics> = {}
    
    for (const [codename] of this.agents) {
      // In production, aggregate from actual logs/database
      metrics[codename] = {
        interactions: 0,
        successRate: 0,
        avgResponseTime: 0,
        escalationRate: 0,
      }
    }
    
    return metrics as Record<AgentCodename, AgentMetrics>
  }
  
  // =============================================================================
  // LOGGING
  // =============================================================================
  
  private log(
    level: AgentLog["level"],
    action: string,
    message: string,
    data?: Record<string, unknown>
  ): void {
    const log: AgentLog = {
      id: uuid(),
      agentCodename: "CORTEX_MAIN",
      level,
      action,
      message,
      data,
      timestamp: new Date(),
    }
    
    const prefix = "[CORTEX]"
    const logMessage = `${prefix} ${action}: ${message}`
    
    switch (level) {
      case "debug":
        console.debug(logMessage, data || "")
        break
      case "info":
        console.info(logMessage, data || "")
        break
      case "warn":
        console.warn(logMessage, data || "")
        break
      case "error":
        console.error(logMessage, data || "")
        break
    }
  }
}

// =============================================================================
// TYPES
// =============================================================================

export interface CortexConfig {
  enabledAgents: AgentCodename[]
  defaultAgent: AgentCodename
  escalationNotificationChannels: string[]
  maxQueueSize: number
  processingInterval: number // ms
}

export interface IncomingRequest {
  channel: "chat" | "email" | "phone" | "sms" | "web"
  content: string
  customerId?: string
  metadata?: Record<string, unknown>
}

export interface Workflow {
  name: string
  description: string
  steps: WorkflowStep[]
  initialContext: Record<string, unknown>
}

export interface WorkflowStep {
  name: string
  agent: AgentCodename
  prompt: string
  context?: Record<string, unknown>
  required: boolean
}

export interface WorkflowResult {
  workflow: string
  success: boolean
  steps: WorkflowStepResult[]
  finalContext: Record<string, unknown>
}

export interface WorkflowStepResult {
  step: string
  agent: AgentCodename
  success: boolean
  output: AgentOutput
}

export interface AgentConflict {
  id: string
  agents: AgentCodename[]
  issue: string
  proposedActions: Record<AgentCodename, string>
  timestamp: Date
}

export interface ConflictResolution {
  winner: AgentCodename
  reason: string
  action: string
}

export interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy"
  timestamp: Date
  agents: Record<string, string>
  queues: {
    messages: number
    handoffs: number
    escalations: number
  }
  memory: {
    customers: number
    leads: number
    conversations: number
    insights: number
  }
}

export interface AgentMetrics {
  interactions: number
  successRate: number
  avgResponseTime: number
  escalationRate: number
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let cortexInstance: CortexOrchestrator | null = null

export function getCortex(): CortexOrchestrator {
  if (!cortexInstance) {
    cortexInstance = new CortexOrchestrator({
      enabledAgents: [
        "MAYA_SALES",
        "SENTINEL_CS",
        "HUNTER_LG",
        "AURORA_MKT",
        "ORACLE_ANL",
      ],
      defaultAgent: "MAYA_SALES",
      escalationNotificationChannels: ["slack", "email"],
      maxQueueSize: 1000,
      processingInterval: 100,
    })
  }
  return cortexInstance
}

export function resetCortex(): void {
  cortexInstance = null
}

