/**
 * Support Ticket System
 * Used by Sentinel agent for customer service ticket management
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"

let supabaseClient: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    supabaseClient = createClient(url, key, { auth: { persistSession: false } })
  }
  return supabaseClient
}

export type TicketCategory = "booking" | "billing" | "damage" | "complaint" | "general" | "reschedule" | "cancellation"
export type TicketPriority = "low" | "medium" | "high" | "urgent"
export type TicketStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed"

export interface CreateTicketParams {
  subject: string
  description?: string
  category: TicketCategory
  priority?: TicketPriority
  customerId?: string
  leadId?: string
}

export async function createTicket(params: CreateTicketParams): Promise<{ id: string }> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("support_tickets")
    .insert({
      subject: params.subject,
      description: params.description || null,
      category: params.category,
      priority: params.priority || "medium",
      customer_id: params.customerId || null,
      lead_id: params.leadId || null,
      status: "open",
      agent_codename: "SENTINEL_CS",
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(`Failed to create ticket: ${error.message}`)
  }

  return { id: data.id }
}

export async function resolveTicket(ticketId: string, resolution: string): Promise<void> {
  const supabase = getSupabase()

  const { error } = await supabase
    .from("support_tickets")
    .update({
      status: "resolved",
      resolution,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId)

  if (error) {
    throw new Error(`Failed to resolve ticket: ${error.message}`)
  }
}

export async function getOpenTickets(): Promise<any[]> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to get open tickets: ${error.message}`)
  }

  return data || []
}
