import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { validateTwilioRequest } from "@/lib/twilio"

export async function POST(request: NextRequest) {
  const formData = await request.formData()

  // Validate that the request genuinely came from Twilio
  const params: Record<string, string> = {}
  formData.forEach((value, key) => { params[key] = value.toString() })
  if (!validateTwilioRequest(request, params)) {
    console.warn("[voice/transcription] Invalid Twilio signature — rejecting request")
    return new NextResponse("Forbidden", { status: 403 })
  }

  const transcriptionText = formData.get("TranscriptionText") as string
  const recordingSid = formData.get("RecordingSid") as string
  const transcriptionStatus = formData.get("TranscriptionStatus") as string

  console.log(`[v0] Transcription received for recording ${recordingSid}`)
  console.log(`[v0] Status: ${transcriptionStatus}`)

  if (transcriptionStatus === "completed" && transcriptionText) {
    try {
      const supabase = await createClient()

      // Update voicemail with transcription
      const { data, error } = await supabase
        .from("voicemails")
        .update({ transcription: transcriptionText })
        .eq("recording_sid", recordingSid)
        .select("id")

      if (error) {
        console.error("[v0] Failed to save transcription:", error)
      } else if (!data || data.length === 0) {
        console.warn(`[v0] Transcription received for unknown recording_sid: ${recordingSid}`)
      } else {
        console.log("[v0] Transcription saved to database")
      }
    } catch (error) {
      console.error("[v0] Failed to save transcription:", error)
    }
  } else if (transcriptionStatus !== "completed") {
    console.warn(`[v0] Transcription failed with status: ${transcriptionStatus} for recording ${recordingSid}`)
  }

  return new NextResponse("OK", { status: 200 })
}
