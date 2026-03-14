import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const voicemailStatusValues = ["new", "listened", "followed_up", "archived"] as const

const patchSchema = z.object({
  id: z.string().min(1, "Voicemail ID is required"),
  status: z.enum(voicemailStatusValues).optional(),
  notes: z.string().max(2000, "Notes too long (max 2000 characters)").optional(),
})

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: voicemails, error } = await supabase
      .from("voicemails")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Failed to fetch voicemails:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ voicemails })
  } catch (error) {
    console.error("Voicemails API error:", error)
    return NextResponse.json({ error: "Failed to fetch voicemails" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Require authenticated admin session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { id, status, notes } = parsed.data
    const updateData: Record<string, string> = { updated_at: new Date().toISOString() }
    if (status) updateData.status = status
    if (notes !== undefined) updateData.notes = notes

    const { error } = await supabase.from("voicemails").update(updateData).eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Update voicemail error:", error)
    return NextResponse.json({ error: "Failed to update voicemail" }, { status: 500 })
  }
}
