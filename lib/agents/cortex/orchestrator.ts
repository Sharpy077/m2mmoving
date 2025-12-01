/**
 * CORTEX - Central AI Orchestrator
 * Coordinates all AI agents, routes messages, manages inter-agent communication
 */

import { BaseAgent, type AgentInput, type AgentOutput, type AgentAction } from "../base-agent"
import type { AgentIdentity, AgentConfig, InterAgentMessage, EscalationTicket } from "../types"

// Import all agents
import { getMaya } from "../maya/agent"
import { getSentinel } from "../sentinel/agent"
import { getHunter } from "../hunter/agent"
import { getAurora } from "../aurora/agent"
import { getOracle } from "../oracle/agent"
import { getPhoenix } from "../phoenix/agent"
import { getEcho } from "../echo/agent"
import { getNexus } from "../nexus/agent"
import { getPrism } from "../prism/agent"
import { getCipher } from "../cipher/agent"
import { getBridge } from "../bridge/agent"
import { getGuardian } from "../guardian/agent"

// =============================================================================
// CORTEX ORCHESTRATOR
// =============================================================================

export class CortexOrchestrator {
  private agents: Map<string, BaseAgent> = new Map()
  private messageQueue: InterAgentMessage[] = []
  private escalationQueue: EscalationTicket[] = []
  private isProcessing: boolean = false
  
  constructor() {
    this.initializeAgents()
    this.startMessageProcessor()
  }
  
  private initializeAgents(): void {
    // Core Sales Agents
    this.registerAgent("MAYA_SALES", getMaya())
    this.registerAgent("SENTINEL_CS", getSentinel())
    this.registerAgent("HUNTER_LG", getHunter())
    this.registerAgent("AURORA_MKT", getAurora())
    this.registerAgent("ORACLE_BI", getOracle())
    
    // Extended Agents
    this.registerAgent("PHOENIX_RET", getPhoenix())
    this.registerAgent("ECHO_REP", getEcho())
    this.registerAgent("NEXUS_OPS", getNexus())
    this.registerAgent("PRISM_PRICE", getPrism())
    
    // Support Agents
    this.registerAgent("CIPHER_SEC", getCipher())
    this.registerAgent("BRIDGE_HH", getBridge())
    this.registerAgent("GUARDIAN_QA", getGuardian())
    
    console.log(`[CORTEX] Initialized ${this.agents.size} agents`)
  }
  
  private registerAgent(codename: string, agent: BaseAgent): void {
    this.agents.set(codename, agent)
  }
  
  // =============================================================================
  // PUBLIC API
  // =============================================================================
  
  /**
   * Get an agent by codename
   */
  public getAgent(codename: string): BaseAgent | undefined {
    return this.agents.get(codename.toUpperCase())
  }
  
  /**
   * Get all registered agents
   */
  public getAllAgents(): Map<string, BaseAgent> {
    return this.agents
  }
  
  /**
   * Get agent identities for display
   */
  public getAgentIdentities(): AgentIdentity[] {
    return Array.from(this.agents.values()).map(agent => agent.getIdentity())
  }
  
  /**
   * Determine which agent should handle a message
   */
  public async determineAgent(message: string): Promise<BaseAgent | null> {
    const lowerMessage = message.toLowerCase()
    
    // Intent classification rules
    const intentMap: Array<{ keywords: string[]; agent: string }> = [
      // Sales/Quotes
      { keywords: ["quote", "price", "cost", "how much", "estimate", "pricing", "book"], agent: "MAYA_SALES" },
      
      // Support
      { keywords: ["help", "support", "issue", "problem", "complaint", "question"], agent: "SENTINEL_CS" },
      { keywords: ["status", "where", "tracking", "update", "when"], agent: "SENTINEL_CS" },
      
      // Lead Gen
      { keywords: ["looking for", "need movers", "relocating", "moving", "office move"], agent: "HUNTER_LG" },
      { keywords: ["commercial", "business", "company move"], agent: "HUNTER_LG" },
      
      // Marketing
      { keywords: ["campaign", "advertisement", "promotion", "marketing"], agent: "AURORA_MKT" },
      
      // Analytics
      { keywords: ["report", "analytics", "metrics", "performance", "statistics"], agent: "ORACLE_BI" },
      
      // Operations
      { keywords: ["schedule", "availability", "crew", "truck", "vehicle"], agent: "NEXUS_OPS" },
      
      // Pricing
      { keywords: ["discount", "offer", "deal", "negotiate", "competitor"], agent: "PRISM_PRICE" },
      
      // Retention
      { keywords: ["review", "feedback", "referral", "loyalty", "satisfied"], agent: "PHOENIX_RET" },
      
      // Reputation
      { keywords: ["reputation", "social media", "mention", "brand"], agent: "ECHO_REP" },
    ]
    
    // Find best matching agent
    for (const intent of intentMap) {
      if (intent.keywords.some(kw => lowerMessage.includes(kw))) {
        return this.agents.get(intent.agent) || null
      }
    }
    
    // Default to MAYA for general inquiries (sales focus)
    return this.agents.get("MAYA_SALES") || null
  }
  
