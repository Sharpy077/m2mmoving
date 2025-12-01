/**
 * AI Agents Index
 * Central export for all AI agents in the M&M Commercial Moving salesforce
 */

// Core Types & Base
export * from "./types"
export { BaseAgent, type AgentInput, type AgentOutput, type AgentAction } from "./base-agent"

// Orchestrator
export { CortexOrchestrator, getCortex, resetCortex } from "./cortex/orchestrator"

// Core Sales Agents
export { MayaAgent, getMaya, resetMaya } from "./maya/agent"
export { SentinelAgent, getSentinel, resetSentinel } from "./sentinel/agent"
export { HunterAgent, getHunter, resetHunter } from "./hunter/agent"
export { AuroraAgent, getAurora, resetAurora } from "./aurora/agent"
export { OracleAgent, getOracle, resetOracle } from "./oracle/agent"

// Extended Agents
export { PhoenixAgent, getPhoenix, resetPhoenix } from "./phoenix/agent"
export { EchoAgent, getEcho, resetEcho } from "./echo/agent"
export { NexusAgent, getNexus, resetNexus } from "./nexus/agent"
export { PrismAgent, getPrism, resetPrism } from "./prism/agent"

// Support Agents
export { CipherAgent, getCipher, resetCipher } from "./cipher/agent"
export { BridgeAgent, getBridge, resetBridge } from "./bridge/agent"
export { GuardianAgent, getGuardian, resetGuardian } from "./guardian/agent"

// =============================================================================
// AGENT REGISTRY
// =============================================================================

export const AGENT_REGISTRY = {
  // Core Agents
  CORTEX: { name: "CORTEX", codename: "CORTEX_ORCH", category: "orchestrator", description: "Central AI Orchestrator" },
  MAYA: { name: "Maya", codename: "MAYA_SALES", category: "sales", description: "AI Sales Agent" },
  SENTINEL: { name: "Sentinel", codename: "SENTINEL_CS", category: "support", description: "AI Customer Support Agent" },
  HUNTER: { name: "Hunter", codename: "HUNTER_LG", category: "lead_gen", description: "AI Lead Generation Agent" },
  AURORA: { name: "Aurora", codename: "AURORA_MKT", category: "marketing", description: "AI Marketing Agent" },
  ORACLE: { name: "Oracle", codename: "ORACLE_BI", category: "analytics", description: "AI Business Intelligence Agent" },
  
  // Extended Agents
  PHOENIX: { name: "Phoenix", codename: "PHOENIX_RET", category: "retention", description: "AI Retention & Loyalty Agent" },
  ECHO: { name: "Echo", codename: "ECHO_REP", category: "reputation", description: "AI Reputation Management Agent" },
  NEXUS: { name: "Nexus", codename: "NEXUS_OPS", category: "operations", description: "AI Operations Agent" },
  PRISM: { name: "Prism", codename: "PRISM_PRICE", category: "pricing", description: "AI Dynamic Pricing Agent" },
  
  // Support Agents
  CIPHER: { name: "Cipher", codename: "CIPHER_SEC", category: "security", description: "AI Security & Compliance Agent" },
  BRIDGE: { name: "Bridge", codename: "BRIDGE_HH", category: "handoff", description: "AI Human Handoff Agent" },
  GUARDIAN: { name: "Guardian", codename: "GUARDIAN_QA", category: "quality", description: "AI Quality Assurance Agent" },
} as const

export type AgentName = keyof typeof AGENT_REGISTRY

// =============================================================================
// AGENT FACTORY
// =============================================================================

import { getMaya } from "./maya/agent"
import { getSentinel } from "./sentinel/agent"
import { getHunter } from "./hunter/agent"
import { getAurora } from "./aurora/agent"
import { getOracle } from "./oracle/agent"
import { getPhoenix } from "./phoenix/agent"
import { getEcho } from "./echo/agent"
import { getNexus } from "./nexus/agent"
import { getPrism } from "./prism/agent"
import { getCipher } from "./cipher/agent"
import { getBridge } from "./bridge/agent"
import { getGuardian } from "./guardian/agent"

export function getAgent(name: AgentName): BaseAgent {
  switch (name) {
    case "MAYA": return getMaya()
    case "SENTINEL": return getSentinel()
    case "HUNTER": return getHunter()
    case "AURORA": return getAurora()
    case "ORACLE": return getOracle()
    case "PHOENIX": return getPhoenix()
    case "ECHO": return getEcho()
    case "NEXUS": return getNexus()
    case "PRISM": return getPrism()
    case "CIPHER": return getCipher()
    case "BRIDGE": return getBridge()
    case "GUARDIAN": return getGuardian()
    default:
      throw new Error(`Unknown agent: ${name}`)
  }
}

export function getAllAgents(): BaseAgent[] {
  return Object.keys(AGENT_REGISTRY)
    .filter(k => k !== "CORTEX")
    .map(k => getAgent(k as AgentName))
}

// =============================================================================
// CATEGORY HELPERS
// =============================================================================

export function getAgentsByCategory(category: string): AgentName[] {
  return Object.entries(AGENT_REGISTRY)
    .filter(([_, info]) => info.category === category)
    .map(([name]) => name as AgentName)
}

export const AGENT_CATEGORIES = [
  "orchestrator",
  "sales",
  "support",
  "lead_gen",
  "marketing",
  "analytics",
  "retention",
  "reputation",
  "operations",
  "pricing",
  "security",
  "handoff",
  "quality",
] as const

export type AgentCategory = typeof AGENT_CATEGORIES[number]
