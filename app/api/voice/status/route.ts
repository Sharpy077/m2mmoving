import { type NextRequest, NextResponse } from "next/server"
import twilio from "twilio"
import { validateTwilioRequest } from "@/lib/twilio"

const VoiceResponse = twilio.twiml.VoiceResponse

export async function POST(request: NextRequest) {
  const formData = await request.formData()

  // Validate that the request genuinely came from Twilio
  const params: Record<string, string> = {}
  formData.forEach((value, key) => { params[key] = value.toString() })
  if (!validateTwilioRequest(request, params)) {
    console.warn("[voice/status] Invalid Twilio signature — rejecting request")
    return new NextResponse("Forbidden", { status: 403 })
  }

  const dialCallStatus = formData.get("DialCallStatus") as string
  const callerNumber = formData.get("From") as string

  console.log(`[v0] Call status: ${dialCallStatus} from ${callerNumber}`)

  const twiml = new VoiceResponse()

  // Handle different call outcomes
  if (dialCallStatus === "completed") {
    // Call was answered and completed successfully
    twiml.say({ voice: "alice", language: "en-AU" }, "Thank you for calling M and M Commercial Moving. Goodbye.")
  } else if (["busy", "no-answer", "failed", "canceled"].includes(dialCallStatus)) {
    // Call was not answered - go to voicemail
    twiml.say(
      { voice: "alice", language: "en-AU" },
      "Sorry, no one is available to take your call right now. Please leave a message after the beep.",
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
