/**
 * Move Reminder System
 * Automated booking confirmations, move-day reminders, and post-move follow-ups
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

type ReminderType = "booking_confirmation" | "week_before" | "day_before" | "day_of" | "post_move_feedback" | "post_move_review" | "quote_expiring"

const REMINDER_SCHEDULE: Array<{ type: ReminderType; daysBefore: number; channel: "email" | "sms" | "both" }> = [
  { type: "booking_confirmation", daysBefore: 0, channel: "both" },
  { type: "week_before", daysBefore: 7, channel: "email" },
  { type: "day_before", daysBefore: 1, channel: "sms" },
  { type: "day_of", daysBefore: 0, channel: "sms" },
  { type: "post_move_feedback", daysBefore: -1, channel: "email" },
  { type: "post_move_review", daysBefore: -3, channel: "email" },
]

export async function scheduleReminders(
  leadId: string,
  moveDate: Date
): Promise<{ scheduled: number }> {
  const supabase = getSupabase()
  let scheduled = 0

  for (const reminder of REMINDER_SCHEDULE) {
    const scheduledFor = new Date(moveDate)
    scheduledFor.setDate(scheduledFor.getDate() - reminder.daysBefore)

    // Skip reminders in the past
    if (scheduledFor < new Date() && reminder.type !== "booking_confirmation") {
      continue
    }

    await supabase.from("move_reminders").insert({
      lead_id: leadId,
      reminder_type: reminder.type,
      channel: reminder.channel,
      scheduled_for: scheduledFor.toISOString(),
      status: "pending",
    })

    scheduled++
  }

  return { scheduled }
}

export async function processReminders(): Promise<{ processed: number; errors: number }> {
  const supabase = getSupabase()
  let processed = 0
  let errors = 0

  const { data: dueReminders, error } = await supabase
    .from("move_reminders")
    .select("*")
    .lte("scheduled_for", new Date().toISOString())
    .eq("status", "pending")

  if (error || !dueReminders) {
    return { processed: 0, errors: error ? 1 : 0 }
  }

  for (const reminder of dueReminders) {
    try {
      // In production, send email/SMS based on channel and type
      await supabase
        .from("move_reminders")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", reminder.id)

      processed++
    } catch {
      errors++
    }
  }

  return { processed, errors }
}
