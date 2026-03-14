import { createClient } from "@/lib/supabase/server"

// =============================================================================
// TYPES
// =============================================================================

export interface Prospect {
  id: string
  company_name: string
  abn?: string
  website?: string
  industry?: string
  employee_count?: string
  estimated_revenue?: string
  headquarters?: string
  linkedin_url?: string
  contact_name?: string
  contact_title?: string
  contact_email?: string
  contact_phone?: string
  contact_linkedin?: string
  source: string
  source_detail?: string
  source_listing_id?: string
  score: number
  score_breakdown: Record<string, number>
  qualified: boolean
  qualification_date?: string
  status: ProspectStatus
  signals: IntentSignal[]
  enriched_data: Record<string, unknown>
  enriched_at?: string
  decision_makers: DecisionMaker[]
  last_contacted_at?: string
  next_follow_up_date?: string
  follow_up_action?: string
  follow_up_notes?: string
  current_sequence?: string
  current_sequence_step: number
  sequence_started_at?: string
  converted_lead_id?: string
  conversion_date?: string
  lost_reason?: string
  assigned_agent: string
  internal_notes?: string
  tags: string[]
  created_at: string
  updated_at: string
}

export type ProspectStatus =
  | "new"
  | "enriched"
  | "qualified"
  | "contacted"
  | "engaged"
  | "meeting_scheduled"
  | "proposal_sent"
  | "converted"
  | "lost"
  | "nurture"

export interface DecisionMaker {
  name: string
  title: string
  email?: string
  phone?: string
  linkedin?: string
  confidence: number
}

export interface IntentSignal {
  id: string
  type: IntentSignalType
  confidence: number
  source: string
  source_url?: string
  company_name?: string
  timing: "immediate" | "near_term" | "future" | "unknown"
  details: Record<string, unknown>
  detected_at: string
}

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

export interface OutreachEntry {
  id: string
  prospect_id: string
  channel: "email" | "linkedin" | "call" | "sms"
  outreach_type: string
  template_id?: string
  sequence_name?: string
  sequence_step?: number
  subject?: string
  message_content?: string
  personalization_data: Record<string, unknown>
  status: OutreachStatus
  sent_at?: string
  delivered_at?: string
  opened_at?: string
  clicked_at?: string
  replied_at?: string
  response_content?: string
  response_sentiment?: "positive" | "neutral" | "negative"
  error_message?: string
  retry_count: number
  external_message_id?: string
  created_at: string
  updated_at: string
}

export type OutreachStatus =
  | "scheduled"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "replied"
  | "bounced"
  | "failed"
  | "cancelled"

export interface EmailTemplate {
  id: string
  name: string
  category: string
  subject: string
  body: string
  required_fields: string[]
  optional_fields: string[]
  send_count: number
  open_count: number
  click_count: number
  reply_count: number
  is_active: boolean
}

export interface CreateProspectParams {
  company_name: string
  abn?: string
  website?: string
  industry?: string
  employee_count?: string
  headquarters?: string
  linkedin_url?: string
  contact_name?: string
  contact_title?: string
  contact_email?: string
  contact_phone?: string
  contact_linkedin?: string
  source: string
  source_detail?: string
  source_listing_id?: string
  signals?: IntentSignal[]
  enriched_data?: Record<string, unknown>
  decision_makers?: DecisionMaker[]
  tags?: string[]
}

export interface UpdateProspectParams {
  prospect_id: string
  status?: ProspectStatus
  score?: number
  score_breakdown?: Record<string, number>
  qualified?: boolean
  enriched_data?: Record<string, unknown>
  decision_makers?: DecisionMaker[]
  signals?: IntentSignal[]
  next_follow_up_date?: string
  follow_up_action?: string
  follow_up_notes?: string
  current_sequence?: string
  current_sequence_step?: number
  internal_notes?: string
  lost_reason?: string
  tags?: string[]
}

export interface CreateOutreachParams {
  prospect_id: string
  channel: "email" | "linkedin" | "call" | "sms"
  outreach_type: string
  template_id?: string
  sequence_name?: string
  sequence_step?: number
  subject?: string
  message_content?: string
  personalization_data?: Record<string, unknown>
  scheduled_for?: string
}

// =============================================================================
// DATABASE FUNCTIONS
// =============================================================================

