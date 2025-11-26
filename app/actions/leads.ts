"use server"

import { createClient } from "@/lib/supabase/server"
import type { LeadInsert } from "@/lib/types"

export async function submitLead(data: LeadInsert) {
  const supabase = await createClient()

  const { data: lead, error } = await supabase.from("leads").insert(data).select().single()

  if (error) {
    console.error("Error submitting lead:", error)
    return { success: false, error: error.message }
  }

  // Send email notification (simulated - in production, use a service like Resend)
  await sendEmailNotification(lead)

  return { success: true, lead }
}

export async function getLeads() {
  const supabase = await createClient()

  const { data: leads, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching leads:", error)
    return { success: false, error: error.message, leads: [] }
  }

  return { success: true, leads }
}

export async function updateLeadStatus(id: string, status: string) {
  const supabase = await createClient()

  const { error } = await supabase.from("leads").update({ status }).eq("id", id)

  if (error) {
    console.error("Error updating lead:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function updateLeadNotes(id: string, notes: string) {
  const supabase = await createClient()

  const { error } = await supabase.from("leads").update({ internal_notes: notes }).eq("id", id)

  if (error) {
    console.error("Error updating notes:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

async function sendEmailNotification(lead: any) {
  // In production, integrate with Resend, SendGrid, or similar
  // For now, we'll log the notification
  console.log(`
    ====== NEW LEAD NOTIFICATION ======
    Type: ${lead.lead_type}
    Email: ${lead.email}
    Company: ${lead.company_name || "N/A"}
    Move Type: ${lead.move_type || "Custom Request"}
    Estimated Value: $${lead.estimated_total || "TBD"}
    ===================================
  `)

  // TODO: Integrate email service
  // Example with Resend:
  // await resend.emails.send({
  //   from: 'leads@mmmoving.com.au',
  //   to: 'sales@mmmoving.com.au',
  //   subject: `New ${lead.lead_type === 'instant_quote' ? 'Quote Request' : 'Custom Inquiry'} from ${lead.company_name || lead.email}`,
  //   html: generateEmailTemplate(lead)
  // })
}
