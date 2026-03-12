/**
 * Bridge Agent Database Layer
 * Handles escalations, callbacks, and human agent management
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

// =============================================================================
// HUMAN AGENTS
// =============================================================================

export interface HumanAgent {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  skills: string[]
  status: string
  max_concurrent: number
  current_load: number
  slack_user_id?: string
  last_active_at?: string
}

export async function getAvailableAgents(options?: {
  skill?: string
  priority?: string
}): Promise<HumanAgent[]> {
  const supabase = getSupabase()

  let query = supabase
    .from("human_agents")
    .select("*")
    .eq("status", "available")
    .lt("current_load", supabase.rpc("get_max_concurrent"))

  if (options?.skill) {
    query = query.contains("skills", [options.skill])
  }

  const { data, error } = await query.order("current_load", { ascending: true })

  if (error) {
    console.error("Error getting available agents:", error)
    // Fallback to simpler query
    const { data: fallbackData } = await supabase.from("human_agents").select("*").eq("status", "available")
    return fallbackData || []
  }

  // For urgent priority, also include managers even if busy
  if (options?.priority === "urgent") {
    const { data: managers } = await supabase.from("human_agents").select("*").eq("role", "manager")

    if (managers) {
      const existingIds = new Set((data || []).map((a) => a.id))
      managers.forEach((m) => {
        if (!existingIds.has(m.id)) {
          data?.push(m)
        }
      })
    }
  }

  return data || []
}

export async function getAgentById(agentId: string): Promise<HumanAgent | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase.from("human_agents").select("*").eq("id", agentId).single()

  if (error) return null
  return data
}

export async function updateAgentStatus(agentId: string, status: string): Promise<void> {
  const supabase = getSupabase()

  await supabase
    .from("human_agents")
    .update({
      status,
      last_active_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentId)
}

export async function incrementAgentLoad(agentId: string): Promise<void> {
  const supabase = getSupabase()

  const { data: agent } = await supabase
    .from("human_agents")
    .select("current_load, max_concurrent")
    .eq("id", agentId)
    .single()

  if (agent) {
    const newLoad = (agent.current_load || 0) + 1
    await supabase
      .from("human_agents")
      .update({
        current_load: newLoad,
        status: newLoad >= agent.max_concurrent ? "busy" : "available",
        updated_at: new Date().toISOString(),
      })
      .eq("id", agentId)
  }
}

export async function decrementAgentLoad(agentId: string): Promise<void> {
  const supabase = getSupabase()

  const { data: agent } = await supabase.from("human_agents").select("current_load").eq("id", agentId).single()

  if (agent) {
    const newLoad = Math.max(0, (agent.current_load || 0) - 1)
    await supabase
      .from("human_agents")
      .update({
        current_load: newLoad,
        status: "available",
        updated_at: new Date().toISOString(),
      })
      .eq("id", agentId)
  }
}

// =============================================================================
// ESCALATIONS
// =============================================================================

export interface Escalation {
  id: string
  ticket_number: string
  from_agent: string
  reason: string
  priority: string
  status: string
  customer_email?: string
  customer_name?: string
  customer_phone?: string
  conversation_id?: string
  conversation_summary?: string
  context: Record<string, unknown>
  assigned_to?: string
  assigned_at?: string
  first_response_at?: string
  resolved_at?: string
  resolution?: string
  outcome?: string
  time_to_assign_ms?: number
  time_to_respond_ms?: number
  time_to_resolve_ms?: number
  sla_breached: boolean
  created_at: string
}

export async function createEscalation(data: {
  from_agent: string
  reason: string
  priority: string
  customer_email?: string
  customer_name?: string
  customer_phone?: string
  conversation_id?: string
  conversation_summary?: string
  context?: Record<string, unknown>
}): Promise<Escalation | null> {
  const supabase = getSupabase()

  const ticketNumber = `ESC-${Date.now().toString(36).toUpperCase()}`

  const { data: escalation, error } = await supabase
    .from("escalations")
    .insert({
      ticket_number: ticketNumber,
      from_agent: data.from_agent,
      reason: data.reason,
      priority: data.priority,
      status: "pending",
      customer_email: data.customer_email,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      conversation_id: data.conversation_id,
      conversation_summary: data.conversation_summary,
      context: data.context || {},
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating escalation:", error)
    return null
  }

  // Log to history
  await logEscalationHistory(escalation.id, "created", null, "pending", data.from_agent)

  return escalation
}

export async function getEscalationById(escalationId: string): Promise<Escalation | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase.from("escalations").select("*").eq("id", escalationId).single()

  if (error) return null
  return data
}

export async function getPendingEscalations(): Promise<Escalation[]> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("escalations")
    .select("*")
    .in("status", ["pending", "assigned"])
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error getting pending escalations:", error)
    return []
  }

  return data || []
}

export async function assignEscalation(
  escalationId: string,
  agentId: string,
  notes?: string,
): Promise<Escalation | null> {
  const supabase = getSupabase()

  const { data: escalation } = await supabase
    .from("escalations")
    .select("created_at, status")
    .eq("id", escalationId)
    .single()

  if (!escalation) return null

  const now = new Date()
  const createdAt = new Date(escalation.created_at)
  const timeToAssign = now.getTime() - createdAt.getTime()

  const { data, error } = await supabase
    .from("escalations")
    .update({
      assigned_to: agentId,
      assigned_at: now.toISOString(),
      status: "assigned",
      time_to_assign_ms: timeToAssign,
      updated_at: now.toISOString(),
    })
    .eq("id", escalationId)
    .select()
    .single()

  if (error) {
    console.error("Error assigning escalation:", error)
    return null
  }

  // Increment agent load
  await incrementAgentLoad(agentId)

  // Log to history
  await logEscalationHistory(
    escalationId,
    "assigned",
    escalation.status,
    "assigned",
    "system",
    notes,
    undefined,
    agentId,
  )

  return data
}

export async function resolveEscalation(
  escalationId: string,
  resolution: string,
  outcome: string,
): Promise<Escalation | null> {
  const supabase = getSupabase()

  const { data: escalation } = await supabase
    .from("escalations")
    .select("created_at, assigned_to, status")
    .eq("id", escalationId)
    .single()

  if (!escalation) return null

  const now = new Date()
  const createdAt = new Date(escalation.created_at)
  const timeToResolve = now.getTime() - createdAt.getTime()

  const { data, error } = await supabase
    .from("escalations")
    .update({
      status: outcome,
      resolution,
      outcome,
      resolved_at: now.toISOString(),
      time_to_resolve_ms: timeToResolve,
      updated_at: now.toISOString(),
    })
    .eq("id", escalationId)
    .select()
    .single()

  if (error) {
    console.error("Error resolving escalation:", error)
    return null
  }

  // Decrement agent load
  if (escalation.assigned_to) {
    await decrementAgentLoad(escalation.assigned_to)
  }

  // Log to history
  await logEscalationHistory(escalationId, "resolved", escalation.status, outcome, "system", resolution)

  return data
}

export async function getEscalationStats(): Promise<{
  total: number
  pending: number
  assigned: number
  resolved: number
  avgTimeToAssign: number
  avgTimeToResolve: number
  byPriority: Record<string, number>
}> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("escalations")
    .select("status, priority, time_to_assign_ms, time_to_resolve_ms")

  if (error || !data) {
    return {
      total: 0,
      pending: 0,
      assigned: 0,
      resolved: 0,
      avgTimeToAssign: 0,
      avgTimeToResolve: 0,
      byPriority: {},
    }
  }

  const pending = data.filter((d) => d.status === "pending").length
  const assigned = data.filter((d) => d.status === "assigned").length
  const resolved = data.filter((d) => d.status === "resolved").length

  const assignTimes = data.filter((d) => d.time_to_assign_ms).map((d) => d.time_to_assign_ms!)
  const resolveTimes = data.filter((d) => d.time_to_resolve_ms).map((d) => d.time_to_resolve_ms!)

  const avgTimeToAssign =
    assignTimes.length > 0 ? Math.round(assignTimes.reduce((a, b) => a + b, 0) / assignTimes.length / 60000) : 0

  const avgTimeToResolve =
    resolveTimes.length > 0 ? Math.round(resolveTimes.reduce((a, b) => a + b, 0) / resolveTimes.length / 60000) : 0

  const byPriority: Record<string, number> = {}
  data.forEach((d) => {
    byPriority[d.priority] = (byPriority[d.priority] || 0) + 1
  })

  return {
    total: data.length,
    pending,
    assigned,
    resolved,
    avgTimeToAssign,
    avgTimeToResolve,
    byPriority,
  }
}

// =============================================================================
// CALLBACKS
// =============================================================================

export interface Callback {
  id: string
  ticket_number: string
  customer_email?: string
  customer_name?: string
  phone: string
  preferred_time?: string
  scheduled_for?: string
  reason: string
  priority: string
  status: string
  assigned_to?: string
  attempt_count: number
  outcome?: string
  notes?: string
  created_at: string
}

export async function scheduleCallback(data: {
  customer_email?: string
  customer_name?: string
  phone: string
  preferred_time?: string
  reason: string
  priority?: string
  assigned_to?: string
  related_escalation_id?: string
}): Promise<Callback | null> {
  const supabase = getSupabase()

  const ticketNumber = `CB-${Date.now().toString(36).toUpperCase()}`

  // Calculate scheduled time
  let scheduledFor: Date
  if (data.preferred_time && data.preferred_time !== "next_available") {
    scheduledFor = new Date(data.preferred_time)
  } else {
    scheduledFor = new Date()
    scheduledFor.setMinutes(scheduledFor.getMinutes() + 30)
  }

  const { data: callback, error } = await supabase
    .from("callbacks")
    .insert({
      ticket_number: ticketNumber,
      customer_email: data.customer_email,
      customer_name: data.customer_name,
      phone: data.phone,
      preferred_time: data.preferred_time ? new Date(data.preferred_time).toISOString() : null,
      scheduled_for: scheduledFor.toISOString(),
      reason: data.reason,
      priority: data.priority || "normal",
      status: "scheduled",
      assigned_to: data.assigned_to,
      related_escalation_id: data.related_escalation_id,
    })
    .select()
    .single()

  if (error) {
    console.error("Error scheduling callback:", error)
    return null
  }

  return callback
}

export async function getCallbackById(callbackId: string): Promise<Callback | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase.from("callbacks").select("*").eq("id", callbackId).single()

  if (error) return null
  return data
}

export async function getPendingCallbacks(): Promise<Callback[]> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("callbacks")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })

  if (error) {
    console.error("Error getting pending callbacks:", error)
    return []
  }

  return data || []
}

export async function completeCallback(callbackId: string, outcome: string, notes?: string): Promise<Callback | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("callbacks")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      outcome,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", callbackId)
    .select()
    .single()

  if (error) {
    console.error("Error completing callback:", error)
    return null
  }

  return data
}

export async function recordCallbackAttempt(callbackId: string, success: boolean, notes?: string): Promise<void> {
  const supabase = getSupabase()

  const { data: callback } = await supabase
    .from("callbacks")
    .select("attempt_count, max_attempts")
    .eq("id", callbackId)
    .single()

  if (!callback) return

  const newAttemptCount = (callback.attempt_count || 0) + 1
  const maxAttempts = callback.max_attempts || 3

  await supabase
    .from("callbacks")
    .update({
      attempt_count: newAttemptCount,
      attempted_at: new Date().toISOString(),
      status: success ? "completed" : newAttemptCount >= maxAttempts ? "failed" : "scheduled",
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", callbackId)
}

// =============================================================================
// NOTIFICATIONS
// =============================================================================

export async function createNotification(data: {
  agent_id: string
  type: string
  channel: string
  urgency: string
  title: string
  message: string
  related_escalation_id?: string
  related_callback_id?: string
}): Promise<{ id: string; status: string } | null> {
  const supabase = getSupabase()

  const { data: notification, error } = await supabase
    .from("agent_notifications")
    .insert({
      agent_id: data.agent_id,
      type: data.type,
      channel: data.channel,
      urgency: data.urgency,
      title: data.title,
      message: data.message,
      related_escalation_id: data.related_escalation_id,
      related_callback_id: data.related_callback_id,
      status: "pending",
    })
    .select("id, status")
    .single()

  if (error) {
    console.error("Error creating notification:", error)
    return null
  }

  return notification
}

export async function markNotificationSent(notificationId: string): Promise<void> {
  const supabase = getSupabase()

  await supabase
    .from("agent_notifications")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const supabase = getSupabase()

  await supabase
    .from("agent_notifications")
    .update({
      status: "read",
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
}

// =============================================================================
// ESCALATION HISTORY
// =============================================================================

async function logEscalationHistory(
  escalationId: string,
  action: string,
  oldStatus: string | null,
  newStatus: string,
  performedBy: string,
  notes?: string,
  oldAssignee?: string,
  newAssignee?: string,
): Promise<void> {
  const supabase = getSupabase()

  await supabase.from("escalation_history").insert({
    escalation_id: escalationId,
    action,
    old_status: oldStatus,
    new_status: newStatus,
    performed_by: performedBy,
    notes,
    old_assignee: oldAssignee,
    new_assignee: newAssignee,
  })
}

// =============================================================================
// SLA CONFIG
// =============================================================================

export async function getSLAConfig(priority: string): Promise<{
  first_response_minutes: number
  resolution_minutes: number
  escalation_minutes: number
} | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("sla_config")
    .select("first_response_minutes, resolution_minutes, escalation_minutes")
    .eq("priority", priority)
    .single()

  if (error) return null
  return data
}

export async function checkSLABreach(escalationId: string): Promise<boolean> {
  const supabase = getSupabase()

  const { data: escalation } = await supabase
    .from("escalations")
    .select("created_at, priority, first_response_at")
    .eq("id", escalationId)
    .single()

  if (!escalation) return false

  const sla = await getSLAConfig(escalation.priority)
  if (!sla) return false

  const now = new Date()
  const createdAt = new Date(escalation.created_at)
  const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / 60000

  // Check first response SLA
  if (!escalation.first_response_at && minutesSinceCreation > sla.first_response_minutes) {
    await supabase
      .from("escalations")
      .update({ sla_breached: true, updated_at: now.toISOString() })
      .eq("id", escalationId)
    return true
  }

  return false
}
