/**
 * Escalation Notification Endpoint
 * Sends notifications to support team when escalation is triggered
 */

import { NextResponse } from "next/server"
import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { ticketId, conversationId, reason, urgency, customerData, conversationSummary, errorCount, stage } = body

    // Send email notification
    if (resend && process.env.LEAD_NOTIFICATION_EMAILS) {
      const emails = process.env.LEAD_NOTIFICATION_EMAILS.split(",").map((e) => e.trim())

      await resend.emails.send({
        from: process.env.EMAIL_FROM_ADDRESS || "Maya <maya@m2mmoving.com.au>",
        to: emails,
        subject: `[${urgency.toUpperCase()}] Maya Escalation - ${ticketId}`,
        html: `
          <h2>Maya Escalation Request</h2>
          <p><strong>Ticket ID:</strong> ${ticketId}</p>
          <p><strong>Urgency:</strong> ${urgency}</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p><strong>Current Stage:</strong> ${stage}</p>
          <p><strong>Error Count:</strong> ${errorCount}</p>
          
          ${
            customerData
              ? `
          <h3>Customer Information</h3>
          <ul>
            ${customerData.name ? `<li><strong>Name:</strong> ${customerData.name}</li>` : ""}
            ${customerData.phone ? `<li><strong>Phone:</strong> ${customerData.phone}</li>` : ""}
            ${customerData.email ? `<li><strong>Email:</strong> ${customerData.email}</li>` : ""}
            ${customerData.businessName ? `<li><strong>Business:</strong> ${customerData.businessName}</li>` : ""}
          </ul>
          `
              : ""
          }
          
          ${conversationSummary ? `<h3>Conversation Summary</h3><p>${conversationSummary}</p>` : ""}
          
          <p><strong>Conversation ID:</strong> ${conversationId}</p>
          <p><em>Please respond to this escalation ${getResponseTime(urgency)}.</em></p>
        `,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[EscalationNotification] Error:", error)
    return NextResponse.json({ success: false, error: "Failed to send notification" }, { status: 500 })
  }
}

function getResponseTime(urgency: string): string {
  switch (urgency) {
    case "critical":
      return "within 5 minutes"
    case "high":
      return "within 15 minutes"
    case "medium":
      return "within 30 minutes"
    default:
      return "within 1 hour"
  }
}
