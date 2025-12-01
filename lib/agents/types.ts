/**
 * AI Salesforce - Core Type Definitions
 * M&M Commercial Moving
 */

// =============================================================================
// AGENT IDENTITY & STATUS
// =============================================================================

export type AgentCodename =
  | "AURORA_MKT"    // Marketing
  | "HUNTER_LG"     // Lead Generation
  | "MAYA_SALES"    // Sales
  | "SENTINEL_CS"   // Customer Support
  | "PHOENIX_RET"   // Retention & Loyalty
  | "ECHO_REP"      // Reputation Management
  | "ORACLE_ANL"    // Analytics & Insights
  | "NEXUS_OPS"     // Operations Coordinator
  | "CIPHER_CI"     // Competitive Intelligence
  | "BRIDGE_PRT"    // Partner & Vendor
  | "PRISM_PRC"     // Dynamic Pricing
  | "GUARDIAN_QA"   // Compliance & Quality
  | "CORTEX_MAIN"   // Central Orchestrator

export type AgentStatus = "idle" | "processing" | "waiting" | "error" | "offline"

export interface AgentIdentity {
  codename: AgentCodename
  name: string
  description: string
  version: string
  capabilities: string[]
  status: AgentStatus
}

// =============================================================================
// MESSAGES & COMMUNICATION
// =============================================================================

export type MessageRole = "user" | "assistant" | "system" | "tool"

export interface AgentMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  agentCodename?: AgentCodename
  metadata?: Record<string, unknown>
}

export interface AgentHandoff {
  id: string
  fromAgent: AgentCodename
  toAgent: AgentCodename
  reason: string
  context: Record<string, unknown>
  customerId?: string
  leadId?: string
  priority: "low" | "normal" | "high" | "urgent"
  timestamp: Date
  status: "pending" | "accepted" | "completed" | "rejected"
}

export interface InterAgentMessage {
  id: string
  from: AgentCodename
  to: AgentCodename | "CORTEX_MAIN"
  type: "request" | "response" | "notification" | "handoff" | "escalation"
  payload: Record<string, unknown>
  correlationId?: string
  timestamp: Date
}

// =============================================================================
// TOOLS & CAPABILITIES
// =============================================================================

export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: "object"
    properties: Record<string, {
      type: string
      description: string
      enum?: string[]
      required?: boolean
    }>
    required: string[]
  }
  handler: (params: Record<string, unknown>) => Promise<ToolResult>
}

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
  metadata?: Record<string, unknown>
}

export interface ToolCall {
  id: string
  toolName: string
  parameters: Record<string, unknown>
  agentCodename: AgentCodename
  timestamp: Date
}

// =============================================================================
// CUSTOMER & LEAD DATA
// =============================================================================

export interface CustomerProfile {
  id: string
  companyName?: string
  abn?: string
  contactName: string
  email: string
  phone?: string
  industry?: string
  employeeCount?: string
  tags: string[]
  lifetimeValue: number
  npsScore?: number
  firstContactDate: Date
  lastContactDate: Date
  preferredContactMethod?: "email" | "phone" | "sms"
  notes?: string
}

export interface Lead {
  id: string
  leadType: "instant_quote" | "custom_quote" | "inbound" | "outbound"
  status: "new" | "contacted" | "qualified" | "quoted" | "negotiating" | "won" | "lost"
  source: string
  sourceDetail?: string
  
  // Contact info
  contactName?: string
  companyName?: string
  email: string
  phone?: string
  
  // Move details
  moveType?: string
  originSuburb?: string
  destinationSuburb?: string
  squareMeters?: number
  estimatedTotal?: number
  scheduledDate?: string
  additionalServices?: string[]
  specialRequirements?: string[]
  
  // Qualification
  qualificationScore?: number
  budget?: string
  authority?: string
  need?: string
  timeline?: string
  
  // Payment
  depositAmount?: number
  depositPaid: boolean
  paymentStatus?: string
  
  // Tracking
  assignedAgent?: AgentCodename
  lastAgentInteraction?: Date
  internalNotes?: string
  
  createdAt: Date
  updatedAt: Date
}

export interface LeadScore {
  overall: number // 0-100
  budget: number
  authority: number
  need: number
  timeline: number
  engagement: number
  fit: number
}

// =============================================================================
// INTENT SIGNALS (for HUNTER)
// =============================================================================

