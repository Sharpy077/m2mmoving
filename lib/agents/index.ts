/**
 * AI Salesforce - Agent Registry & Initialization
 * Central export point for all agents
 */

// Types
export * from "./types"

// Base Agent
export { BaseAgent, type AgentInput, type AgentOutput, type AgentAction } from "./base-agent"

// CORTEX Orchestrator
export { CortexOrchestrator, getCortex, resetCortex } from "./cortex/orchestrator"

// Individual Agents
export { MayaAgent, getMaya, resetMaya } from "./maya/agent"
export { SentinelAgent, getSentinel, resetSentinel } from "./sentinel/agent"
export { HunterAgent, getHunter, resetHunter } from "./hunter/agent"
export { AuroraAgent, getAurora, resetAurora } from "./aurora/agent"
export { OracleAgent, getOracle, resetOracle } from "./oracle/agent"

// Agent codename type for runtime lookups
import type { AgentCodename } from "./types"
import { getCortex } from "./cortex/orchestrator"
import { getMaya } from "./maya/agent"
import { getSentinel } from "./sentinel/agent"
import { getHunter } from "./hunter/agent"
import { getAurora } from "./aurora/agent"
import { getOracle } from "./oracle/agent"
import type { BaseAgent } from "./base-agent"

/**
 * Initialize the AI Salesforce
 * Registers all agents with CORTEX orchestrator
 */
export function initializeAISalesforce(): void {
  const cortex = getCortex()
  
  // Register all agents
  cortex.registerAgent(getMaya())
  cortex.registerAgent(getSentinel())
  cortex.registerAgent(getHunter())
  cortex.registerAgent(getAurora())
  cortex.registerAgent(getOracle())
  
  console.log("[AI Salesforce] Initialized with agents:", [
    "MAYA_SALES",
    "SENTINEL_CS", 
    "HUNTER_LG",
    "AURORA_MKT",
    "ORACLE_ANL",
  ].join(", "))
}

/**
 * Get an agent by codename
 */
export function getAgent(codename: AgentCodename): BaseAgent | null {
  switch (codename) {
    case "MAYA_SALES":
      return getMaya()
    case "SENTINEL_CS":
      return getSentinel()
    case "HUNTER_LG":
      return getHunter()
    case "AURORA_MKT":
      return getAurora()
    case "ORACLE_ANL":
      return getOracle()
    default:
      return null
  }
}

/**
 * Get all available agents
 */
export function getAllAgents(): Map<AgentCodename, BaseAgent> {
  const agents = new Map<AgentCodename, BaseAgent>()
  
  agents.set("MAYA_SALES", getMaya())
  agents.set("SENTINEL_CS", getSentinel())
  agents.set("HUNTER_LG", getHunter())
  agents.set("AURORA_MKT", getAurora())
  agents.set("ORACLE_ANL", getOracle())
  
  return agents
}

/**
 * Reset all agents (useful for testing)
 */
export function resetAllAgents(): void {
  resetMaya()
  resetSentinel()
  resetHunter()
  resetAurora()
  resetOracle()
}

/**
 * Agent status summary
 */
export function getAgentStatus(): Record<string, string> {
  const agents = getAllAgents()
  const status: Record<string, string> = {}
  
  for (const [codename, agent] of agents) {
    status[codename] = agent.getStatus()
  }
  
  return status
}

