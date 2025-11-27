import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: voicemails, error } = await supabase
      .from("voicemails")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Failed to fetch voicemails:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ voicemails })
  } catch (error) {
    console.error("[v0] Voicemails API error:", error)
    return NextResponse.json({ error: "Failed to fetch voicemails" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, status, notes } = await request.json()
    const supabase = await createClient()

    const updateData: Record<string, string> = { updated_at: new Date().toISOString() }
    if (status) updateData.status = status
    if (notes !== undefined) updateData.notes = notes

    const { error } = await supabase.from("voicemails").update(updateData).eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Update voicemail error:", error)
    return NextResponse.json({ error: "Failed to update voicemail" }, { status: 500 })
  }
}
