/**
 * Agent Database Client
 * Supabase integration for agent conversations, knowledge, and metrics
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"
import type { AgentMessage, AgentContext } from "./types"

// =============================================================================
// DATABASE CLIENT
// =============================================================================

let supabaseClient: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    })
  }
  return supabaseClient
}

// =============================================================================
// CONVERSATION OPERATIONS
// =============================================================================

export interface CreateConversationParams {
  agentCodename: string
  channel?: string
  leadId?: string
  customerId?: string
  metadata?: Record<string, unknown>
}

export async function createConversation(params: CreateConversationParams): Promise<string> {
  const supabase = getSupabase()
  
  const { data, error } = await supabase.rpc("create_agent_conversation", {
    p_agent_codename: params.agentCodename,
    p_channel: params.channel || "web",
    p_lead_id: params.leadId || null,
    p_customer_id: params.customerId || null,
    p_metadata: params.metadata || {},
  })
  
  if (error) {
    console.error("Error creating conversation:", error)
    throw new Error(`Failed to create conversation: ${error.message}`)
  }
  
  return data as string
}

export interface AddMessageParams {
  conversationId: string
  role: "user" | "assistant" | "system" | "tool"
  content: string
  agentCodename?: string
  toolCalls?: Record<string, unknown>[]
  toolResults?: Record<string, unknown>[]
  responseTimeMs?: number
  tokensUsed?: number
}

export async function addMessage(params: AddMessageParams): Promise<string> {
  const supabase = getSupabase()
  
  const { data, error } = await supabase.rpc("add_conversation_message", {
    p_conversation_id: params.conversationId,
    p_role: params.role,
    p_content: params.content,
    p_agent_codename: params.agentCodename || null,
    p_tool_calls: params.toolCalls || null,
    p_tool_results: params.toolResults || null,
    p_response_time_ms: params.responseTimeMs || null,
    p_tokens_used: params.tokensUsed || null,
  })
  
  if (error) {
    console.error("Error adding message:", error)
    throw new Error(`Failed to add message: ${error.message}`)
  }
  
  return data as string
}

export async function endConversation(
  conversationId: string,
  status: string = "ended",
  sentimentScore?: number
): Promise<boolean> {
  const supabase = getSupabase()
  
  const { data, error } = await supabase.rpc("end_conversation", {
    p_conversation_id: conversationId,
    p_status: status,
    p_sentiment_score: sentimentScore || null,
  })
  
  if (error) {
    console.error("Error ending conversation:", error)
    throw new Error(`Failed to end conversation: ${error.message}`)
  }
  
  return data as boolean
}

export async function getConversation(conversationId: string): Promise<any> {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from("agent_conversations")
    .select(`
      *,
      messages:agent_messages(*)
    `)
    .eq("id", conversationId)
    .single()
  
  if (error) {
    console.error("Error fetching conversation:", error)
    throw new Error(`Failed to fetch conversation: ${error.message}`)
  }
  
  return data
}

export async function getActiveConversations(agentCodename?: string): Promise<any[]> {
  const supabase = getSupabase()
  
  let query = supabase
    .from("v_active_conversations")
    .select("*")
    .order("started_at", { ascending: false })
  
  if (agentCodename) {
    query = query.eq("agent_codename", agentCodename)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error("Error fetching active conversations:", error)
    throw new Error(`Failed to fetch active conversations: ${error.message}`)
  }
  
  return data || []
}

// =============================================================================
// ESCALATION OPERATIONS
// =============================================================================

export interface CreateEscalationParams {
  fromAgent: string
  reason: string
  priority?: string
  conversationId?: string
  summary?: string
  context?: Record<string, unknown>
}

export async function createEscalation(params: CreateEscalationParams): Promise<string> {
  const supabase = getSupabase()
  
  const { data, error } = await supabase.rpc("create_escalation", {
    p_from_agent: params.fromAgent,
    p_reason: params.reason,
    p_priority: params.priority || "medium",
    p_conversation_id: params.conversationId || null,
    p_summary: params.summary || null,
    p_context: params.context || {},
  })
  
  if (error) {
    console.error("Error creating escalation:", error)
    throw new Error(`Failed to create escalation: ${error.message}`)
  }
  
  return data as string
}

export async function getEscalationQueue(): Promise<any[]> {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from("v_escalation_queue")
    .select("*")
  
  if (error) {
    console.error("Error fetching escalation queue:", error)
    throw new Error(`Failed to fetch escalation queue: ${error.message}`)
  }
  
  return data || []
}

export async function assignEscalation(escalationId: string, assignedTo: string): Promise<boolean> {
  const supabase = getSupabase()
  
  const { data, error } = await supabase.rpc("assign_escalation", {
    p_escalation_id: escalationId,
    p_assigned_to: assignedTo,
  })
  
  if (error) {
    console.error("Error assigning escalation:", error)
    throw new Error(`Failed to assign escalation: ${error.message}`)
  }
  
  return data as boolean
}

export async function resolveEscalation(
  escalationId: string,
  resolution: string,
  resolvedBy: string,
  notes?: string
): Promise<boolean> {
  const supabase = getSupabase()
  
  const { data, error } = await supabase.rpc("resolve_escalation", {
    p_escalation_id: escalationId,
    p_resolution: resolution,
    p_resolved_by: resolvedBy,
    p_resolution_notes: notes || null,
  })
  
  if (error) {
    console.error("Error resolving escalation:", error)
    throw new Error(`Failed to resolve escalation: ${error.message}`)
  }
  
  return data as boolean
}

// =============================================================================
// KNOWLEDGE BASE OPERATIONS
// =============================================================================

export interface SearchKnowledgeParams {
  query: string
  agentCodename?: string
  knowledgeType?: string
  limit?: number
}

export async function searchKnowledge(params: SearchKnowledgeParams): Promise<any[]> {
  const supabase = getSupabase()
  
  const { data, error } = await supabase.rpc("search_knowledge", {
    p_query_text: params.query,
    p_agent_codename: params.agentCodename || null,
    p_knowledge_type: params.knowledgeType || null,
    p_limit: params.limit || 5,
  })
  
  if (error) {
    console.error("Error searching knowledge:", error)
    throw new Error(`Failed to search knowledge: ${error.message}`)
  }
  
  return data || []
}

export interface AddKnowledgeParams {
  agentCodename?: string
  knowledgeType: string
  category?: string
  title: string
  content: string
  summary?: string
  source?: string
  sourceUrl?: string
  metadata?: Record<string, unknown>
}

export async function addKnowledge(params: AddKnowledgeParams): Promise<string> {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from("agent_knowledge")
    .insert({
      agent_codename: params.agentCodename || null,
      knowledge_type: params.knowledgeType,
      category: params.category || null,
      title: params.title,
      content: params.content,
      summary: params.summary || null,
      source: params.source || null,
      source_url: params.sourceUrl || null,
      metadata: params.metadata || {},
    })
    .select("id")
    .single()
  
  if (error) {
    console.error("Error adding knowledge:", error)
    throw new Error(`Failed to add knowledge: ${error.message}`)
  }
  
  return data.id
}

// =============================================================================
// METRICS OPERATIONS
// =============================================================================

export async function getAgentStats(agentCodename: string, days: number = 30): Promise<any> {
  const supabase = getSupabase()
  
  const { data, error } = await supabase.rpc("get_agent_stats", {
    p_agent_codename: agentCodename,
    p_days: days,
  })
  
  if (error) {
    console.error("Error fetching agent stats:", error)
    throw new Error(`Failed to fetch agent stats: ${error.message}`)
  }
  
  return data
}

export async function getAgentPerformance(): Promise<any[]> {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from("v_agent_performance")
    .select("*")
  
  if (error) {
    console.error("Error fetching agent performance:", error)
    throw new Error(`Failed to fetch agent performance: ${error.message}`)
  }
  
  return data || []
}

export async function getDailyMetrics(agentCodename?: string): Promise<any[]> {
  const supabase = getSupabase()
  
  let query = supabase
    .from("v_daily_metrics")
    .select("*")
    .order("date", { ascending: false })
    .limit(30)
  
  if (agentCodename) {
    query = query.eq("agent_codename", agentCodename)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error("Error fetching daily metrics:", error)
    throw new Error(`Failed to fetch daily metrics: ${error.message}`)
  }
  
  return data || []
}

// =============================================================================
// QA OPERATIONS
// =============================================================================

export interface RecordQAAuditParams {
  conversationId?: string
  agentCodename: string
  accuracyScore: number
  toneScore: number
  complianceScore: number
  completenessScore: number
  empathyScore: number
  issues?: Record<string, unknown>[]
  recommendations?: string[]
  notes?: string
  auditedBy?: string
}

export async function recordQAAudit(params: RecordQAAuditParams): Promise<string> {
  const supabase = getSupabase()
  
  const { data, error } = await supabase.rpc("record_qa_audit", {
    p_conversation_id: params.conversationId || null,
    p_agent_codename: params.agentCodename,
    p_accuracy_score: params.accuracyScore,
    p_tone_score: params.toneScore,
    p_compliance_score: params.complianceScore,
    p_completeness_score: params.completenessScore,
    p_empathy_score: params.empathyScore,
    p_issues: params.issues || [],
    p_recommendations: params.recommendations || [],
    p_notes: params.notes || null,
    p_audited_by: params.auditedBy || "GUARDIAN_QA",
  })
  
  if (error) {
    console.error("Error recording QA audit:", error)
    throw new Error(`Failed to record QA audit: ${error.message}`)
  }
  
  return data as string
}

export async function getQADashboard(): Promise<any[]> {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from("v_qa_dashboard")
    .select("*")
  
  if (error) {
    console.error("Error fetching QA dashboard:", error)
    throw new Error(`Failed to fetch QA dashboard: ${error.message}`)
  }
  
  return data || []
}

// =============================================================================
// AUDIT LOG OPERATIONS
// =============================================================================

export interface AuditLogParams {
  agentCodename?: string
  action: string
  resourceType: string
  resourceId?: string
  details?: Record<string, unknown>
  outcome: "success" | "failure" | "denied"
  errorMessage?: string
}

export async function logAudit(params: AuditLogParams): Promise<void> {
  const supabase = getSupabase()
  
  const { error } = await supabase
    .from("agent_audit_log")
    .insert({
      agent_codename: params.agentCodename || null,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId || null,
      details: params.details || {},
      outcome: params.outcome,
      error_message: params.errorMessage || null,
    })
  
  if (error) {
    console.error("Error logging audit:", error)
    // Don't throw - audit logging should not break the main flow
  }
}

export async function getAuditLog(
  filters?: {
    agentCodename?: string
    action?: string
    resourceType?: string
    limit?: number
  }
): Promise<any[]> {
  const supabase = getSupabase()
  
  let query = supabase
    .from("agent_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filters?.limit || 100)
  
  if (filters?.agentCodename) {
    query = query.eq("agent_codename", filters.agentCodename)
  }
  if (filters?.action) {
    query = query.eq("action", filters.action)
  }
  if (filters?.resourceType) {
    query = query.eq("resource_type", filters.resourceType)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error("Error fetching audit log:", error)
    throw new Error(`Failed to fetch audit log: ${error.message}`)
  }
  
  return data || []
}

