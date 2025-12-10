import { Resend } from "resend"

const RESEND_API_KEY = process.env.RESEND_API_KEY

export const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

export const EMAIL_FROM_ADDRESS =
  process.env.EMAIL_FROM_ADDRESS || "M&M Commercial Moving <notifications@m2mmoving.au>"

export const LEAD_NOTIFICATION_RECIPIENTS = (process.env.LEAD_NOTIFICATION_EMAILS || "sales@m2mmoving.au")
  .split(",")
  .map((email) => email.trim())
  .filter(Boolean)

export function formatCurrency(value?: number | null) {
  if (!value && value !== 0) return "TBD"
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(value)
}

export async function sendClientConfirmation(
  to: string,
  customerName: string,
  scheduledDate: string,
  depositAmount: number,
  formattedTotal: string,
  moveType: string
) {
  if (!resend) {
    console.log(`[v0] Mock Email to ${to}: Booking Confirmation for ${customerName}`)
    return { success: true, mocked: true }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM_ADDRESS,
      to,
      subject: `Booking Confirmed - M&M Commercial Moving (${scheduledDate})`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Booking Confirmed!</h1>
          <p>Hi ${customerName},</p>
          <p>Thanks for choosing M&M Commercial Moving. We've received your deposit and your move is locked in.</p>
          
          <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Move Details</h3>
            <p><strong>Date:</strong> ${scheduledDate}</p>
            <p><strong>Type:</strong> ${moveType}</p>
            <p><strong>Deposit Paid:</strong> ${formatCurrency(depositAmount / 100)}</p>
            <p><strong>Total Estimate:</strong> ${formattedTotal}</p>
          </div>

          <p>We'll be in touch shortly to confirm final logistics.</p>
          <p>Regards,<br>M&M Moving Team</p>
        </div>
      `,
    })

    if (error) {
      console.error("[v0] Email failed:", error)
      return { success: false, error }
    }

    console.log(`[v0] Email sent: ${data?.id}`)
    return { success: true, id: data?.id }
  } catch (error) {
    console.error("[v0] Email error:", error)
    return { success: false, error }
  }
}

export async function sendStaffNotification(
  leadDetails: {
    name: string
    email: string
    phone: string
    date: string
    type: string
    origin: string
    destination: string
    amount: number
  }
) {
  if (!resend) {
    console.log(`[v0] Mock Staff Alert: New booking from ${leadDetails.name}`)
    return
  }

  try {
    await resend.emails.send({
      from: "M&M System <notifications@m2mmoving.au>",
      to: LEAD_NOTIFICATION_RECIPIENTS,
      subject: `🚨 NEW BOOKING: ${leadDetails.name} (${leadDetails.date})`,
      html: `
        <h3>New Commercial Booking Received</h3>
        <ul>
          <li><strong>Customer:</strong> ${leadDetails.name}</li>
          <li><strong>Email:</strong> ${leadDetails.email}</li>
          <li><strong>Phone:</strong> ${leadDetails.phone}</li>
          <li><strong>Date:</strong> ${leadDetails.date}</li>
          <li><strong>Move Type:</strong> ${leadDetails.type}</li>
          <li><strong>From:</strong> ${leadDetails.origin}</li>
          <li><strong>To:</strong> ${leadDetails.destination}</li>
          <li><strong>Deposit:</strong> ${formatCurrency(leadDetails.amount / 100)}</li>
        </ul>
      `,
    })
  } catch (error) {
    console.error("[v0] Staff alert failed:", error)
  }
}
