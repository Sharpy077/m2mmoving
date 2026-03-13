/**
 * SMS Service
 * Send SMS messages via Twilio
 */

import { sendSMS as twilioSendSMS } from "@/lib/twilio"

export async function sendSMS(
  to: string,
  body: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  const success = await twilioSendSMS(to, body)
  return success ? { success: true } : { success: false, error: "SMS send failed" }
}
