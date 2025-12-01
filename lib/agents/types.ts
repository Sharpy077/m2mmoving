/**
 * AI Agent Types
 * Core type definitions for the AI salesforce
 */

export type PriorityLevel = "low" | "medium" | "high" | "urgent"

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

export interface AgentIdentity {
  codename: AgentCodename | string
  name: string
  description: string
  version: string
  capabilities: string[]
  status?: "idle" | "busy" | "offline"
}

export interface AgentContext {
  conversationId?: string
  leadId?: string
  customerId?: string
  metadata?: Record<string, unknown>
}

export interface AgentMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  agentCodename?: AgentCodename | string
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
  metadata?: Record<string, unknown>
}

export interface AgentOutput {
  success: boolean
  response?: string
  actions?: AgentAction[]
  data?: Record<string, unknown>
  error?: string
  escalation?: {
    reason: string
    priority: PriorityLevel
  }
}

// Agent Configuration ----------------------------------------------------------------

export interface TriggerDefinition {
  event: string
  action: string
  priority: number
}

export interface EscalationRule {
  condition: string
  reason: string
  priority: PriorityLevel
}

export interface AgentConfig {
  codename: AgentCodename | string
  enabled: boolean
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
  tools: string[]
  triggers: TriggerDefinition[]
  escalationRules: EscalationRule[]
  rateLimits: {
    requestsPerMinute: number
    tokensPerDay: number
  }
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: string
    properties: Record<string, unknown>
    required?: string[]
  }
  handler: (params: unknown) => Promise<unknown> | unknown
}

export interface InterAgentMessage {
  id: string
  from: AgentCodename | string
  to: AgentCodename | string
  type: "request" | "notification" | "handoff"
  content: Record<string, unknown>
  timestamp: Date
  context?: Record<string, unknown>
}

// Lead & Quote Types ------------------------------------------------------------------

export interface Lead {
  id: string
  name?: string
  company?: string
  email?: string
  phone?: string
  status: "new" | "qualified" | "proposal" | "negotiation" | "closed" | "lost"
  source?: string
  assignedTo?: string
  value?: number
  createdAt: Date
  updatedAt: Date
  metadata?: Record<string, unknown>
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

export interface PriceAdjustment {
  type: string
  amount: number
  description?: string
}

export interface PriceQuote {
  id: string
  leadId: string
  baseAmount: number
  adjustments: PriceAdjustment[]
  totalAmount: number
  depositRequired: number
  validUntil: Date
  breakdown: PriceBreakdown
  createdAt: Date
}

// Intent Signals ----------------------------------------------------------------------

export type IntentSignalType =
  | "website_activity"
  | "content_download"
  | "competitor_engagement"
  | "job_posting"
  | "funding_news"
  | "social_activity"
  | "referral"
  | "other"

export interface IntentSignal {
  id: string
  type: IntentSignalType | string
  source: string
  description?: string
  score?: number
  detectedAt: Date
  metadata?: Record<string, unknown>
}

// Marketing / Campaign Types ----------------------------------------------------------

export type ContentType =
  | "blog"
  | "social"
  | "email"
  | "ad"
  | "video"
  | "press_release"
  | "landing_page"
  | string

export type Platform =
  | "linkedin"
  | "facebook"
  | "instagram"
  | "twitter"
  | "youtube"
  | "website"
  | "email"
  | "blog"
  | string

export interface ContentPiece {
  id: string
  type: ContentType
  platform?: Platform
  title?: string
  body: string
  tone?: string
  status: "draft" | "scheduled" | "published" | "archived"
  publishAt?: Date
  tags?: string[]
  metrics?: Record<string, number>
  metadata?: Record<string, unknown>
}

export interface CampaignMetrics {
  impressions: number
  clicks: number
  leads: number
  conversions: number
  ctr?: number
  cpl?: number
  spend?: number
  revenueAttributed?: number
}

export interface Campaign {
  id: string
  name: string
  objective: string
  status: "draft" | "active" | "paused" | "completed"
  startDate?: Date
  endDate?: Date
  budget?: number
  metrics?: CampaignMetrics
  metadata?: Record<string, unknown>
}

// Analytics & Insights -----------------------------------------------------------------

export interface DashboardMetrics {
  revenue: number
  pipeline: number
  conversionRate: number
  bookedMoves: number
  avgDealSize: number
  winRate: number
  leadVolume: number
  quoteToClose: number
  timePeriod?: string
  comparisons?: Record<string, number>
  trend?: "up" | "down" | "flat"
}

export interface Insight {
  id: string
  title: string
  description: string
  impact: PriorityLevel
  category: string
  recommendation: string
  supportingData?: Record<string, unknown>
  createdAt: Date
}

// Customer Success / Retention ---------------------------------------------------------

export interface CustomerProfile {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  status?: "active" | "inactive" | "churn_risk" | "vip"
  npsScore?: number
  lifetimeValue?: number
  lastEngagedAt?: Date
  segments?: string[]
  metadata?: Record<string, unknown>
}

// Support & Tickets --------------------------------------------------------------------

export type TicketStatus = "open" | "in_progress" | "waiting_customer" | "resolved" | "closed"

export type TicketPriority = "low" | "medium" | "high" | "urgent"

export type TicketCategory = "booking" | "billing" | "damage" | "complaint" | "general" | "other"

export interface TicketMessage {
  id: string
  author: string
  role: "customer" | "agent" | "system"
  content: string
  timestamp: Date
}

export interface SupportTicket {
  id: string
  customerId?: string
  bookingId?: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  subject: string
  description: string
  assignedTo?: string
  messages: TicketMessage[]
  lastUpdated: Date
  createdAt: Date
  metadata?: Record<string, unknown>
}

export interface EscalationTicket {
  id: string
  fromAgent: AgentCodename | string
  reason: string
  priority: TicketPriority | "urgent"
  status: "pending" | "assigned" | "in_progress" | "resolved"
  conversationId?: string
  summary?: string
  context?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  assignedTo?: string
}

// Operations ---------------------------------------------------------------------------

export interface Job {
  id: string
  type: string
  status: "pending" | "scheduled" | "in_progress" | "completed" | "cancelled"
  scheduledDate: Date
  origin: string
  destination: string
  crew: Array<{ id: string; name: string; role: string }>
  vehicles: string[]
  services?: string[]
  priority?: TicketPriority
  notes?: string
  metadata?: Record<string, unknown>
}
