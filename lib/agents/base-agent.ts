/**
 * Base Agent Class
 * Foundation for all AI agents in the salesforce
 */

import type {
  AgentIdentity,
  AgentInput,
  AgentOutput,
  AgentAction,
  AgentConfig,
  ToolDefinition,
  AgentMessage,
  PriorityLevel,
} from "./types"

export type { AgentInput, AgentOutput, AgentAction }

export interface AgentStatus {
  active: boolean
  lastActivity: Date | null
  conversationsToday: number
  successRate: number
}

export abstract class BaseAgent {
  protected identity: AgentIdentity
  protected config: AgentConfig
  protected tools: Map<string, ToolDefinition> = new Map()
  protected status: AgentStatus = {
    active: true,
    lastActivity: null,
    conversationsToday: 0,
    successRate: 95,
  }

  constructor(config: Partial<AgentConfig>, identityFactory?: () => AgentIdentity) {
    this.config = {
      codename: config.codename || "UNKNOWN",
      enabled: config.enabled ?? true,
      model: config.model || "gpt-4o",
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2000,
      systemPrompt: config.systemPrompt || "",
      tools: config.tools || [],
      triggers: config.triggers || [],
      escalationRules: config.escalationRules || [],
      rateLimits: config.rateLimits || { requestsPerMinute: 30, tokensPerDay: 500000 },
    }
    
    this.identity = identityFactory ? identityFactory() : this.getIdentity()
    this.registerTools()
  }

  protected abstract getIdentity(): AgentIdentity

  protected registerTools(): void {
    // Override in subclasses
  }

  protected registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool)
  }

  public getAgentIdentity(): AgentIdentity {
    return this.identity
  }

  public getStatus(): AgentStatus {
    return this.status
  }

  abstract process(input: AgentInput): Promise<AgentOutput>

  protected buildDefaultResponse(message: string): AgentOutput {
    return {
      success: true,
      response: message,
      actions: [],
      data: {},
    }
  }

  protected buildErrorResponse(error: string): AgentOutput {
    return {
      success: false,
      error,
    }
  }

  protected log(level: "info" | "warn" | "error", method: string, message: string): void {
    const prefix = `[${this.config.codename}:${method}]`
    switch (level) {
      case "error":
        console.error(prefix, message)
        break
      case "warn":
        console.warn(prefix, message)
        break
      default:
        console.log(prefix, message)
    }
  }

  protected generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  protected shouldEscalate(context: Record<string, unknown>): {
    should: boolean
    reason?: string
    priority?: PriorityLevel
  } {
    // Check escalation rules
    for (const rule of this.config.escalationRules) {
      // Simple sentiment-based check
      if (context.sentiment === "negative" && rule.reason === "negative_sentiment") {
        return { should: true, reason: rule.reason, priority: rule.priority }
      }
      // High value deal check
      if (typeof context.dealValue === "number" && context.dealValue > 20000 && rule.reason === "high_value_deal") {
        return { should: true, reason: rule.reason, priority: rule.priority }
      }
    }
    return { should: false }
  }

  protected async escalateToHuman(
    reason: string,
    details: string,
    context: Record<string, unknown>,
    priority: PriorityLevel
  ): Promise<{ reason: string; priority: PriorityLevel }> {
    this.log("info", "escalateToHuman", `Escalating: ${reason} - ${details}`)
    return { reason, priority }
  }

  protected async generateResponse(
    messages: AgentMessage[],
    context?: Record<string, unknown>
  ): Promise<string> {
    // Default implementation - override in subclasses for actual AI response
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === "user") {
      return `Thank you for your message. I'm ${this.identity.name}, and I'm here to help with your commercial moving needs. How can I assist you today?`
    }
    return "How can I help you today?"
  }
}
