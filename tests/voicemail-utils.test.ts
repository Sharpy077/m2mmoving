import { describe, expect, it } from "vitest"

import {
  filterVoicemailsByStatus,
  formatDuration,
  formatMelbourneDate,
  type VoicemailRecord,
} from "@/lib/voicemails/utils"

const sample: VoicemailRecord[] = [
  {
    id: "v1",
    caller_number: "+6100000000",
    recording_url: "https://example.com/1",
    recording_sid: "sid1",
    duration: 125,
    transcription: null,
    status: "new",
    notes: null,
    created_at: "2025-12-01T00:00:00.000Z",
  },
  {
    id: "v2",
    caller_number: "+6100000001",
    recording_url: "https://example.com/2",
    recording_sid: "sid2",
    duration: 58,
    transcription: null,
    status: "followed_up",
    notes: null,
    created_at: "2025-12-02T00:00:00.000Z",
  },
]

describe("voicemail utilities", () => {
  it("formats durations with leading zeros", () => {
    expect(formatDuration(125)).toBe("2:05")
    expect(formatDuration(-10)).toBe("0:00")
  })

  it("formats timestamps in Melbourne timezone", () => {
    expect(formatMelbourneDate(sample[0].created_at)).toContain("Dec")
  })

  it("filters by status and defaults to all for unsafe values", () => {
    expect(filterVoicemailsByStatus(sample, "new")).toHaveLength(1)
    expect(filterVoicemailsByStatus(sample, "invalid" as never)).toHaveLength(sample.length)
  })
})
