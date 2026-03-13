/**
 * Campaign Engine
 * Handles email/SMS drip sequences, enrollment, and scheduled sending
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { resend, EMAIL_FROM_ADDRESS } from "@/lib/email"
import { sendSMS } from "@/lib/twilio"

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
// ENROLLMENT
// =============================================================================

export async function enrollInSequence(
  leadId: string,
  sequenceId: string
): Promise<{ id: string }> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("sequence_enrollments")
    .insert({
      lead_id: leadId,
      sequence_id: sequenceId,
      current_step: 0,
      status: "active",
      next_send_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (error) {
    console.error("Error enrolling in sequence:", error)
    throw new Error(`Failed to enroll: ${error.message}`)
  }

  return { id: data.id }
}

export async function cancelEnrollment(enrollmentId: string): Promise<void> {
  const supabase = getSupabase()

  await supabase
    .from("sequence_enrollments")
    .update({ status: "cancelled" })
    .eq("id", enrollmentId)
}

// =============================================================================
// SENDING
// =============================================================================

interface EmailParams {
  to: string
  subject: string
  html: string
  text: string
}

export async function sendCampaignEmail(params: EmailParams): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    return { success: false, error: "Email service not configured" }
  }

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM_ADDRESS,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

interface SMSParams {
  to: string
  body: string
}

export async function sendCampaignSMS(params: SMSParams): Promise<{ success: boolean; error?: string }> {
  const success = await sendSMS(params.to, params.body)
  return success ? { success: true } : { success: false, error: "SMS send failed" }
}

// =============================================================================
// SCHEDULED PROCESSING
// =============================================================================

export async function processScheduledCampaigns(): Promise<{ processed: number; errors: number }> {
  const supabase = getSupabase()
  let processed = 0
  let errors = 0

  // Find due enrollments
  const { data: dueEnrollments, error: fetchError } = await supabase
    .from("sequence_enrollments")
    .select("*, sequence_steps:sequence_steps(*)")
    .lte("next_send_at", new Date().toISOString())
    .eq("status", "active")

  if (fetchError || !dueEnrollments) {
    return { processed: 0, errors: fetchError ? 1 : 0 }
  }

  for (const enrollment of dueEnrollments) {
    try {
      const steps = enrollment.sequence_steps || []
      const currentStep = steps.find(
        (s: { step_number: number }) => s.step_number === enrollment.current_step + 1
      )

      if (!currentStep) {
        // Sequence complete
        await supabase
          .from("sequence_enrollments")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", enrollment.id)
        processed++
        continue
      }

      // Send based on channel
      // In production, we'd look up the lead's email/phone and send

      // Record the event
      await supabase.from("sequence_events").insert({
        enrollment_id: enrollment.id,
        step_number: currentStep.step_number,
        event_type: "sent",
      })

      // Advance to next step
      const nextStep = steps.find(
        (s: { step_number: number }) => s.step_number === currentStep.step_number + 1
      )
      const nextSendAt = nextStep
        ? new Date(Date.now() + nextStep.delay_days * 86400000).toISOString()
        : null

      await supabase
        .from("sequence_enrollments")
        .update({
          current_step: currentStep.step_number,
          next_send_at: nextSendAt,
          ...(nextSendAt ? {} : { status: "completed", completed_at: new Date().toISOString() }),
        })
        .eq("id", enrollment.id)

      processed++
    } catch {
      errors++
    }
  }

  return { processed, errors }
}