export type IntentSignalType =
  | "commercial_lease_listing"
  | "lease_expiration"
  | "hiring_surge"
  | "funding_announcement"
  | "office_renovation"
  | "expansion_news"
  | "competitor_mention"
  | "linkedin_job_post"
  | "website_visit"
  | "content_download"

export interface IntentSignal {
  id: string
  type: IntentSignalType
  confidence: number // 0-100
  source: string
  company: {
    name: string
    abn?: string
    industry?: string
    size?: string
  }
  timing: "immediate" | "near_term" | "future"
  details: Record<string, unknown>
  detectedAt: Date
}

// =============================================================================
// MARKETING (for AURORA)
// =============================================================================

export type ContentType = "blog" | "social" | "email" | "ad" | "landing_page" | "video_script"
export type Platform = "linkedin" | "facebook" | "instagram" | "google" | "email" | "website"

export interface ContentPiece {
  id: string
  type: ContentType
  platform?: Platform
  title: string
  content: string
  status: "draft" | "scheduled" | "published" | "archived"
  scheduledFor?: Date
  publishedAt?: Date
  metrics?: ContentMetrics
  createdAt: Date
}

export interface ContentMetrics {
  views?: number
  clicks?: number
  conversions?: number
  engagement?: number
  shares?: number
  comments?: number
}

export interface Campaign {
  id: string
  name: string
  type: "email" | "social" | "ads" | "content"
  status: "draft" | "active" | "paused" | "completed"
  budget?: number
  spent?: number
  startDate: Date
  endDate?: Date
  targetAudience?: string[]
  metrics?: CampaignMetrics
}

export interface CampaignMetrics {
  impressions: number
  clicks: number
  conversions: number
  cost: number
  cpc: number
  cpa: number
  roas: number
}

// =============================================================================
// SUPPORT (for SENTINEL)
// =============================================================================

export type TicketStatus = "open" | "pending" | "in_progress" | "resolved" | "closed"
export type TicketPriority = "low" | "medium" | "high" | "urgent"
export type TicketCategory = "inquiry" | "booking" | "complaint" | "damage" | "refund" | "other"

export interface SupportTicket {
  id: string
  customerId: string
  leadId?: string
  bookingId?: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  subject: string
  description: string
  assignedAgent?: AgentCodename
  escalatedTo?: string // Human agent
  resolution?: string
  satisfaction?: number // 1-5
  messages: TicketMessage[]
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
}

export interface TicketMessage {
  id: string
  role: "customer" | "agent" | "system"
  content: string
  agentCodename?: AgentCodename
  timestamp: Date
}

// =============================================================================
// OPERATIONS (for NEXUS)
// =============================================================================

export interface Job {
  id: string
  leadId: string
  customerId: string
  status: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled"
  moveType: string
  
  // Locations
  originAddress: string
  originSuburb: string
  destinationAddress: string
  destinationSuburb: string
  distanceKm?: number
  
  // Timing
  scheduledDate: Date
  estimatedDuration: number // hours
  actualStartTime?: Date
  actualEndTime?: Date
  
  // Resources
  crewAssigned?: string[]
  vehiclesAssigned?: string[]
  equipmentNeeded?: string[]
  
  // Pricing
  quotedAmount: number
  finalAmount?: number
  depositPaid: boolean
  balancePaid: boolean
  
  // Notes
  specialInstructions?: string
  internalNotes?: string
  
  createdAt: Date
  updatedAt: Date
}

export interface CrewMember {
  id: string
  name: string
  role: "driver" | "mover" | "lead" | "specialist"
  certifications: string[]
  availability: AvailabilitySlot[]
  rating?: number
}

export interface Vehicle {
  id: string
  registration: string
  type: "van" | "truck_small" | "truck_medium" | "truck_large"
  capacity: number // cubic meters
  status: "available" | "in_use" | "maintenance"
}

export interface AvailabilitySlot {
  date: Date
  startTime: string
  endTime: string
  booked: boolean
  jobId?: string
}

// =============================================================================
// PRICING (for PRISM)
// =============================================================================

export interface PricingConfig {
  baseRates: {
    [moveType: string]: {
      base: number
      perSqm: number
      minSqm: number
    }
  }
  
  multipliers: {
    demand: number        // 0.8 - 1.5
    leadTime: number      // Based on urgency
    distance: number      // Per km
    complexity: number    // Job difficulty
    timeOfWeek: number    // Weekday vs weekend
    seasonality: number   // Peak periods
    capacity: number      // Available resources
  }
  