export class HunterDB {
  /**
   * Create a new prospect
   */
  static async createProspect(params: CreateProspectParams): Promise<{
    success: boolean
    prospectId?: string
    error?: string
  }> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("prospects")
      .insert({
        company_name: params.company_name,
        abn: params.abn,
        website: params.website,
        industry: params.industry,
        employee_count: params.employee_count,
        headquarters: params.headquarters,
        linkedin_url: params.linkedin_url,
        contact_name: params.contact_name,
        contact_title: params.contact_title,
        contact_email: params.contact_email?.toLowerCase(),
        contact_phone: params.contact_phone,
        contact_linkedin: params.contact_linkedin,
        source: params.source,
        source_detail: params.source_detail,
        source_listing_id: params.source_listing_id,
        signals: params.signals || [],
        enriched_data: params.enriched_data || {},
        decision_makers: params.decision_makers || [],
        tags: params.tags || [],
        status: "new",
        score: 0,
        assigned_agent: "HUNTER_LG",
      })
      .select("id")
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, prospectId: data.id }
  }

  /**
   * Get prospect by ID
   */
  static async getProspect(prospectId: string): Promise<Prospect | null> {
    const supabase = await createClient()

    const { data, error } = await supabase.from("prospects").select("*").eq("id", prospectId).single()

    if (error || !data) {
      return null
    }

    return data as Prospect
  }

  /**
   * Find prospect by company name or email
   */
  static async findProspect(params: {
    company_name?: string
    email?: string
    source_listing_id?: string
  }): Promise<Prospect | null> {
    const supabase = await createClient()

    let query = supabase.from("prospects").select("*")

    if (params.source_listing_id) {
      query = query.eq("source_listing_id", params.source_listing_id)
    } else if (params.email) {
      query = query.eq("contact_email", params.email.toLowerCase())
    } else if (params.company_name) {
      query = query.ilike("company_name", params.company_name)
    } else {
      return null
    }

    const { data, error } = await query.single()

    if (error || !data) {
      return null
    }

    return data as Prospect
  }

  /**
   * Update prospect
   */
  static async updateProspect(params: UpdateProspectParams): Promise<{
    success: boolean
    error?: string
  }> {
    const supabase = await createClient()

    const updates: Record<string, unknown> = {}

    if (params.status) {
      updates.status = params.status
      if (params.status === "qualified") {
        updates.qualified = true
        updates.qualification_date = new Date().toISOString()
      }
    }
    if (params.score !== undefined) updates.score = params.score
    if (params.score_breakdown) updates.score_breakdown = params.score_breakdown
    if (params.qualified !== undefined) updates.qualified = params.qualified
    if (params.enriched_data) {
      updates.enriched_data = params.enriched_data
      updates.enriched_at = new Date().toISOString()
    }
    if (params.decision_makers) updates.decision_makers = params.decision_makers
    if (params.signals) updates.signals = params.signals
    if (params.next_follow_up_date) updates.next_follow_up_date = params.next_follow_up_date
    if (params.follow_up_action) updates.follow_up_action = params.follow_up_action
    if (params.follow_up_notes) updates.follow_up_notes = params.follow_up_notes
    if (params.current_sequence) updates.current_sequence = params.current_sequence
    if (params.current_sequence_step !== undefined) updates.current_sequence_step = params.current_sequence_step
    if (params.internal_notes) updates.internal_notes = params.internal_notes
    if (params.lost_reason) updates.lost_reason = params.lost_reason
    if (params.tags) updates.tags = params.tags

    const { error } = await supabase.from("prospects").update(updates).eq("id", params.prospect_id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  /**
   * Add intent signal to prospect
   */
  static async addSignalToProspect(
    prospectId: string,
    signal: Omit<IntentSignal, "id" | "detected_at">,
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    // Get current signals
    const { data: prospect, error: fetchError } = await supabase
      .from("prospects")
      .select("signals")
      .eq("id", prospectId)
      .single()

    if (fetchError || !prospect) {
      return { success: false, error: "Prospect not found" }
    }

    const newSignal: IntentSignal = {
      ...signal,
      id: crypto.randomUUID(),
      detected_at: new Date().toISOString(),
    }

    const updatedSignals = [...((prospect.signals as IntentSignal[]) || []), newSignal]

    const { error } = await supabase.from("prospects").update({ signals: updatedSignals }).eq("id", prospectId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  /**
   * Record outreach attempt
   */
  static async recordOutreach(params: CreateOutreachParams): Promise<{
    success: boolean
    outreachId?: string
    error?: string
  }> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("outreach_history")
      .insert({
        prospect_id: params.prospect_id,
        channel: params.channel,
        outreach_type: params.outreach_type,
        template_id: params.template_id,
        sequence_name: params.sequence_name,
        sequence_step: params.sequence_step,
        subject: params.subject,
        message_content: params.message_content,
        personalization_data: params.personalization_data || {},
        status: params.scheduled_for ? "scheduled" : "sent",
        sent_at: params.scheduled_for || new Date().toISOString(),
      })
      .select("id")
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Update prospect's last contacted time
    await supabase
      .from("prospects")
      .update({
        last_contacted_at: new Date().toISOString(),
        status: "contacted",
      })
      .eq("id", params.prospect_id)

    return { success: true, outreachId: data.id }
  }

  /**
   * Update outreach status (e.g., opened, clicked, replied)
   */
  static async updateOutreachStatus(
    outreachId: string,
    status: OutreachStatus,
    additionalData?: {
      response_content?: string
      response_sentiment?: "positive" | "neutral" | "negative"
    },
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    const updates: Record<string, unknown> = { status }

    // Set appropriate timestamp based on status
    const now = new Date().toISOString()
    switch (status) {
      case "delivered":
        updates.delivered_at = now
        break
      case "opened":
        updates.opened_at = now
        break
      case "clicked":
        updates.clicked_at = now
        break
      case "replied":
        updates.replied_at = now
        if (additionalData?.response_content) {
          updates.response_content = additionalData.response_content
        }
        if (additionalData?.response_sentiment) {
          updates.response_sentiment = additionalData.response_sentiment
        }
        break
    }

    const { error } = await supabase.from("outreach_history").update(updates).eq("id", outreachId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  /**
   * Get outreach history for prospect
   */
  static async getOutreachHistory(prospectId: string): Promise<OutreachEntry[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("outreach_history")
      .select("*")
      .eq("prospect_id", prospectId)
      .order("created_at", { ascending: false })

    if (error || !data) {
      return []
    }

    return data as OutreachEntry[]
  }

  /**
   * Get qualified prospects ready for outreach
   */
  static async getQualifiedProspects(limit = 20): Promise<Prospect[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("prospects")
      .select("*")
      .eq("qualified", true)
      .in("status", ["qualified", "enriched"])
      .order("score", { ascending: false })
      .limit(limit)

    if (error || !data) {
      return []
    }

    return data as Prospect[]
  }

  /**
   * Get prospects needing follow-up today
   */
  static async getProspectsNeedingFollowUp(): Promise<Prospect[]> {
    const supabase = await createClient()
    const today = new Date().toISOString().split("T")[0]

    const { data, error } = await supabase
      .from("prospects")
      .select("*")
      .lte("next_follow_up_date", today)
      .in("status", ["contacted", "engaged"])
      .order("score", { ascending: false })

    if (error || !data) {
      return []
    }

    return data as Prospect[]
  }

  /**
   * Get email template
   */
  static async getEmailTemplate(templateId: string): Promise<EmailTemplate | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .eq("id", templateId)
      .eq("is_active", true)
      .single()

    if (error || !data) {
      return null
    }

    return data as EmailTemplate
  }

  /**
   * Increment email template stats
   */
  static async incrementTemplateStats(templateId: string, stat: "send" | "open" | "click" | "reply"): Promise<void> {
    const supabase = await createClient()

    const column = `${stat}_count`

    await supabase.rpc("increment_template_stat", {
      template_id: templateId,
      stat_column: column,
    })
  }

  /**
   * Record intent signal (standalone, may or may not be linked to prospect)
   */
  static async recordIntentSignal(params: {
    prospect_id?: string
    signal_type: IntentSignalType
    confidence: number
    source: string
    source_url?: string
    company_name?: string
    company_data?: Record<string, unknown>
    timing: "immediate" | "near_term" | "future" | "unknown"
    details?: Record<string, unknown>
  }): Promise<{ success: boolean; signalId?: string; error?: string }> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("intent_signals")
      .insert({
        prospect_id: params.prospect_id,
        signal_type: params.signal_type,
        confidence: params.confidence,
        source: params.source,
        source_url: params.source_url,
        company_name: params.company_name,
        company_data: params.company_data || {},
        timing: params.timing,
        details: params.details || {},
        processed: !!params.prospect_id,
        processed_at: params.prospect_id ? new Date().toISOString() : null,
      })
      .select("id")
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, signalId: data.id }
  }

  /**
   * Get unprocessed intent signals
   */
  static async getUnprocessedSignals(limit = 50): Promise<
    {
      id: string
      signal_type: IntentSignalType
      confidence: number
      source: string
      company_name?: string
      company_data: Record<string, unknown>
      timing: string
      details: Record<string, unknown>
      detected_at: string
    }[]
  > {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("intent_signals")
      .select("*")
      .eq("processed", false)
      .order("detected_at", { ascending: false })
      .limit(limit)

    if (error || !data) {
      return []
    }

    return data
  }

  /**
   * Mark signal as processed
   */
  static async markSignalProcessed(
    signalId: string,
    prospectId?: string,
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    const { error } = await supabase
      .from("intent_signals")
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        prospect_id: prospectId,
      })
      .eq("id", signalId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  /**
   * Convert prospect to lead
   */
  static async convertToLead(
    prospectId: string,
    leadData: {
      move_type: string
      origin_suburb: string
      destination_suburb: string
      target_move_date?: string
      estimated_total?: number
    },
  ): Promise<{ success: boolean; leadId?: string; error?: string }> {
    const supabase = await createClient()

    // Get prospect data
    const prospect = await this.getProspect(prospectId)
    if (!prospect) {
      return { success: false, error: "Prospect not found" }
    }

    // Create lead from prospect
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        contact_name: prospect.contact_name,
        company_name: prospect.company_name,
        email: prospect.contact_email,
        phone: prospect.contact_phone,
        move_type: leadData.move_type,
        origin_suburb: leadData.origin_suburb,
        destination_suburb: leadData.destination_suburb,
        target_move_date: leadData.target_move_date,
        estimated_total: leadData.estimated_total,
        industry_type: prospect.industry,
        employee_count: prospect.employee_count,
        status: "new",
        lead_type: "hunter_generated",
        internal_notes: `Converted from Hunter prospect. Source: ${prospect.source}`,
      })
      .select("id")
      .single()

    if (leadError || !lead) {
      return { success: false, error: leadError?.message || "Failed to create lead" }
    }

    // Update prospect as converted
    await supabase
      .from("prospects")
      .update({
        status: "converted",
        converted_lead_id: lead.id,
        conversion_date: new Date().toISOString(),
      })
      .eq("id", prospectId)

    return { success: true, leadId: lead.id }
  }

  /**
   * Get prospect statistics
   */
  static async getProspectStats(): Promise<{
    total: number
    byStatus: Record<ProspectStatus, number>
    bySource: Record<string, number>
    qualified: number
    converted: number
    avgScore: number
  }> {
    const supabase = await createClient()

    // Get total count
    const { count: total } = await supabase.from("prospects").select("*", { count: "exact", head: true })

    // Get status breakdown
    const statuses: ProspectStatus[] = [
      "new",
      "enriched",
      "qualified",
      "contacted",
      "engaged",
      "meeting_scheduled",
      "proposal_sent",
      "converted",
      "lost",
      "nurture",
    ]
    const byStatus: Record<string, number> = {}

    for (const status of statuses) {
      const { count } = await supabase
        .from("prospects")
        .select("*", { count: "exact", head: true })
        .eq("status", status)
      byStatus[status] = count || 0
    }

    // Get source breakdown
    const { data: sources } = await supabase.from("prospects").select("source")

    const bySource: Record<string, number> = {}
    for (const row of sources || []) {
      bySource[row.source] = (bySource[row.source] || 0) + 1
    }

    // Get qualified count
    const { count: qualified } = await supabase
      .from("prospects")
      .select("*", { count: "exact", head: true })
      .eq("qualified", true)

    // Get average score
    const { data: scores } = await supabase.from("prospects").select("score").gt("score", 0)

    const avgScore = scores?.length ? scores.reduce((sum, p) => sum + p.score, 0) / scores.length : 0

    return {
      total: total || 0,
      byStatus: byStatus as Record<ProspectStatus, number>,
      bySource,
      qualified: qualified || 0,
      converted: byStatus["converted"] || 0,
      avgScore: Math.round(avgScore),
    }
  }
}
