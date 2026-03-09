import { type NextRequest, NextResponse } from "next/server"
import twilio from "twilio"
import { createClient } from "@/lib/supabase/server"
import { validateTwilioRequest } from "@/lib/twilio"

const VoiceResponse = twilio.twiml.VoiceResponse

export async function POST(request: NextRequest) {
  const formData = await request.formData()

  // Validate that the request genuinely came from Twilio
  const params: Record<string, string> = {}
  formData.forEach((value, key) => { params[key] = value.toString() })
  if (!validateTwilioRequest(request, params)) {
    console.warn("[voice/voicemail] Invalid Twilio signature — rejecting request")
    return new NextResponse("Forbidden", { status: 403 })
  }

  const recordingUrl = formData.get("RecordingUrl") as string
  const recordingSid = formData.get("RecordingSid") as string
  const callerNumber = formData.get("From") as string
  const duration = formData.get("RecordingDuration") as string

  console.log(`[v0] Voicemail received from ${callerNumber}`)
  console.log(`[v0] Recording URL: ${recordingUrl}`)

  // Store voicemail in database
  try {
    const supabase = await createClient()

    await supabase.from("voicemails").insert({
      caller_number: callerNumber,
      recording_url: recordingUrl,
      recording_sid: recordingSid,
      duration: Number.parseInt(duration) || 0,
      status: "new",
    })

    console.log("[v0] Voicemail saved to database")
  } catch (error) {
    console.error("[v0] Failed to save voicemail:", error)
  }

  const twiml = new VoiceResponse()
  twiml.say(
    { voice: "alice", language: "en-AU" },
    "Thank you for your message. We will get back to you as soon as possible. Goodbye.",
  )
  twiml.hangup()

  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  })
}
