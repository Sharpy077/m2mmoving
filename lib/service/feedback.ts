/**
 * Feedback Collection System
 * Post-move NPS scoring, review requests, and follow-up triggers
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

const NPS_PROMOTER_THRESHOLD = 8
const NPS_DETRACTOR_THRESHOLD = 6

export interface SubmitFeedbackParams {
  leadId: string
  customerId?: string
  npsScore: number
  feedbackText?: string
  feedbackType?: string
}

export interface FeedbackResult {
  id: string
  shouldRequestReview: boolean
  needsFollowUp: boolean
}

export async function submitFeedback(params: SubmitFeedbackParams): Promise<FeedbackResult> {
  const supabase = getSupabase()

  const shouldRequestReview = params.npsScore >= NPS_PROMOTER_THRESHOLD
  const needsFollowUp = params.npsScore <= NPS_DETRACTOR_THRESHOLD

  const { data, error } = await supabase
    .from("feedback")
    .insert({
      lead_id: params.leadId,
      customer_id: params.customerId || null,
      nps_score: params.npsScore,
      feedback_text: params.feedbackText || null,
      feedback_type: params.feedbackType || "post_move",
      review_requested: shouldRequestReview,
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(`Failed to submit feedback: ${error.message}`)
  }

  return {
    id: data.id,
    shouldRequestReview,
    needsFollowUp,
  }
}

export type NPSCategory = "promoter" | "passive" | "detractor"

export function classifyNPS(score: number): NPSCategory {
  if (score >= 9) return "promoter"
  if (score >= 7) return "passive"
  return "detractor"
}

export async function getAverageNPS(days: number = 30): Promise<number | null> {
  const supabase = getSupabase()
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from("feedback")
    .select("nps_score")
    .gte("created_at", since.toISOString())

  if (error || !data || data.length === 0) return null

  const sum = data.reduce((acc: number, row: { nps_score: number }) => acc + row.nps_score, 0)
  return Math.round((sum / data.length) * 10) / 10
}
