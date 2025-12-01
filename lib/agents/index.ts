/**
 * AI Agents Index
 * Central export for all AI agents in the M&M Commercial Moving salesforce
 */

// Core Types
export * from "./types"
export type { AgentInput, AgentOutput, AgentAction } from "./base-agent"
export { BaseAgent } from "./base-agent"

// Orchestrator
export { CortexOrchestrator, getCortex, resetCortex } from "./cortex/orchestrator"

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

import type { AgentCodename } from "./types"
import { getCortex } from "./cortex/orchestrator"

export function getAgent(codename: AgentCodename): BaseAgent | undefined {
  const cortex = getCortex()
  return cortex.getAgent(codename)
}

export function initializeAISalesforce(): void {
  // Initialize the cortex which initializes all agents
  getCortex()
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
