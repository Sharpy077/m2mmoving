/**
 * CORTEX Orchestrator
 * Central AI that coordinates all agents
 */

import { BaseAgent, type AgentInput, type AgentOutput } from "../base-agent"
import type { AgentIdentity, AgentCodename } from "../types"

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
  private _identity: AgentIdentity

  constructor(codename: AgentCodename, name: string, description: string) {
    super({
      codename,
      enabled: true,
      model: "gpt-4o",
      temperature: 0.7,
      maxTokens: 2000,
      systemPrompt: `You are ${name}, an AI assistant for M&M Commercial Moving.`,
      tools: [],
      triggers: [],
      escalationRules: [],
      rateLimits: { requestsPerMinute: 30, tokensPerDay: 500000 },
    })
    
    this._identity = {
      codename,
      name,
      description,
      version: "1.0.0",
      capabilities: ["general-assistance"],
    }
  }

  protected getIdentity(): AgentIdentity {
    return this._identity
  }

  async process(input: AgentInput): Promise<AgentOutput> {
    const response = `Hello! I'm ${this._identity.name}, your AI assistant for M&M Commercial Moving. How can I help you today with your commercial relocation needs?`
    
    return this.buildDefaultResponse(response)
  }
}

export class CortexOrchestrator {
  private agents: Map<AgentCodename, BaseAgent> = new Map()
  private initialized: boolean = false

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
      { codename: "ORACLE_BI", name: "Oracle", description: "AI Business Intelligence Agent" },
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
    // Simple routing logic - default to Maya for sales
    const lowerContent = content.toLowerCase()
    
    if (lowerContent.includes("support") || lowerContent.includes("help") || lowerContent.includes("issue")) {
      return this.agents.get("SENTINEL_CS")
    }
    if (lowerContent.includes("price") || lowerContent.includes("quote") || lowerContent.includes("cost")) {
      return this.agents.get("PRISM_PRICE")
    }
    if (lowerContent.includes("marketing") || lowerContent.includes("campaign")) {
      return this.agents.get("AURORA_MKT")
    }
    
    // Default to Maya for sales
    return this.agents.get("MAYA_SALES")
  }

  async routeIncomingRequest(request: RouteRequest): Promise<AgentCodename> {
    const agent = await this.determineAgent(request.content)
    return (agent?.getAgentIdentity().codename as AgentCodename) || "MAYA_SALES"
  }

  getAgentIdentities(): AgentIdentity[] {
    return Array.from(this.agents.values()).map(agent => agent.getAgentIdentity())
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
