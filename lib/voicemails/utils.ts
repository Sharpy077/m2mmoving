export type VoicemailStatus = "new" | "listened" | "followed_up" | "archived"

export interface VoicemailRecord {
  id: string
  caller_number: string
  recording_url: string
  recording_sid: string
  duration: number
  transcription: string | null
  status: VoicemailStatus
  notes: string | null
  created_at: string
}

export type VoicemailFilter = VoicemailStatus | "all"

const VALID_FILTERS = new Set<VoicemailFilter>(["all", "new", "listened", "followed_up", "archived"])

export function formatDuration(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0
  const mins = Math.floor(safeSeconds / 60)
  const secs = safeSeconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function formatMelbourneDate(dateString: string): string {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) {
    return "Unknown"
  }

  return date.toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Melbourne",
  })
}

export function filterVoicemailsByStatus(voicemails: VoicemailRecord[], status: VoicemailFilter): VoicemailRecord[] {
  const normalizedStatus = VALID_FILTERS.has(status) ? status : "all"
  if (normalizedStatus === "all") {
    return voicemails
  }
  return voicemails.filter((voicemail) => voicemail.status === normalizedStatus)
}
