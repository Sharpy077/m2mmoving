import { type NextRequest, NextResponse } from "next/server"
import twilio from "twilio"
import { isBusinessHours, FORWARD_NUMBERS, formatAustralianNumber } from "@/lib/twilio"

const VoiceResponse = twilio.twiml.VoiceResponse

export async function POST(request: NextRequest) {
  const twiml = new VoiceResponse()

  // Get caller info from Twilio
  const formData = await request.formData()
  const callerNumber = formData.get("From") as string
  const calledNumber = formData.get("To") as string

  console.log(`[v0] Incoming call from ${callerNumber} to ${calledNumber}`)
  console.log(`[v0] Business hours: ${isBusinessHours()}`)

  if (isBusinessHours()) {
    // During business hours - forward to mobile numbers
    twiml.say(
      { voice: "alice", language: "en-AU" },
      "Thank you for calling M and M Commercial Moving. Please hold while we connect you.",
    )

    const dial = twiml.dial({
      timeout: 30,
      callerId: calledNumber,
      action: "/api/voice/status",
      method: "POST",
    })

    // Simultaneous ring to both numbers
    FORWARD_NUMBERS.forEach((number) => {
      if (number) {
        dial.number(formatAustralianNumber(number))
      }
    })

    // If no one answers, go to voicemail
    twiml.say(
      { voice: "alice", language: "en-AU" },
      "Sorry, no one is available to take your call. Please leave a message after the beep.",
    )
    twiml.record({
      maxLength: 120,
      action: "/api/voice/voicemail",
      transcribe: true,
      transcribeCallback: "/api/voice/transcription",
    })
  } else {
    // After hours message
    twiml.say(
      { voice: "alice", language: "en-AU" },
      "Thank you for calling M and M Commercial Moving. Our office is currently closed. " +
        "Our business hours are 7 AM to 5 PM, Monday to Friday, Melbourne time. " +
        "Please leave a message after the beep and we will return your call on the next business day. " +
        "Alternatively, you can request a quote online at our website.",
    )

    twiml.record({
      maxLength: 120,
      action: "/api/voice/voicemail",
      transcribe: true,
      transcribeCallback: "/api/voice/transcription",
    })
  }

  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  })
}

// Handle GET requests for Twilio webhook verification
export async function GET() {
  return new NextResponse("Twilio Voice Webhook Active", { status: 200 })
}
