"use server"

import { resend, EMAIL_FROM_ADDRESS, LEAD_NOTIFICATION_RECIPIENTS, formatCurrency } from "@/lib/email"
import { createClient } from "@/lib/supabase/server"
import type { Lead, LeadInsert } from "@/lib/types"

export async function submitLead(data: LeadInsert) {
  console.log("[v0] submitLead called with:", JSON.stringify(data, null, 2))

  try {
    console.log("[v0] Creating Supabase client...")
    const supabase = await createClient()

    console.log("[v0] Inserting lead into database...")
    const { data: lead, error } = await supabase.from("leads").insert(data).select().single()

    if (error) {
      console.error("[v0] Supabase insert error:", JSON.stringify(error, null, 2))
      return { success: false, error: error.message }
    }

    console.log("[v0] Lead inserted successfully:", JSON.stringify(lead, null, 2))

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

async function sendEmailNotification(lead: Lead) {
  if (!lead) return

  console.log(
    `
    ====== NEW LEAD NOTIFICATION ======
    Type: ${lead.lead_type}
    Email: ${lead.email}
    Company: ${lead.company_name || "N/A"}
    Move Type: ${lead.move_type || "Custom Request"}
    Estimated Value: ${lead.estimated_total ? formatCurrency(lead.estimated_total) : "TBD"}
    ===================================
  `,
  )

  if (!resend) {
    console.warn("[v0] Resend API key not configured. Skipping email notification.")
    return
  }

  const recipients = LEAD_NOTIFICATION_RECIPIENTS
  if (recipients.length === 0) {
    console.warn("[v0] No lead notification recipients configured.")
    return
  }

  const leadTypeLabel = lead.lead_type === "custom_quote" ? "Custom Quote" : "Instant Quote"
  const moveTypeLabel = lead.move_type || (lead.lead_type === "custom_quote" ? "Custom Request" : "Instant Quote")

  const internalHtml = `
    <p>A new ${leadTypeLabel.toLowerCase()} has been submitted on the website.</p>
    <table style="border-collapse:collapse">
      <tbody>
        <tr><td style="padding:4px 8px;font-weight:600">Company</td><td style="padding:4px 8px">${lead.company_name || "N/A"}</td></tr>
        <tr><td style="padding:4px 8px;font-weight:600">Contact</td><td style="padding:4px 8px">${lead.contact_name || "N/A"} (${lead.email})</td></tr>
        <tr><td style="padding:4px 8px;font-weight:600">Phone</td><td style="padding:4px 8px">${lead.phone || "N/A"}</td></tr>
        <tr><td style="padding:4px 8px;font-weight:600">Move Type</td><td style="padding:4px 8px">${moveTypeLabel}</td></tr>
        <tr><td style="padding:4px 8px;font-weight:600">Locations</td><td style="padding:4px 8px">${lead.origin_suburb || "TBD"} → ${lead.destination_suburb || "TBD"}</td></tr>
        <tr><td style="padding:4px 8px;font-weight:600">Space</td><td style="padding:4px 8px">${lead.square_meters ? `${lead.square_meters} sqm` : "TBD"}</td></tr>
        <tr><td style="padding:4px 8px;font-weight:600">Estimate</td><td style="padding:4px 8px">${formatCurrency(lead.estimated_total)}</td></tr>
      </tbody>
    </table>
  `

  try {
    await resend.emails.send({
      from: EMAIL_FROM_ADDRESS,
      to: recipients,
      subject: `[M&M Moving] New ${leadTypeLabel}`,
      html: internalHtml,
    })

    if (lead.email) {
      const customerHtml = `
        <p>Hi ${lead.contact_name || "there"},</p>
        <p>Thanks for requesting a quote with M&M Commercial Moving. Our team has received your ${
          leadTypeLabel.toLowerCase()
        } and will be in touch within 24 hours.</p>
        <p><strong>Summary</strong></p>
        <ul>
          <li>Move Type: ${moveTypeLabel}</li>
          <li>Estimate: ${formatCurrency(lead.estimated_total)}</li>
          <li>Reference: ${lead.id?.slice(0, 8).toUpperCase()}</li>
        </ul>
        <p>If anything changes, reply to this email or call us on (03) 8820 1801.</p>
        <p>— M&M Commercial Moving</p>
      `

      await resend.emails.send({
        from: EMAIL_FROM_ADDRESS,
        to: [lead.email],
        subject: "We've received your moving request",
        html: customerHtml,
      })
    }
  } catch (error) {
    console.error("[v0] Failed to send email notification:", error)
  }
}