  /**
   * Route a message through the orchestrator
   */
  public async routeMessage(input: AgentInput): Promise<AgentOutput> {
    console.log(`[CORTEX] Routing message: ${input.content?.substring(0, 50)}...`)
    
    // Determine target agent
    const targetAgent = await this.determineAgent(input.content || "")
    
    if (!targetAgent) {
      return {
        success: false,
        error: "No suitable agent found to handle this request",
      }
    }
    
    const agentIdentity = targetAgent.getIdentity()
    console.log(`[CORTEX] Selected agent: ${agentIdentity.name} (${agentIdentity.codename})`)
    
    // Process through agent
    const response = await targetAgent.process(input)
    
    // QA audit (async, don't wait)
    this.auditConversation(agentIdentity.codename, input, response)
    
    // Handle inter-agent requests
    if (response.actions) {
      await this.processActions(response.actions, agentIdentity.codename)
    }
    
    return {
      ...response,
      data: {
        ...response.data,
        agent: agentIdentity.codename,
        agentName: agentIdentity.name,
      },
    }
  }
  
  /**
   * Send a message from one agent to another
   */
  public async sendInterAgentMessage(message: InterAgentMessage): Promise<void> {
    console.log(`[CORTEX] Inter-agent message: ${message.from} -> ${message.to}`)
    this.messageQueue.push(message)
  }
  
  /**
   * Create an escalation ticket
   */
  public async createEscalation(ticket: EscalationTicket): Promise<string> {
    const ticketId = `ESC-${Date.now()}`
    this.escalationQueue.push({ ...ticket, id: ticketId })
    
    // Notify BRIDGE agent
    const bridge = this.agents.get("BRIDGE_HH")
    if (bridge) {
      await bridge.process({
        type: "escalation",
        metadata: ticket,
      })
    }
    
    console.log(`[CORTEX] Escalation created: ${ticketId}`)
    return ticketId
  }
  
  /**
   * Broadcast an event to all relevant agents
   */
  public async broadcast(eventName: string, data: Record<string, unknown>): Promise<void> {
    console.log(`[CORTEX] Broadcasting event: ${eventName}`)
    
    // Determine which agents should receive this event based on their triggers
    for (const [codename, agent] of this.agents) {
      const config = (agent as any).config
      
      if (config?.triggers?.some((t: any) => t.event === eventName)) {
        await agent.process({
          type: "event",
          event: { name: eventName, data },
        })
      }
    }
  }
  
  // =============================================================================
  // INTERNAL PROCESSING
  // =============================================================================
  
  private startMessageProcessor(): void {
    setInterval(() => {
      this.processMessageQueue()
    }, 100) // Process every 100ms
  }
  
  private async processMessageQueue(): Promise<void> {
    if (this.isProcessing || this.messageQueue.length === 0) return
    
    this.isProcessing = true
    
    try {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift()
        if (!message) continue
        
        const targetAgent = this.agents.get(message.to)
        if (targetAgent) {
          await targetAgent.handleInterAgentMessage(message)
        }
      }
    } finally {
      this.isProcessing = false
    }
  }
  
  private async processActions(actions: AgentAction[], fromAgent: string): Promise<void> {
    for (const action of actions) {
      switch (action.type) {
        case "handoff":
          await this.sendInterAgentMessage({
            id: `MSG-${Date.now()}`,
            from: fromAgent,
            to: action.to!,
            type: "handoff",
            payload: action.context || {},
            priority: action.priority || "medium",
            timestamp: new Date(),
          })
          break
          
        case "escalate":
          await this.createEscalation({
            id: "",
            from: fromAgent,
            reason: action.reason || "unspecified",
            priority: action.priority || "medium",
            context: action.context || {},
            status: "pending",
            createdAt: new Date(),
          })
          break
          
        case "notify":
          await this.sendInterAgentMessage({
            id: `MSG-${Date.now()}`,
            from: fromAgent,
            to: action.to!,
            type: "notification",
            payload: action.context || {},
            priority: "low",
            timestamp: new Date(),
          })
          break
      }
    }
  }
  
  private async auditConversation(
    agentCodename: string,
    input: AgentInput,
    output: AgentOutput
  ): Promise<void> {
    // Non-blocking QA audit
    const guardian = this.agents.get("GUARDIAN_QA")
    if (!guardian) return
    
    setImmediate(async () => {
      try {
        await guardian.process({
          type: "event",
          event: {
            name: "qa_check_required",
            data: {
              agentId: agentCodename,
              response: output.response,
              context: input,
            },
          },
        })
      } catch (error) {
        console.error("[CORTEX] QA audit failed:", error)
      }
    })
  }
  
  // =============================================================================
  // SYSTEM STATUS
  // =============================================================================
  
  /**
   * Get orchestrator status
   */
  public getStatus(): {
    agents: number
    pendingMessages: number
    pendingEscalations: number
    health: "healthy" | "degraded" | "critical"
  } {
    const pendingEscalations = this.escalationQueue.filter(e => e.status === "pending").length
    
    let health: "healthy" | "degraded" | "critical" = "healthy"
    if (pendingEscalations > 10) health = "degraded"
    if (pendingEscalations > 50) health = "critical"
    
    return {
      agents: this.agents.size,
      pendingMessages: this.messageQueue.length,
      pendingEscalations,
      health,
    }
  }
}

// =============================================================================
// SINGLETON FACTORY
// =============================================================================

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
