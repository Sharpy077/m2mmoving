import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const transcriptionText = formData.get("TranscriptionText") as string
  const recordingSid = formData.get("RecordingSid") as string
  const transcriptionStatus = formData.get("TranscriptionStatus") as string

  console.log(`[v0] Transcription received for recording ${recordingSid}`)
  console.log(`[v0] Status: ${transcriptionStatus}`)

  if (transcriptionStatus === "completed" && transcriptionText) {
    try {
      const supabase = await createClient()

      // Update voicemail with transcription
      await supabase.from("voicemails").update({ transcription: transcriptionText }).eq("recording_sid", recordingSid)

      console.log("[v0] Transcription saved to database")
    } catch (error) {
      console.error("[v0] Failed to save transcription:", error)
    }
  }

  return new NextResponse("OK", { status: 200 })
}
