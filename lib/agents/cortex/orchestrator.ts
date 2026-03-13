/**
 * CORTEX Orchestrator
 * Central AI that coordinates all agents
 */

import { BaseAgent, type AgentInput, type AgentOutput } from "../base-agent"
import type { AgentIdentity, AgentCodename } from "../types"
import { createHandoff } from "../db"

interface RouteRequest {
  channel: string
  content: string
  customerId?: string
  metadata?: Record<string, unknown>
}

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy"
  agents: Record<string, { active: boolean; lastActivity: string | null }>
  queues: { pending: number; processing: number }
  memory: { used: number; total: number }
  timestamp: string
}

// Stub agent for development
class StubAgent extends BaseAgent {
  private readonly stubIdentity: AgentIdentity

  constructor(codename: AgentCodename, name: string, description: string) {
    const identity: AgentIdentity = {
      codename,
      name,
      description,
      version: "1.0.0",
      capabilities: ["general-assistance", "task-routing", "context-management"],
    }

    super(
      {
        codename,
        enabled: true,
        model: "anthropic/claude-sonnet-4-20250514",
        temperature: 0.7,
        maxTokens: 2000,
        systemPrompt: `You are ${name}, an AI assistant for M&M Commercial Moving.`,
        tools: [],
        triggers: [],
        escalationRules: [],
        rateLimits: { requestsPerMinute: 30, tokensPerDay: 500000 },
      },
      () => identity,
    )

    this.stubIdentity = identity
  }

  protected getIdentity(): AgentIdentity {
    return this.stubIdentity
  }

  async process(input: AgentInput): Promise<AgentOutput> {
    const response = `Hello! I'm ${this.stubIdentity.name}, your AI assistant for M&M Commercial Moving. How can I help you today with your commercial relocation needs?`

    return this.buildDefaultResponse(response)
  }
}

export class CortexOrchestrator {
  private agents: Map<AgentCodename, BaseAgent> = new Map()
  private initialized = false

  constructor() {
    this.initialize()
  }

  private initialize() {
    if (this.initialized) return

    // Create stub agents
    const agentConfigs: Array<{ codename: AgentCodename; name: string; description: string }> = [
      { codename: "MAYA_SALES", name: "Maya", description: "AI Sales Agent" },
      { codename: "SENTINEL_CS", name: "Sentinel", description: "AI Customer Support Agent" },
      { codename: "HUNTER_LG", name: "Hunter", description: "AI Lead Generation Agent" },
      { codename: "AURORA_MKT", name: "Aurora", description: "AI Marketing Agent" },
      { codename: "ORACLE_ANL", name: "Oracle", description: "AI Business Intelligence Agent" },
      { codename: "PHOENIX_RET", name: "Phoenix", description: "AI Retention Agent" },
      { codename: "ECHO_REP", name: "Echo", description: "AI Reputation Agent" },
      { codename: "NEXUS_OPS", name: "Nexus", description: "AI Operations Agent" },
      { codename: "PRISM_PRICE", name: "Prism", description: "AI Pricing Agent" },
      { codename: "CIPHER_SEC", name: "Cipher", description: "AI Security Agent" },
      { codename: "BRIDGE_HH", name: "Bridge", description: "AI Handoff Agent" },
      { codename: "GUARDIAN_QA", name: "Guardian", description: "AI Quality Agent" },
    ]

    for (const config of agentConfigs) {
      this.agents.set(config.codename, new StubAgent(config.codename, config.name, config.description))
    }

    this.initialized = true
  }

  getAgent(codename: string): BaseAgent | undefined {
    return this.agents.get(codename as AgentCodename)
  }

