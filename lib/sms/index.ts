/**
 * SMS Service
 * Send SMS messages via Twilio
 */

import { twilioClient, formatAustralianNumber } from "@/lib/twilio"

const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || ""

export async function sendSMS(
  to: string,
  body: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (!twilioClient) {
    console.warn("[SMS] Twilio client not configured — skipping SMS")
    return { success: false, error: "Twilio client not configured" }
  }

  try {
    const formattedTo = formatAustralianNumber(to)
    const message = await twilioClient.messages.create({
      to: formattedTo,
      from: TWILIO_PHONE_NUMBER,
      body,
    })
    return { success: true, sid: message.sid }
  } catch (error) {
    console.error("[SMS] Failed to send:", error)
    return { success: false, error: error instanceof Error ? error.message : "SMS send failed" }
  }
}
