"use server"

import { createClient } from "@/lib/supabase/server"
import type { LeadInsert } from "@/lib/types"

export async function submitLead(data: LeadInsert) {
  console.log("[v0] submitLead called with:", JSON.stringify(data, null, 2))

  try {
    console.log("[v0] Creating Supabase client...")
    const supabase = await createClient()
    console.log("[v0] Supabase client created successfully")

    console.log("[v0] Inserting lead into database...")
    const { data: lead, error } = await supabase.from("leads").insert(data).select().single()

    if (error) {
      console.error("[v0] Supabase insert error:", JSON.stringify(error, null, 2))
      return { success: false, error: error.message }
    }

    console.log("[v0] Lead inserted successfully:", JSON.stringify(lead, null, 2))

    // Send email notification (simulated - in production, use a service like Resend)
    await sendEmailNotification(lead)

    return { success: true, lead }
  } catch (error) {
    console.error("[v0] Unexpected error in submitLead:", error)
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred" }
  }
}

export async function getLeads() {
  try {
    const supabase = await createClient()

    const { data: leads, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching leads:", error)
      return { success: false, error: error.message, leads: [] }
    }

    return { success: true, leads }
  } catch (error) {
    console.error("[v0] Unexpected error in getLeads:", error)
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred", leads: [] }
  }
}

export async function updateLeadStatus(id: string, status: string) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from("leads").update({ status }).eq("id", id)

    if (error) {
      console.error("[v0] Error updating lead:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] Unexpected error in updateLeadStatus:", error)
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred" }
  }
}

export async function updateLeadNotes(id: string, notes: string) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from("leads").update({ internal_notes: notes }).eq("id", id)

    if (error) {
      console.error("[v0] Error updating notes:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] Unexpected error in updateLeadNotes:", error)
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred" }
  }
}

async function sendEmailNotification(lead: any) {
  // In production, integrate with Resend, SendGrid, or similar
  console.log(`
    ====== NEW LEAD NOTIFICATION ======
    Type: ${lead.lead_type}
    Email: ${lead.email}
    Company: ${lead.company_name || "N/A"}
    Move Type: ${lead.move_type || "Custom Request"}
    Estimated Value: $${lead.estimated_total || "TBD"}
    ===================================
  `)
}
