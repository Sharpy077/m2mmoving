/**
 * CORTEX Orchestrator
 * Central AI that coordinates all agents with intelligent routing and inter-agent handoffs
 */

import { BaseAgent, type AgentInput, type AgentOutput } from "../base-agent"
import type { AgentIdentity, AgentCodename } from "../types"
import { createHandoff } from "../db"

// Import real agent implementations
import { MayaAgent } from "../maya/agent"
import { SentinelAgent } from "../sentinel/agent"
import { HunterAgent } from "../hunter/agent"
import { AuroraAgent } from "../aurora/agent"
import { OracleAgent } from "../oracle/agent"
import { PhoenixAgent } from "../phoenix/agent"
import { EchoAgent } from "../echo/agent"
import { NexusAgent } from "../nexus/agent"
import { PrismAgent } from "../prism/agent"
import { CipherAgent } from "../cipher/agent"
import { BridgeAgent } from "../bridge/agent"
import { GuardianAgent } from "../guardian/agent"

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

interface HandoffRequest {
  fromAgent: AgentCodename | string
  toAgent: AgentCodename | string
  reason: string
  context: Record<string, unknown>
  conversationId?: string
}

interface HandoffResult {
  success: boolean
  handoffId?: string
  targetAgent?: string
  error?: string
}

interface RouteResult {
  agent: BaseAgent | undefined
  confidence: number
  reason: string
}

// Routing rules: keyword patterns mapped to agent codenames with confidence weights
const ROUTING_RULES: Array<{
  codename: AgentCodename
  keywords: string[]
  phrases: string[]
  confidence: number
}> = [
  {
    codename: "SENTINEL_CS",
    keywords: ["support", "complaint", "damage", "problem", "broken", "issue", "refund", "cancel", "reschedule", "booking status", "track"],
    phrases: ["something went wrong", "not happy", "need help with my", "where is my", "what happened to"],
    confidence: 0.85,
  },
  {
    codename: "MAYA_SALES",
    keywords: ["quote", "price", "cost", "estimate", "moving", "relocate", "relocation", "office move", "how much", "deposit", "book"],
    phrases: ["i want to move", "we need to relocate", "looking for a quote", "can you move", "interested in your services"],
    confidence: 0.9,
  },
  {
    codename: "AURORA_MKT",
    keywords: ["marketing", "campaign", "content", "social media", "blog", "newsletter", "advertisement", "brand", "outreach"],
    phrases: ["create content", "launch a campaign", "social post", "email campaign"],
    confidence: 0.85,
  },
  {
    codename: "HUNTER_LG",
    keywords: ["prospect", "lead", "outbound", "pipeline", "sourcing", "real estate listing", "target company"],
    phrases: ["find new leads", "identify prospects", "lead generation", "new business opportunities"],
    confidence: 0.85,
  },
  {
    codename: "ORACLE_ANL",
    keywords: ["analytics", "report", "metrics", "dashboard", "forecast", "trend", "performance", "insights", "statistics", "kpi"],
    phrases: ["show me the numbers", "how are we doing", "business intelligence", "revenue analysis"],
    confidence: 0.85,
  },
  {
    codename: "PRISM_PRICE",
    keywords: ["pricing strategy", "discount", "margin", "competitor pricing", "rate card", "demand pricing", "optimize price"],
    phrases: ["adjust our pricing", "pricing analysis", "competitive rates", "price optimization"],
    confidence: 0.8,
  },
  {
    codename: "NEXUS_OPS",
    keywords: ["schedule", "crew", "vehicle", "fleet", "route", "dispatch", "assign", "capacity", "allocation"],
    phrases: ["schedule a crew", "assign vehicles", "daily operations", "optimize routes", "job assignment"],
    confidence: 0.85,
  },
  {
    codename: "PHOENIX_RET",
    keywords: ["retention", "loyalty", "churn", "win-back", "referral", "repeat customer", "nps", "satisfaction survey"],
    phrases: ["bring them back", "customer retention", "loyalty program", "referral program"],
    confidence: 0.8,
  },
  {
    codename: "ECHO_REP",
    keywords: ["review", "reputation", "google reviews", "testimonial", "feedback", "star rating", "brand sentiment"],
    phrases: ["manage our reviews", "respond to review", "reputation score", "brand monitoring"],
    confidence: 0.8,
  },
  {
    codename: "CIPHER_SEC",
    keywords: ["security", "compliance", "privacy", "gdpr", "data protection", "audit", "breach", "access control"],
    phrases: ["security check", "data compliance", "privacy audit", "access request"],
    confidence: 0.85,
  },
  {
    codename: "BRIDGE_HH",
    keywords: ["escalate", "human agent", "transfer", "callback", "speak to someone"],
    phrases: ["talk to a human", "need a real person", "escalate this", "transfer me"],
    confidence: 0.9,
  },
  {
    codename: "GUARDIAN_QA",
    keywords: ["quality", "qa", "audit conversation", "agent performance", "scoring", "calibration"],
    phrases: ["quality check", "audit this conversation", "agent quality", "review agent performance"],
    confidence: 0.8,
  },
]

