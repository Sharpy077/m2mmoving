/**
 * AI Salesforce - Base Agent Class
 * Abstract class that all AI agents extend
 */

import { generateText, generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { v4 as uuid } from "uuid"
import type {
  AgentCodename,
  AgentIdentity,
  AgentStatus,
  AgentMessage,
  AgentConfig,
  AgentMemory,
  ToolDefinition,
  ToolResult,
  ConversationContext,
  InterAgentMessage,
  AgentHandoff,
  EscalationRequest,
  AgentLog,
} from "./types"

// =============================================================================
// BASE AGENT CLASS
// =============================================================================

export abstract class BaseAgent {
  protected identity: AgentIdentity
  protected config: AgentConfig
  protected memory: AgentMemory
  protected tools: Map<string, ToolDefinition>
  protected status: AgentStatus = "idle"
  
  constructor(config: AgentConfig) {
    this.config = config
    this.identity = this.getIdentity()
    this.memory = this.initializeMemory()
    this.tools = new Map()
    this.registerTools()
  }
  
  // =============================================================================
  // ABSTRACT METHODS - Must be implemented by each agent
  // =============================================================================
  
  /**
   * Returns the agent's identity information
   */
  protected abstract getIdentity(): AgentIdentity
  
  /**
   * Registers the tools this agent can use
   */
  protected abstract registerTools(): void
  
  /**
   * Main processing logic for the agent
   */
  public abstract process(input: AgentInput): Promise<AgentOutput>
  
  /**
   * Handles incoming messages from other agents
   */
  public abstract handleInterAgentMessage(message: InterAgentMessage): Promise<void>
  
  // =============================================================================
  // CORE METHODS
  // =============================================================================
  
  /**
   * Initialize agent memory
   */
  protected initializeMemory(): AgentMemory {
    return {
      shortTerm: new Map(),
      longTerm: {
        customers: new Map(),
        conversations: new Map(),
        insights: [],
      },
      workingMemory: {
        pendingHandoffs: [],
        activeConversations: [],
      },
    }
  }
  
  /**
   * Generate a response using the LLM
   */
  protected async generateResponse(
    messages: AgentMessage[],
    context?: Record<string, unknown>
  ): Promise<string> {
    try {
      this.setStatus("processing")
      
      const systemPrompt = this.buildSystemPrompt(context)
      
      const { text } = await generateText({
        model: openai(this.config.model),
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
      })
      
      this.setStatus("idle")
      return text
    } catch (error) {
      this.setStatus("error")
      this.log("error", "generateResponse", `Failed to generate response: ${error}`)
      throw error
    }
  }
  
  /**
   * Generate structured output using the LLM
   */
  protected async generateStructuredResponse<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    try {
      this.setStatus("processing")
      
      const systemPrompt = this.buildSystemPrompt(context)
      
      const { object } = await generateObject({
        model: openai(this.config.model),
        system: systemPrompt,
        prompt,
        schema,
        temperature: this.config.temperature,
      })
      
      this.setStatus("idle")
      return object
    } catch (error) {
      this.setStatus("error")
      this.log("error", "generateStructuredResponse", `Failed to generate structured response: ${error}`)
      throw error
    }
  }
  
  /**
   * Build the system prompt with agent identity and context
   */
  protected buildSystemPrompt(context?: Record<string, unknown>): string {
    let prompt = this.config.systemPrompt
    
    prompt += `\n\n## Agent Identity
- Codename: ${this.identity.codename}
- Name: ${this.identity.name}
- Role: ${this.identity.description}
- Capabilities: ${this.identity.capabilities.join(", ")}

## Company Context
- Company: M&M Commercial Moving
- Location: Melbourne, Victoria, Australia
- Phone: 03 8820 1801
- Email: sales@m2mmoving.au
- Website: m2mmoving.au`
    
    if (context) {
      prompt += `\n\n## Current Context\n${JSON.stringify(context, null, 2)}`
    }
    
    return prompt
  }
  
  // =============================================================================
  // TOOL MANAGEMENT
  // =============================================================================
  
  /**
   * Register a tool for this agent
   */
  protected registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool)
  }
  
  /**
   * Execute a tool by name
   */
  protected async executeTool(
    toolName: string,
    params: Record<string, unknown>
  ): Promise<ToolResult> {
    const tool = this.tools.get(toolName)
    
    if (!tool) {
      return {
        success: false,
        error: `Tool "${toolName}" not found`,
      }
    }
    
    try {
      this.log("info", "executeTool", `Executing tool: ${toolName}`, { params })
      const result = await tool.handler(params)
      this.log("info", "executeTool", `Tool completed: ${toolName}`, { success: result.success })
      return result
    } catch (error) {
      this.log("error", "executeTool", `Tool failed: ${toolName}`, { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : "Tool execution failed",
      }
    }
  }
  
  /**
   * Get tool definitions for LLM function calling
   */
  protected getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values())
  }
  
  // =============================================================================
  // INTER-AGENT COMMUNICATION
  // =============================================================================
  
  /**
   * Send a message to another agent via CORTEX
   */
  protected async sendToAgent(
    toAgent: AgentCodename,
    type: InterAgentMessage["type"],
    payload: Record<string, unknown>,
    correlationId?: string
  ): Promise<void> {
    const message: InterAgentMessage = {
      id: uuid(),
      from: this.identity.codename,
      to: toAgent,
      type,
      payload,
      correlationId,
      timestamp: new Date(),
    }
    
    // This will be handled by CORTEX
    await this.routeMessage(message)
  }
  
  /**
   * Request a handoff to another agent
   */
  protected async requestHandoff(
    toAgent: AgentCodename,
    reason: string,
    context: Record<string, unknown>,
    priority: AgentHandoff["priority"] = "normal"
  ): Promise<AgentHandoff> {
    const handoff: AgentHandoff = {
      id: uuid(),
      fromAgent: this.identity.codename,
      toAgent,
      reason,
      context,
      priority,
      timestamp: new Date(),
      status: "pending",
    }
    
    this.memory.workingMemory.pendingHandoffs.push(handoff)
    
    await this.sendToAgent(toAgent, "handoff", { handoff })
    
    this.log("info", "requestHandoff", `Handoff requested to ${toAgent}`, { reason, priority })
    
    return handoff
  }
  
  /**
   * Route message to CORTEX for delivery
   */
  protected async routeMessage(message: InterAgentMessage): Promise<void> {
    // In production, this would send to a message queue or CORTEX API
    // For now, we'll emit an event that CORTEX can listen to
    this.log("info", "routeMessage", `Message routed: ${message.from} -> ${message.to}`, {
      type: message.type,
      correlationId: message.correlationId,
    })
    
    // Store in memory for CORTEX to pick up
    const key = `outgoing_message_${message.id}`
    this.memory.shortTerm.set(key, message)
  }
  
  // =============================================================================
  // ESCALATION
  // =============================================================================
  
  /**
   * Escalate to human agent
   */
  protected async escalateToHuman(
    reason: EscalationRequest["reason"],
    summary: string,
    context: Record<string, unknown>,
    priority: EscalationRequest["priority"] = "medium"
  ): Promise<EscalationRequest> {
    const escalation: EscalationRequest = {
      id: uuid(),
      fromAgent: this.identity.codename,
      reason,
      priority,
      context,
      summary,
      status: "pending",
      createdAt: new Date(),
    }
    
    await this.sendToAgent("CORTEX_MAIN", "escalation", { escalation })
    
    this.log("warn", "escalateToHuman", `Escalation created: ${reason}`, { priority, summary })
    
    return escalation
  }
  
  // =============================================================================
  // MEMORY MANAGEMENT
  // =============================================================================
  
  /**
   * Store in short-term memory
   */
  protected setShortTermMemory(key: string, value: unknown): void {
    this.memory.shortTerm.set(key, value)
  }
  
  /**
   * Retrieve from short-term memory
   */
  protected getShortTermMemory<T>(key: string): T | undefined {
    return this.memory.shortTerm.get(key) as T | undefined
  }
  
  /**
   * Store conversation in long-term memory
   */
  protected async storeConversation(
    conversationId: string,
    messages: AgentMessage[]
  ): Promise<void> {
    this.memory.longTerm.conversations.set(conversationId, messages)
    // In production, also persist to database
  }
  
  /**
   * Retrieve conversation from long-term memory
   */
  protected async getConversation(conversationId: string): Promise<AgentMessage[]> {
    return this.memory.longTerm.conversations.get(conversationId) || []
  }
  
  /**
   * Update customer profile
   */
  protected async updateCustomerProfile(
    customerId: string,
    updates: Partial<Record<string, unknown>>
  ): Promise<void> {
    const existing = this.memory.longTerm.customers.get(customerId) || {}
    const updated = { ...existing, ...updates, lastContactDate: new Date() }
    this.memory.longTerm.customers.set(customerId, updated as any)
    // In production, also persist to database
  }
  
  // =============================================================================
  // CONTEXT MANAGEMENT
  // =============================================================================
  
  /**
   * Build conversation context for processing
   */
  protected buildContext(
    conversationId: string,
    messages: AgentMessage[],
    additionalContext?: Record<string, unknown>
  ): ConversationContext {
    return {
      conversationId,
      channel: "chat",
      history: messages,
      extractedEntities: {},
      lastUpdated: new Date(),
      ...additionalContext,
    }
  }
  
  /**
   * Extract entities from text (names, emails, dates, etc.)
   */
  protected async extractEntities(
    text: string
  ): Promise<Record<string, unknown>> {
    // Simple entity extraction - in production use NER model
    const entities: Record<string, unknown> = {}
    
    // Email
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/)
    if (emailMatch) entities.email = emailMatch[0]
    
    // Phone (Australian format)
    const phoneMatch = text.match(/(?:\+?61|0)[2-478](?:[ -]?\d){8}/)
    if (phoneMatch) entities.phone = phoneMatch[0]
    
    // ABN
    const abnMatch = text.match(/\b\d{2}\s?\d{3}\s?\d{3}\s?\d{3}\b/)
    if (abnMatch) entities.abn = abnMatch[0].replace(/\s/g, "")
    
    // Dates
    const dateMatch = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/)
    if (dateMatch) entities.date = dateMatch[0]
    
    // Suburbs (Melbourne common ones)
    const suburbs = [
      "CBD", "Melbourne", "Richmond", "South Yarra", "Prahran", "St Kilda",
      "Carlton", "Fitzroy", "Collingwood", "Brunswick", "Footscray",
      "Box Hill", "Clayton", "Dandenong", "Frankston", "Geelong",
    ]
    for (const suburb of suburbs) {
      if (text.toLowerCase().includes(suburb.toLowerCase())) {
        entities.suburb = suburb
        break
      }
    }
    
    return entities
  }
  
  // =============================================================================
  // STATUS & LOGGING
  // =============================================================================
  
  /**
   * Set agent status
   */
  protected setStatus(status: AgentStatus): void {
    this.status = status
    this.identity.status = status
  }
  
  /**
   * Get current status
   */
  public getStatus(): AgentStatus {
    return this.status
  }
  
  /**
   * Get agent identity
   */
  public getAgentIdentity(): AgentIdentity {
    return this.identity
  }
  
  /**
   * Log agent activity
   */
  protected log(
    level: AgentLog["level"],
    action: string,
    message: string,
    data?: Record<string, unknown>
  ): void {
    const log: AgentLog = {
      id: uuid(),
      agentCodename: this.identity.codename,
      level,
      action,
      message,
      data,
      timestamp: new Date(),
    }
    
    // Console output in development
    const prefix = `[${this.identity.codename}]`
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
    
    // In production, also persist to logging service
  }
  
  // =============================================================================
  // UTILITIES
  // =============================================================================
  
  /**
   * Generate a unique ID
   */
  protected generateId(): string {
    return uuid()
  }
  
  /**
   * Delay execution
   */
  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  /**
   * Check if agent should escalate based on rules
   */
  protected shouldEscalate(context: Record<string, unknown>): {
    should: boolean
    reason?: EscalationRequest["reason"]
    priority?: EscalationRequest["priority"]
  } {
    for (const rule of this.config.escalationRules) {
      // Simple rule evaluation - in production use a rules engine
      try {
        const shouldEscalate = this.evaluateRule(rule.condition, context)
        if (shouldEscalate) {
          return {
            should: true,
            reason: rule.reason,
            priority: rule.priority,
          }
        }
      } catch {
        // Rule evaluation failed, continue to next rule
      }
    }
    
    return { should: false }
  }
  
  /**
   * Evaluate a rule condition against context
   */
  private evaluateRule(condition: string, context: Record<string, unknown>): boolean {
    // Simple evaluation - in production use a proper expression evaluator
    if (condition.includes("sentiment") && context.sentiment === "negative") {
      return true
    }
    if (condition.includes("damage") && context.category === "damage") {
      return true
    }
    if (condition.includes("value") && (context.dealValue as number) > 10000) {
      return true
    }
    return false
  }
}

// =============================================================================
// INPUT/OUTPUT TYPES
// =============================================================================

export interface AgentInput {
  type: "message" | "event" | "scheduled" | "handoff"
  conversationId?: string
  customerId?: string
  leadId?: string
  content?: string
  messages?: AgentMessage[]
  event?: {
    name: string
    data: Record<string, unknown>
  }
  handoff?: AgentHandoff
  metadata?: Record<string, unknown>
}

export interface AgentOutput {
  success: boolean
  response?: string
  actions?: AgentAction[]
  handoff?: AgentHandoff
  escalation?: EscalationRequest
  data?: Record<string, unknown>
  error?: string
}

export interface AgentAction {
  type: "send_message" | "create_lead" | "update_lead" | "send_email" | "schedule_task" | "create_ticket" | "other"
  target?: string
  data: Record<string, unknown>
  status: "pending" | "completed" | "failed"
}

