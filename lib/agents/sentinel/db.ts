import { createClient } from "@/lib/supabase/server"

// Types
export interface BookingLookupResult {
  id: string
  status: string
  contact_name: string
  email: string
  phone: string
  move_type: string
  origin_suburb: string
  destination_suburb: string
  scheduled_date: string | null
  target_move_date: string | null
  estimated_total: number | null
  deposit_paid: boolean
  deposit_amount: number | null
  special_requirements: string[] | null
  created_at: string
}

export interface TicketCreateParams {
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  customer_id?: string
  booking_id?: string
  category: "inquiry" | "booking" | "complaint" | "damage" | "refund" | "billing" | "other"
  priority?: "low" | "medium" | "high" | "urgent"
  subject: string
  description: string
  conversation_id?: string
  tags?: string[]
}

export interface TicketUpdateParams {
  ticket_id: string
  status?: "open" | "pending" | "in_progress" | "waiting_customer" | "resolved" | "closed"
  resolution?: string
  resolution_type?: "resolved" | "refunded" | "compensated" | "escalated" | "no_action" | "duplicate"
  internal_notes?: string
  escalated_to?: string
  escalation_reason?: string
  follow_up_date?: string
  follow_up_channel?: "email" | "phone" | "sms"
  follow_up_notes?: string
  compensation_type?: "discount" | "refund" | "credit" | "service" | "none"
  compensation_amount?: number
  compensation_approved?: boolean
}

export interface TicketMessageParams {
  ticket_id: string
  sender_type: "customer" | "agent" | "system"
  sender_name?: string
  message: string
}

// Database functions for Sentinel Agent
export class SentinelDB {
  /**
   * Look up a booking by ID, email, or phone
   */
  static async getBooking(params: {
    bookingId?: string
    email?: string
    phone?: string
  }): Promise<BookingLookupResult | null> {
    const supabase = await createClient()

    let query = supabase.from("leads").select(`
      id,
      status,
      contact_name,
      email,
      phone,
      move_type,
      origin_suburb,
      destination_suburb,
      scheduled_date,
      target_move_date,
      estimated_total,
      deposit_paid,
      deposit_amount,
      special_requirements,
      created_at
    `)

    if (params.bookingId) {
      query = query.eq("id", params.bookingId)
    } else if (params.email) {
      query = query.eq("email", params.email.toLowerCase())
    } else if (params.phone) {
      query = query.eq("phone", params.phone)
    } else {
      return null
    }

    const { data, error } = await query.single()

    if (error || !data) {
      return null
    }

    return data as BookingLookupResult
  }

  /**
   * Get all bookings for a customer
   */
  static async getCustomerBookings(email: string): Promise<BookingLookupResult[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("leads")
      .select(`
        id,
        status,
        contact_name,
        email,
        phone,
        move_type,
        origin_suburb,
        destination_suburb,
        scheduled_date,
        target_move_date,
        estimated_total,
        deposit_paid,
        deposit_amount,
        special_requirements,
        created_at
      `)
      .eq("email", email.toLowerCase())
      .order("created_at", { ascending: false })

    if (error || !data) {
      return []
    }

    return data as BookingLookupResult[]
  }

  /**
   * Update a booking (reschedule, cancel, etc.)
   */
  static async updateBooking(
    bookingId: string,
    updates: {
      status?: string
      scheduled_date?: string
      internal_notes?: string
    },
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    const { error } = await supabase
      .from("leads")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  /**
   * Create a support ticket
   */
  static async createTicket(params: TicketCreateParams): Promise<{
    success: boolean
    ticketId?: string
    ticketNumber?: string
    error?: string
  }> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        customer_name: params.customer_name,
        customer_email: params.customer_email?.toLowerCase(),
        customer_phone: params.customer_phone,
        customer_id: params.customer_id,
        booking_id: params.booking_id,
        category: params.category,
        priority: params.priority || "medium",
        subject: params.subject,
        description: params.description,
        conversation_id: params.conversation_id,
        tags: params.tags,
        status: "open",
        assigned_agent: "SENTINEL_CS",
      })
      .select("id, ticket_number")
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      ticketId: data.id,
      ticketNumber: data.ticket_number,
    }
  }

  /**
   * Update a support ticket
   */
  static async updateTicket(params: TicketUpdateParams): Promise<{
    success: boolean
    error?: string
  }> {
    const supabase = await createClient()

    const updates: Record<string, unknown> = {}

    if (params.status) {
      updates.status = params.status
      if (params.status === "resolved") {
        updates.resolved_at = new Date().toISOString()
      }
      if (params.status === "closed") {
        updates.closed_at = new Date().toISOString()
      }
    }

    if (params.resolution) updates.resolution = params.resolution
    if (params.resolution_type) updates.resolution_type = params.resolution_type
    if (params.internal_notes) updates.internal_notes = params.internal_notes
    if (params.escalated_to) updates.escalated_to = params.escalated_to
    if (params.escalation_reason) updates.escalation_reason = params.escalation_reason
    if (params.follow_up_date) updates.follow_up_date = params.follow_up_date
    if (params.follow_up_channel) updates.follow_up_channel = params.follow_up_channel
    if (params.follow_up_notes) updates.follow_up_notes = params.follow_up_notes
    if (params.compensation_type) updates.compensation_type = params.compensation_type
    if (params.compensation_amount !== undefined) updates.compensation_amount = params.compensation_amount
    if (params.compensation_approved !== undefined) updates.compensation_approved = params.compensation_approved

    const { error } = await supabase.from("support_tickets").update(updates).eq("id", params.ticket_id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  /**
   * Add a message to a ticket
   */
  static async addTicketMessage(params: TicketMessageParams): Promise<{
    success: boolean
    messageId?: string
    error?: string
  }> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("ticket_messages")
      .insert({
        ticket_id: params.ticket_id,
        sender_type: params.sender_type,
        sender_name: params.sender_name,
        message: params.message,
      })
      .select("id")
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data.id }
  }

  /**
   * Get ticket with messages
   */
  static async getTicket(ticketId: string): Promise<{
    ticket: unknown
    messages: unknown[]
  } | null> {
    const supabase = await createClient()

    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", ticketId)
      .single()

    if (ticketError || !ticket) {
      return null
    }

    const { data: messages } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true })

    return {
      ticket,
      messages: messages || [],
    }
  }

  /**
   * Get tickets needing follow-up today
   */
  static async getTicketsNeedingFollowUp(): Promise<unknown[]> {
    const supabase = await createClient()
    const today = new Date().toISOString().split("T")[0]

    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .lte("follow_up_date", today)
      .in("status", ["open", "pending", "in_progress", "waiting_customer"])
      .order("follow_up_date", { ascending: true })

    return data || []
  }

  /**
   * Get open tickets by priority
   */
  static async getOpenTicketsByPriority(): Promise<{
    urgent: number
    high: number
    medium: number
    low: number
  }> {
    const supabase = await createClient()

    const priorities = ["urgent", "high", "medium", "low"] as const
    const counts: Record<string, number> = {}

    for (const priority of priorities) {
      const { count } = await supabase
        .from("support_tickets")
        .select("*", { count: "exact", head: true })
        .eq("priority", priority)
        .in("status", ["open", "pending", "in_progress"])

      counts[priority] = count || 0
    }

    return counts as { urgent: number; high: number; medium: number; low: number }
  }

  /**
   * Record CSAT score
   */
  static async recordCSAT(
    ticketId: string,
    score: number,
    feedback?: string,
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    const { error } = await supabase
      .from("support_tickets")
      .update({
        csat_score: score,
        csat_feedback: feedback,
      })
      .eq("id", ticketId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }
}
