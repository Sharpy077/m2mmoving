/**
 * Sales Pipeline Manager
 * Deal stages, quote expiration, payment plans, win/loss tracking
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

// =============================================================================
// DEAL STAGES
// =============================================================================

export type DealStage = "new" | "contacted" | "quoted" | "negotiation" | "won" | "lost"

export async function updateDealStage(leadId: string, stage: DealStage): Promise<void> {
  const supabase = getSupabase()

  const { error } = await supabase
    .from("leads")
    .update({
      deal_stage: stage,
      days_in_stage: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)

  if (error) {
    throw new Error(`Failed to update deal stage: ${error.message}`)
  }
}

// =============================================================================
// QUOTE EXPIRATION
// =============================================================================

const DEFAULT_EXPIRATION_DAYS = 14

export async function setQuoteExpiration(leadId: string, days?: number): Promise<void> {
  const supabase = getSupabase()
  const expirationDate = new Date()
  expirationDate.setDate(expirationDate.getDate() + (days || DEFAULT_EXPIRATION_DAYS))

  const { error } = await supabase
    .from("leads")
    .update({
      quote_expires_at: expirationDate.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)

  if (error) {
    throw new Error(`Failed to set quote expiration: ${error.message}`)
  }
}

// =============================================================================
// PAYMENT PLANS
// =============================================================================

interface Installment {
  installment_number: number
  amount: number
  due_date: string
}

interface PaymentPlanResult {
  installments: Installment[]
  plan: string
}

export async function createPaymentPlan(
  leadId: string,
  totalAmount: number,
  plan: "standard" | "three_part"
): Promise<PaymentPlanResult> {
  const supabase = getSupabase()
  const today = new Date()

  let installments: Installment[]

  if (plan === "three_part") {
    installments = [
      { installment_number: 1, amount: Math.round(totalAmount * 0.3), due_date: today.toISOString().split("T")[0] },
      { installment_number: 2, amount: Math.round(totalAmount * 0.3), due_date: addDays(today, 14) },
      { installment_number: 3, amount: Math.round(totalAmount * 0.4), due_date: addDays(today, 28) },
    ]
  } else {
    // Standard 50/50
    installments = [
      { installment_number: 1, amount: Math.round(totalAmount * 0.5), due_date: today.toISOString().split("T")[0] },
      { installment_number: 2, amount: Math.round(totalAmount * 0.5), due_date: addDays(today, 14) },
    ]
  }

  // Store installments in database
  for (const inst of installments) {
    await supabase
      .from("payment_installments")
      .insert({
        lead_id: leadId,
        installment_number: inst.installment_number,
        amount: inst.amount,
        due_date: inst.due_date,
        status: "pending",
      })
      .select("id")
      .single()
  }

  // Update lead payment plan
  await supabase
    .from("leads")
    .update({ payment_plan: plan })
    .eq("id", leadId)

  return { installments, plan }
}

// =============================================================================
// WIN/LOSS TRACKING
// =============================================================================

export async function recordWinLoss(
  leadId: string,
  outcome: "won" | "lost",
  reason: string
): Promise<void> {
  const supabase = getSupabase()

  const { error } = await supabase
    .from("leads")
    .update({
      status: outcome,
      win_loss_reason: reason,
      deal_stage: outcome,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)

  if (error) {
    throw new Error(`Failed to record win/loss: ${error.message}`)
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function addDays(date: Date, days: number): string {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result.toISOString().split("T")[0]
}
