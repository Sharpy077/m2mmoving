/**
 * AI Agent Types
 * Core type definitions for the AI salesforce
 */

export interface AgentIdentity {
  codename: string
  name: string
  description: string
  version: string
  capabilities: string[]
  status?: "idle" | "busy" | "offline"
}

export interface AgentMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
}

export interface AgentInput {
  type: "message" | "event" | "scheduled" | "handoff"
  conversationId?: string
  content?: string
  messages?: AgentMessage[]
  event?: { name: string; data: Record<string, unknown> }
  customerId?: string
  leadId?: string
  metadata?: Record<string, unknown>
  handoff?: {
    id: string
    fromAgent: string
    reason: string
    context: Record<string, unknown>
  }
}

export interface AgentAction {
  type: string
  payload: Record<string, unknown>
}

export interface AgentOutput {
  success: boolean
  response?: string
  actions?: AgentAction[]
  data?: Record<string, unknown>
  error?: string
  escalation?: {
    reason: string
    priority: "low" | "medium" | "high" | "urgent"
  }
}

export type AgentCodename = 
  | "MAYA_SALES"
  | "SENTINEL_CS"
  | "HUNTER_LG"
  | "AURORA_MKT"
  | "ORACLE_ANL"
  | "ORACLE_BI"
  | "PHOENIX_RET"
  | "ECHO_REP"
  | "NEXUS_OPS"
  | "PRISM_PRICE"
  | "CIPHER_SEC"
  | "BRIDGE_HH"
  | "GUARDIAN_QA"
  | "CORTEX_ORCH"

// Agent Configuration
export interface AgentConfig {
  codename: AgentCodename | string
  enabled: boolean
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
  tools: string[]
  triggers: Array<{ event: string; action: string; priority: number }>
  escalationRules: Array<{ condition: string; reason: string; priority: string }>
  rateLimits: {
    requestsPerMinute: number
    tokensPerDay: number
  }
}

// Tool Definition
export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: string
    properties: Record<string, unknown>
    required?: string[]
  }
  handler: (params: unknown) => Promise<unknown>
}

// Inter-Agent Communication
export interface InterAgentMessage {
  id: string
  from: AgentCodename
  to: AgentCodename
  type: "request" | "notification" | "handoff"
  content: unknown
  timestamp: Date
}

// Lead Types
export interface Lead {
  id: string
  email?: string
  phone?: string
  company?: string
  status: "new" | "qualified" | "proposal" | "negotiation" | "closed" | "lost"
  source?: string
  createdAt: Date
  updatedAt: Date
}

export interface LeadScore {
  overall: number
  budget: number
  authority: number
  need: number
  timeline: number
  engagement: number
  fit: number
}

// Quote Types
export interface PriceQuote {
  id: string
  leadId: string
  baseAmount: number
  adjustments: Array<{ type: string; amount: number; description: string }>
  totalAmount: number
  depositRequired: number
  validUntil: Date
  breakdown: PriceBreakdown
  createdAt: Date
}

export interface PriceBreakdown {
  baseRate: number
  sqmCharge: number
  distanceCharge: number
  additionalServices: number
  surcharges: number
  discounts: number
  subtotal: number
  gst: number
  total: number
}
