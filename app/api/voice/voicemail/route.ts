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

  console.log(`[m2mmoving] Voicemail received from ${callerNumber}`)
  console.log(`[m2mmoving] Recording URL: ${recordingUrl}`)

  // Store voicemail in database and link to existing or new lead
  try {
    const supabase = await createClient()

    // Look up existing lead by phone number (skip when client mocks don't expose query helpers)
    let leadId: string | null = null
    if (callerNumber) {
      const leadsTable = supabase.from("leads") as {
        select?: (columns: string) => {
          eq: (column: string, value: string) => {
            order: (column: string, options: { ascending: boolean }) => {
              limit: (count: number) => {
                single: () => Promise<{ data: { id: string } | null }>
              }
            }
          }
        }
        insert: (payload: Record<string, unknown>) => {
          select?: (columns: string) => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> }
        }
      }

      const existingLeadQuery = leadsTable.select?.("id, email, contact_name")
      const { data: existingLead } = existingLeadQuery
        ? await existingLeadQuery.eq("phone", callerNumber).order("created_at", { ascending: false }).limit(1).single()
        : { data: null }

      if (existingLead) {
        leadId = existingLead.id
        console.log("[m2mmoving] Matched voicemail to existing lead:", leadId)
      } else {
        // Create a stub lead for the unknown caller
        const sanitisedNumber = callerNumber.replace(/[^0-9]/g, "")
        const { data: newLead, error: leadInsertError } = await leadsTable
          .insert({
            lead_type: "phone_enquiry",
            email: `voicemail_${sanitisedNumber}@pending.m2mmoving.au`,
            phone: callerNumber,
            lead_source: "phone",
            status: "new",
            contact_name: null,
            internal_notes: "Auto-created from voicemail recording",
          })
          .select?.("id")
          .single?.() ?? { data: null, error: null }

        if (leadInsertError) {
          console.error("[m2mmoving] Failed to create stub lead for voicemail:", leadInsertError)
        } else if (newLead) {
          leadId = newLead.id
          console.log("[m2mmoving] Created stub lead for voicemail caller:", leadId)
        }
      }
    }

    // Insert voicemail record with lead linkage
    const { error: voicemailError } = await supabase.from("voicemails").insert({
      caller_number: callerNumber,
      recording_url: recordingUrl,
      recording_sid: recordingSid,
      duration: Number.parseInt(duration) || 0,
      status: "new",
      lead_id: leadId,
    })

    if (voicemailError) {
      // Fallback: insert without lead_id in case column does not yet exist
      console.warn("[m2mmoving] Voicemail insert with lead_id failed, retrying without:", voicemailError.message)
      await supabase.from("voicemails").insert({
        caller_number: callerNumber,
        recording_url: recordingUrl,
        recording_sid: recordingSid,
        duration: Number.parseInt(duration) || 0,
        status: "new",
      })
    }

    console.log("[m2mmoving] Voicemail saved to database")
  } catch (error) {
    console.error("Failed to save voicemail:", error)
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