  async determineAgent(content: string): Promise<BaseAgent | undefined> {
    const lowerContent = content.toLowerCase()

    // Support / complaint → Sentinel
    if (lowerContent.includes("complaint") || lowerContent.includes("damage") || lowerContent.includes("issue") || lowerContent.includes("problem")) {
      return this.agents.get("SENTINEL_CS")
    }
    // Analytics / reporting → Oracle
    if (lowerContent.includes("analytics") || lowerContent.includes("report") || lowerContent.includes("performance") || lowerContent.includes("business intelligence")) {
      return this.agents.get("ORACLE_ANL")
    }
    // Lead generation / prospecting → Hunter
    if (lowerContent.includes("prospect") || lowerContent.includes("lead generation") || lowerContent.includes("find new")) {
      return this.agents.get("HUNTER_LG")
    }
    // Scheduling / operations → Nexus
    if (lowerContent.includes("schedule") || lowerContent.includes("crew") || lowerContent.includes("scheduling") || lowerContent.includes("operations")) {
      return this.agents.get("NEXUS_OPS")
    }
    // Marketing / campaigns → Aurora
    if (lowerContent.includes("marketing") || lowerContent.includes("campaign") || lowerContent.includes("social media")) {
      return this.agents.get("AURORA_MKT")
    }
    // Pricing strategy (distinct from "quote") → Prism
    if ((lowerContent.includes("pricing strategy") || lowerContent.includes("optimize price") || lowerContent.includes("discount")) && !lowerContent.includes("quote")) {
      return this.agents.get("PRISM_PRICE")
    }
    // Quote / move requests → Maya (default sales agent)
    return this.agents.get("MAYA_SALES")
  }

  async routeIncomingRequest(request: RouteRequest): Promise<AgentCodename> {
    const agent = await this.determineAgent(request.content)
    return (agent?.getAgentIdentity().codename as AgentCodename) || "MAYA_SALES"
  }

  async routeWithConfidence(content: string): Promise<{ agent: BaseAgent; confidence: number; reason: string }> {
    const lowerContent = content.toLowerCase()
    let agent = await this.determineAgent(content)
    if (!agent) agent = this.agents.get("MAYA_SALES")!

    const codename = agent.getAgentIdentity().codename
    let confidence = 0.7
    let reason = "Default routing to Maya for sales enquiries"

    if (codename === "SENTINEL_CS") { confidence = 0.9; reason = "Support/complaint keywords detected" }
    else if (codename === "ORACLE_ANL") { confidence = 0.85; reason = "Analytics/reporting keywords detected" }
    else if (codename === "HUNTER_LG") { confidence = 0.85; reason = "Lead generation keywords detected" }
    else if (codename === "NEXUS_OPS") { confidence = 0.85; reason = "Scheduling/operations keywords detected" }
    else if (codename === "AURORA_MKT") { confidence = 0.85; reason = "Marketing/campaign keywords detected" }
    else if (codename === "PRISM_PRICE") { confidence = 0.8; reason = "Pricing strategy keywords detected" }
    else if (lowerContent.includes("quote") || lowerContent.includes("move") || lowerContent.includes("sqm")) {
      confidence = 0.9
      reason = "Quote/move request keywords detected"
    }

    return { agent, confidence, reason }
  }

  getAgentIdentities(): AgentIdentity[] {
    return Array.from(this.agents.values()).map((agent) => agent.getAgentIdentity())
  }

  async executeHandoff(params: {
    fromAgent: string
    toAgent: string
    reason: string
    context: Record<string, unknown>
    conversationId?: string
    priority?: string
  }): Promise<{ success: boolean; handoffId?: string; targetAgent?: string; error?: string }> {
    const targetAgent = this.agents.get(params.toAgent as AgentCodename)
    if (!targetAgent) {
      return { success: false, error: `Target agent ${params.toAgent} not found` }
    }
    try {
      const handoffId = await createHandoff(params)
      return { success: true, handoffId, targetAgent: params.toAgent }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Handoff failed" }
    }
  }

  getStatus(): "active" | "inactive" {
    return this.initialized ? "active" : "inactive"
  }

  getHealthStatus(): HealthStatus {
    const agents: Record<string, { active: boolean; lastActivity: string | null }> = {}

    for (const [codename, agent] of this.agents) {
      const status = agent.getStatus()
      agents[codename] = {
        active: status.active,
        lastActivity: status.lastActivity?.toISOString() || null,
      }
    }

    return {
      status: "healthy",
      agents,
      queues: { pending: 0, processing: 0 },
      memory: { used: 50, total: 100 },
      timestamp: new Date().toISOString(),
    }
  }
}

// Singleton instance
let cortexInstance: CortexOrchestrator | null = null

export function getCortex(): CortexOrchestrator {
  if (!cortexInstance) {
    cortexInstance = new CortexOrchestrator()
  }
  return cortexInstance
}

export function resetCortex(): void {
  cortexInstance = null
}
