/**
 * Escalation API Route
 * Handles human escalation requests and ticket management
 */

import { createServerClient } from "@/lib/supabase/server"
import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { conversationId, reason, urgency, customerData, conversationSummary, errorCount, stage } = body

    // Generate ticket ID
    const ticketId = `ESC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // Store in database
    const supabase = await createServerClient()
    const { error: dbError } = await supabase.from("escalation_tickets").insert({
      id: ticketId,
      conversation_id: conversationId,
      reason,
      urgency,
      status: "pending",
      customer_data: customerData,
      conversation_summary: conversationSummary,
      error_count: errorCount,
      stage,
    })

    if (dbError) {
      console.error("[Escalation] Database error:", dbError)
      // Continue even if DB fails - we'll notify via email
    }

    // Send email notification to support team
    if (resend) {
      const urgencyEmoji =
        {
          critical: "🔴",
          high: "🟠",
          medium: "🟡",
          low: "🟢",
        }[urgency] || "⚪"

      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM_ADDRESS || "noreply@m2mmoving.au",
          to: process.env.LEAD_NOTIFICATION_EMAILS?.split(",") || ["sales@m2mmoving.au"],
          subject: `${urgencyEmoji} [${urgency.toUpperCase()}] Escalation Request - ${ticketId}`,
          html: `
            <h2>Customer Escalation Request</h2>
            <p><strong>Ticket ID:</strong> ${ticketId}</p>
            <p><strong>Urgency:</strong> ${urgency}</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p><strong>Current Stage:</strong> ${stage}</p>
            <p><strong>Error Count:</strong> ${errorCount}</p>
            
            <h3>Customer Details</h3>
            ${customerData?.name ? `<p><strong>Name:</strong> ${customerData.name}</p>` : ""}
            ${customerData?.phone ? `<p><strong>Phone:</strong> ${customerData.phone}</p>` : ""}
            ${customerData?.email ? `<p><strong>Email:</strong> ${customerData.email}</p>` : ""}
            ${customerData?.businessName ? `<p><strong>Business:</strong> ${customerData.businessName}</p>` : ""}
            
            <h3>Conversation Summary</h3>
            <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px;">${conversationSummary || "No summary available"}</pre>
            
            <p style="color: #666; font-size: 12px;">
              This escalation was triggered by Maya AI assistant.
              <br/>Conversation ID: ${conversationId}
            </p>
          `,
        })
      } catch (emailError) {
        console.error("[Escalation] Email error:", emailError)
      }
    }

    // Calculate estimated wait time
    const estimatedWaitTime =
      {
        critical: "within 5 minutes",
        high: "within 15 minutes",
        medium: "within 30 minutes",
        low: "within 1 hour",
      }[urgency] || "within 1 hour"

    return Response.json({
      success: true,
      ticketId,
      estimatedWaitTime,
      callbackScheduled: !!customerData?.phone,
    })
  } catch (error) {
    console.error("[Escalation] Error:", error)
    return Response.json(
      {
        success: false,
        error: "Failed to create escalation ticket",
      },
      { status: 500 },
    )
  }
}

/**
 * Get escalation tickets for admin dashboard
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    const supabase = await createServerClient()

    let query = supabase.from("escalation_tickets").select("*").order("created_at", { ascending: false }).limit(limit)

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return Response.json({
      success: true,
      tickets: data,
    })
  } catch (error) {
    console.error("[Escalation] GET error:", error)
    return Response.json(
      {
        success: false,
        error: "Failed to fetch escalation tickets",
      },
      { status: 500 },
    )
  }
}

/**
 * Update escalation ticket status
 */
export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { ticketId, status, assignedAgent, resolutionNotes } = body

    const supabase = await createServerClient()

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (assignedAgent) {
      updateData.assigned_agent = assignedAgent
    }

    if (resolutionNotes) {
      updateData.resolution_notes = resolutionNotes
    }

    if (status === "resolved" || status === "closed") {
      updateData.resolved_at = new Date().toISOString()
    }

    const { error } = await supabase.from("escalation_tickets").update(updateData).eq("id", ticketId)

    if (error) {
      throw error
    }

    return Response.json({
      success: true,
    })
  } catch (error) {
    console.error("[Escalation] PATCH error:", error)
    return Response.json(
      {
        success: false,
        error: "Failed to update escalation ticket",
      },
      { status: 500 },
    )
  }
}
