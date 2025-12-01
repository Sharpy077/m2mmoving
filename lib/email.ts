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