export class CortexOrchestrator {
  private agents: Map<AgentCodename, BaseAgent> = new Map()
  private initialized: boolean = false

  constructor() {
    this.initialize()
  }

  private initialize() {
    if (this.initialized) return

    // Register real agent implementations
    this.agents.set("MAYA_SALES", new MayaAgent())
    this.agents.set("SENTINEL_CS", new SentinelAgent())
    this.agents.set("HUNTER_LG", new HunterAgent())
    this.agents.set("AURORA_MKT", new AuroraAgent())
    this.agents.set("ORACLE_ANL", new OracleAgent())
    this.agents.set("PHOENIX_RET", new PhoenixAgent())
    this.agents.set("ECHO_REP", new EchoAgent())
    this.agents.set("NEXUS_OPS", new NexusAgent())
    this.agents.set("PRISM_PRICE", new PrismAgent())
    this.agents.set("CIPHER_SEC", new CipherAgent())
    this.agents.set("BRIDGE_HH", new BridgeAgent())
    this.agents.set("GUARDIAN_QA", new GuardianAgent())

    this.initialized = true
  }

  getAgent(codename: string): BaseAgent | undefined {
    return this.agents.get(codename as AgentCodename)
  }

  /**
   * Intelligent agent routing using keyword/phrase matching with confidence scoring
   */
  async determineAgent(content: string): Promise<BaseAgent | undefined> {
    const result = await this.routeWithConfidence(content)
    return result.agent
  }

  /**
   * Route with confidence score and reasoning
   */
  async routeWithConfidence(content: string): Promise<RouteResult> {
    const lowerContent = content.toLowerCase()
    let bestMatch: { codename: AgentCodename; score: number; reason: string } | null = null

    for (const rule of ROUTING_RULES) {
      let score = 0
      const matchedTerms: string[] = []

      // Check keyword matches
      for (const keyword of rule.keywords) {
        if (lowerContent.includes(keyword)) {
          score += rule.confidence * 0.6
          matchedTerms.push(keyword)
        }
      }

      // Check phrase matches (weighted higher)
      for (const phrase of rule.phrases) {
        if (lowerContent.includes(phrase)) {
          score += rule.confidence * 0.8
          matchedTerms.push(phrase)
        }
      }

      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = {
          codename: rule.codename,
          score: Math.min(score, 1),
          reason: `Matched: ${matchedTerms.join(", ")}`,
        }
      }
    }

    // Default to Maya for general/ambiguous requests
    if (!bestMatch) {
      return {
        agent: this.agents.get("MAYA_SALES"),
        confidence: 0.5,
        reason: "Default routing — no strong signal detected",
      }
    }

    return {
      agent: this.agents.get(bestMatch.codename),
      confidence: bestMatch.score,
      reason: bestMatch.reason,
    }
  }

  async routeIncomingRequest(request: RouteRequest): Promise<AgentCodename> {
    const agent = await this.determineAgent(request.content)
    return (agent?.getAgentIdentity().codename as AgentCodename) || "MAYA_SALES"
  }

  /**
   * Execute an inter-agent handoff
   */
  async executeHandoff(request: HandoffRequest): Promise<HandoffResult> {
    const targetAgent = this.agents.get(request.toAgent as AgentCodename)

    if (!targetAgent) {
      return {
        success: false,
        error: `Target agent '${request.toAgent}' not found`,
      }
    }

    try {
      const handoffId = await createHandoff({
        fromAgent: request.fromAgent,
        toAgent: request.toAgent,
        reason: request.reason,
        context: request.context,
        conversationId: request.conversationId,
      })

      return {
        success: true,
        handoffId,
        targetAgent: request.toAgent,
      }
    } catch (error) {
      // If DB persistence fails, still allow the handoff to proceed
      console.error("[CORTEX] Handoff DB error:", error)
      return {
        success: true,
        handoffId: `local_${Date.now()}`,
        targetAgent: request.toAgent,
      }
    }
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
