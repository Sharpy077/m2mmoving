/**
 * Phoenix Agent Database Layer
 * Handles customer journeys, NPS tracking, referrals, and loyalty programs
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

// =============================================================================
// CUSTOMER JOURNEYS
// =============================================================================

export interface CustomerJourney {
  id: string
  customer_id?: string
  customer_email: string
  customer_name?: string
  booking_id?: string
  stage: string
  status: string
  started_at: string
  completed_at?: string
  current_step: number
  total_steps: number
  last_action_at?: string
  next_action_at?: string
  next_action_type?: string
  metadata: Record<string, unknown>
}

export interface JourneyAction {
  id: string
  journey_id: string
  action_type: string
  scheduled_for: string
  executed_at?: string
  status: string
  result?: Record<string, unknown>
  error_message?: string
  retry_count: number
}

export async function createJourney(data: {
  customer_email: string
  customer_name?: string
  customer_id?: string
  booking_id?: string
  stage?: string
  metadata?: Record<string, unknown>
}): Promise<CustomerJourney | null> {
  const supabase = getSupabase()

  const { data: journey, error } = await supabase
    .from("customer_journeys")
    .insert({
      customer_email: data.customer_email,
      customer_name: data.customer_name,
      customer_id: data.customer_id,
      booking_id: data.booking_id,
      stage: data.stage || "post_move",
      status: "active",
      current_step: 0,
      total_steps: 5,
      metadata: data.metadata || {},
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating journey:", error)
    return null
  }

  return journey
}

export async function getJourneyByCustomer(customerEmail: string): Promise<CustomerJourney | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("customer_journeys")
    .select("*")
    .eq("customer_email", customerEmail)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error) return null
  return data
}

export async function updateJourney(
  journeyId: string,
  updates: Partial<CustomerJourney>,
): Promise<CustomerJourney | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("customer_journeys")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", journeyId)
    .select()
    .single()

  if (error) {
    console.error("Error updating journey:", error)
    return null
  }

  return data
}

export async function scheduleJourneyAction(data: {
  journey_id: string
  action_type: string
  scheduled_for: Date
}): Promise<JourneyAction | null> {
  const supabase = getSupabase()

  const { data: action, error } = await supabase
    .from("journey_actions")
    .insert({
      journey_id: data.journey_id,
      action_type: data.action_type,
      scheduled_for: data.scheduled_for.toISOString(),
      status: "pending",
    })
    .select()
    .single()

  if (error) {
    console.error("Error scheduling action:", error)
    return null
  }

  return action
}

export async function getPendingActions(): Promise<JourneyAction[]> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("journey_actions")
    .select("*, customer_journeys(*)")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(50)

  if (error) {
    console.error("Error getting pending actions:", error)
    return []
  }

  return data || []
}

export async function completeAction(actionId: string, result: Record<string, unknown>): Promise<void> {
  const supabase = getSupabase()

  await supabase
    .from("journey_actions")
    .update({
      status: "completed",
      executed_at: new Date().toISOString(),
      result,
    })
    .eq("id", actionId)
}

// =============================================================================
// NPS SCORES
// =============================================================================

export interface NPSScore {
  id: string
  customer_email: string
  customer_name?: string
  customer_id?: string
  booking_id?: string
  score: number
  category: string
  feedback?: string
  survey_type: string
  follow_up_status: string
  follow_up_action?: string
  response_handled: boolean
  created_at: string
}

export async function recordNPSScore(data: {
  customer_email: string
  customer_name?: string
  customer_id?: string
  booking_id?: string
  score: number
  feedback?: string
  survey_type?: string
  channel?: string
}): Promise<NPSScore | null> {
  const supabase = getSupabase()

  const category = data.score >= 9 ? "promoter" : data.score >= 7 ? "passive" : "detractor"

  const { data: nps, error } = await supabase
    .from("nps_scores")
    .insert({
      customer_email: data.customer_email,
      customer_name: data.customer_name,
      customer_id: data.customer_id,
      booking_id: data.booking_id,
      score: data.score,
      category,
      feedback: data.feedback,
      survey_type: data.survey_type || "nps",
      channel: data.channel || "email",
    })
    .select()
    .single()

  if (error) {
    console.error("Error recording NPS:", error)
    return null
  }

  return nps
}

export async function getNPSStats(): Promise<{
  total: number
  promoters: number
  passives: number
  detractors: number
  npsScore: number
  avgScore: number
}> {
  const supabase = getSupabase()

  const { data, error } = await supabase.from("nps_scores").select("score, category")

  if (error || !data || data.length === 0) {
    return { total: 0, promoters: 0, passives: 0, detractors: 0, npsScore: 0, avgScore: 0 }
  }

  const promoters = data.filter((d) => d.category === "promoter").length
  const passives = data.filter((d) => d.category === "passive").length
  const detractors = data.filter((d) => d.category === "detractor").length
  const total = data.length

  const npsScore = Math.round(((promoters - detractors) / total) * 100)
  const avgScore = data.reduce((sum, d) => sum + d.score, 0) / total

  return { total, promoters, passives, detractors, npsScore, avgScore: Math.round(avgScore * 10) / 10 }
}

export async function updateNPSFollowUp(npsId: string, status: string, action?: string): Promise<void> {
  const supabase = getSupabase()

  await supabase
    .from("nps_scores")
    .update({
      follow_up_status: status,
      follow_up_action: action,
      response_handled: true,
    })
    .eq("id", npsId)
}

// =============================================================================
// REFERRALS
// =============================================================================

export interface Referral {
  id: string
  referrer_email: string
  referrer_name?: string
  referrer_customer_id?: string
  referral_code: string
  program_type: string
  referred_email?: string
  referred_name?: string
  status: string
  reward_type?: string
  reward_value?: number
  reward_issued_at?: string
  converted_at?: string
  expires_at?: string
  created_at: string
}

export async function createReferral(data: {
  referrer_email: string
  referrer_name?: string
  referrer_customer_id?: string
  program_type?: string
  referral_code?: string
}): Promise<Referral | null> {
  const supabase = getSupabase()

  const code =
    data.referral_code ||
    `REF-${data.referrer_email.split("@")[0].toUpperCase().slice(0, 6)}-${Date.now().toString(36).toUpperCase()}`

  // Set expiry to 1 year from now
  const expiresAt = new Date()
  expiresAt.setFullYear(expiresAt.getFullYear() + 1)

  const { data: referral, error } = await supabase
    .from("referrals")
    .insert({
      referrer_email: data.referrer_email,
      referrer_name: data.referrer_name,
      referrer_customer_id: data.referrer_customer_id,
      referral_code: code,
      program_type: data.program_type || "standard",
      status: "pending",
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating referral:", error)
    return null
  }

  return referral
}

export async function getReferralByCode(code: string): Promise<Referral | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase.from("referrals").select("*").eq("referral_code", code).single()

  if (error) return null
  return data
}

export async function convertReferral(
  code: string,
  referredEmail: string,
  referredName?: string,
): Promise<Referral | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("referrals")
    .update({
      referred_email: referredEmail,
      referred_name: referredName,
      status: "converted",
      converted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("referral_code", code)
    .eq("status", "pending")
    .select()
    .single()

  if (error) {
    console.error("Error converting referral:", error)
    return null
  }

  return data
}

export async function issueReferralReward(referralId: string, rewardType: string, rewardValue: number): Promise<void> {
  const supabase = getSupabase()

  await supabase
    .from("referrals")
    .update({
      reward_type: rewardType,
      reward_value: rewardValue,
      reward_issued_at: new Date().toISOString(),
      status: "rewarded",
      updated_at: new Date().toISOString(),
    })
    .eq("id", referralId)
}

export async function getReferralStats(): Promise<{
  total: number
  pending: number
  converted: number
  rewarded: number
  conversionRate: number
}> {
  const supabase = getSupabase()

  const { data, error } = await supabase.from("referrals").select("status")

  if (error || !data) {
    return { total: 0, pending: 0, converted: 0, rewarded: 0, conversionRate: 0 }
  }

  const pending = data.filter((d) => d.status === "pending").length
  const converted = data.filter((d) => d.status === "converted").length
  const rewarded = data.filter((d) => d.status === "rewarded").length
  const total = data.length

  return {
    total,
    pending,
    converted,
    rewarded,
    conversionRate: total > 0 ? Math.round(((converted + rewarded) / total) * 100) : 0,
  }
}

// =============================================================================
// LOYALTY REWARDS
// =============================================================================

export interface LoyaltyReward {
  id: string
  customer_email: string
  customer_name?: string
  customer_id?: string
  reward_type: string
  reward_value: number
  reason: string
  code?: string
  status: string
  redeemed_at?: string
  expires_at?: string
  metadata: Record<string, unknown>
  created_at: string
}

export async function issueReward(data: {
  customer_email: string
  customer_name?: string
  customer_id?: string
  reward_type: string
  reward_value: number
  reason: string
  metadata?: Record<string, unknown>
}): Promise<LoyaltyReward | null> {
  const supabase = getSupabase()

  const code = `RWD-${Date.now().toString(36).toUpperCase()}`

  // Set expiry to 6 months from now
  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + 6)

  const { data: reward, error } = await supabase
    .from("loyalty_rewards")
    .insert({
      customer_email: data.customer_email,
      customer_name: data.customer_name,
      customer_id: data.customer_id,
      reward_type: data.reward_type,
      reward_value: data.reward_value,
      reason: data.reason,
      code,
      status: "issued",
      expires_at: expiresAt.toISOString(),
      metadata: data.metadata || {},
    })
    .select()
    .single()

  if (error) {
    console.error("Error issuing reward:", error)
    return null
  }

  return reward
}

export async function redeemReward(code: string): Promise<LoyaltyReward | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("loyalty_rewards")
    .update({
      status: "redeemed",
      redeemed_at: new Date().toISOString(),
    })
    .eq("code", code)
    .eq("status", "issued")
    .gt("expires_at", new Date().toISOString())
    .select()
    .single()

  if (error) {
    console.error("Error redeeming reward:", error)
    return null
  }

  return data
}

// =============================================================================
// REVIEW REQUESTS
// =============================================================================

export async function createReviewRequest(data: {
  customer_email: string
  customer_name?: string
  customer_id?: string
  booking_id?: string
  platform: string
  incentive_offered?: string
}): Promise<{ id: string; platform: string; status: string } | null> {
  const supabase = getSupabase()

  const { data: request, error } = await supabase
    .from("review_requests")
    .insert({
      customer_email: data.customer_email,
      customer_name: data.customer_name,
      customer_id: data.customer_id,
      booking_id: data.booking_id,
      platform: data.platform,
      status: "sent",
      incentive_offered: data.incentive_offered,
    })
    .select("id, platform, status")
    .single()

  if (error) {
    console.error("Error creating review request:", error)
    return null
  }

  return request
}

export async function markReviewClicked(requestId: string): Promise<void> {
  const supabase = getSupabase()

  await supabase.from("review_requests").update({ clicked_at: new Date().toISOString() }).eq("id", requestId)
}

export async function markReviewCompleted(requestId: string, reviewUrl?: string): Promise<void> {
  const supabase = getSupabase()

  await supabase
    .from("review_requests")
    .update({
      status: "completed",
      reviewed_at: new Date().toISOString(),
      review_url: reviewUrl,
    })
    .eq("id", requestId)
}

// =============================================================================
// WIN-BACK CAMPAIGNS
// =============================================================================

export async function createWinBackCampaign(data: {
  name: string
  campaign_type: string
  offer_type?: string
  offer_value?: number
  target_customer_ids?: string[]
}): Promise<{ id: string; status: string } | null> {
  const supabase = getSupabase()

  const { data: campaign, error } = await supabase
    .from("winback_campaigns")
    .insert({
      name: data.name,
      campaign_type: data.campaign_type,
      status: "draft",
      offer_type: data.offer_type,
      offer_value: data.offer_value,
      target_customer_ids: data.target_customer_ids,
      customers_targeted: data.target_customer_ids?.length || 0,
    })
    .select("id, status")
    .single()

  if (error) {
    console.error("Error creating win-back campaign:", error)
    return null
  }

  return campaign
}

export async function startCampaign(campaignId: string): Promise<void> {
  const supabase = getSupabase()

  await supabase
    .from("winback_campaigns")
    .update({
      status: "active",
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId)
}

export async function getCampaignStats(campaignId: string): Promise<Record<string, unknown> | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase.from("winback_campaigns").select("*").eq("id", campaignId).single()

  if (error) return null
  return data
}