  constraints: {
    minMargin: number     // Minimum profit margin
    maxSurge: number      // Maximum price increase
    priceChangeFrequency: "hourly" | "daily" | "weekly"
  }
  
  additionalServices: {
    [service: string]: {
      price: number
      description: string
    }
  }
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

export interface PriceAdjustment {
  type: string
  description: string
  amount: number
  multiplier?: number
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

// =============================================================================
// ANALYTICS (for ORACLE)
// =============================================================================

export interface DashboardMetrics {
  leads: {
    total: number
    new: number
    qualified: number
    converted: number
    conversionRate: number
  }
  
  revenue: {
    pipeline: number
    closed: number
    forecast: number
    growth: number
  }
  
  agents: {
    [codename: string]: AgentPerformance
  }
  
  channels: {
    [channel: string]: ChannelMetrics
  }
  
  period: {
    start: Date
    end: Date
  }
}

export interface AgentPerformance {
  interactions: number
  successRate: number
  avgResponseTime: number
  escalationRate: number
  satisfaction: number
}

export interface ChannelMetrics {
  leads: number
  cost: number
  conversions: number
  revenue: number
  roi: number
}

export interface Insight {
  id: string
  type: "opportunity" | "alert" | "recommendation"
  priority: "low" | "medium" | "high"
  title: string
  description: string
  data?: Record<string, unknown>
  actionable: boolean
  suggestedAction?: string
  createdAt: Date
}

// =============================================================================
// MEMORY & CONTEXT
// =============================================================================

export interface AgentMemory {
  shortTerm: Map<string, unknown>  // Current session
  longTerm: {                       // Persistent storage
    customers: Map<string, CustomerProfile>
    conversations: Map<string, AgentMessage[]>
    insights: Insight[]
  }
  workingMemory: {
    currentTask?: string
    pendingHandoffs: AgentHandoff[]
    activeConversations: string[]
  }
}

export interface ConversationContext {
  conversationId: string
  customerId?: string
  leadId?: string
  channel: "chat" | "email" | "phone" | "sms"
  history: AgentMessage[]
  currentIntent?: string
  extractedEntities: Record<string, unknown>
  sentiment?: "positive" | "neutral" | "negative"
  lastUpdated: Date
}

// =============================================================================
// ESCALATION & HUMAN HANDOFF
// =============================================================================

export type EscalationReason =
  | "negative_sentiment"
  | "damage_claim"
  | "legal_issue"
  | "vip_customer"
  | "high_value_deal"
  | "agent_requested"
  | "customer_requested"
  | "compliance_issue"
  | "complex_negotiation"
  | "technical_issue"

export interface EscalationRequest {
  id: string
  fromAgent: AgentCodename
  reason: EscalationReason
  priority: "low" | "medium" | "high" | "urgent"
  customerId?: string
  leadId?: string
  ticketId?: string
  context: Record<string, unknown>
  summary: string
  suggestedAction?: string
  status: "pending" | "assigned" | "in_progress" | "resolved"
  assignedTo?: string
  createdAt: Date
  resolvedAt?: Date
}

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface AgentConfig {
  codename: AgentCodename
  enabled: boolean
  model: string // LLM model to use
  temperature: number
  maxTokens: number
  systemPrompt: string
  tools: string[]
  triggers: AgentTrigger[]
  escalationRules: EscalationRule[]
  rateLimits: {
    requestsPerMinute: number
    tokensPerDay: number
  }
}

export interface AgentTrigger {
  event: string
  conditions?: Record<string, unknown>
  action: string
  priority: number
}

export interface EscalationRule {
  condition: string
  reason: EscalationReason
  priority: EscalationRequest["priority"]
  autoAssign?: string
}

// =============================================================================
// API & EXTERNAL INTEGRATIONS
// =============================================================================

export interface APIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  metadata?: {
    timestamp: Date
    requestId: string
    processingTime: number
  }
}

export interface WebhookPayload {
  event: string
  timestamp: Date
  data: Record<string, unknown>
  source: string
  signature?: string
}

// =============================================================================
// AUDIT & LOGGING
// =============================================================================

export interface AgentLog {
  id: string
  agentCodename: AgentCodename
  level: "debug" | "info" | "warn" | "error"
  action: string
  message: string
  data?: Record<string, unknown>
  timestamp: Date
}

export interface AuditEntry {
  id: string
  agentCodename: AgentCodename
  action: string
  entityType: string
  entityId: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  userId?: string
  timestamp: Date
}

