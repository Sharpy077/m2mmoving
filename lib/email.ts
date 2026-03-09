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

// ─── Email template helpers ────────────────────────────────────────────────

const BRAND_BG = "#0b0f19"
const BRAND_CARD = "#141927"
const BRAND_GREEN = "#22c55e"
const BRAND_TEXT = "#f1f5f9"
const BRAND_MUTED = "#94a3b8"

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>M&amp;M Commercial Moving</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND_TEXT};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND_BG};padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <span style="font-size:22px;font-weight:700;color:${BRAND_GREEN};letter-spacing:-0.5px;">M&amp;M</span>
              <span style="font-size:22px;font-weight:700;color:${BRAND_TEXT};"> Commercial Moving</span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:${BRAND_CARD};border-radius:12px;padding:40px 36px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:28px;text-align:center;font-size:12px;color:${BRAND_MUTED};">
              M&amp;M Commercial Moving &bull; Melbourne, VIC &bull;
              <a href="tel:+61388201801" style="color:${BRAND_MUTED};text-decoration:none;">(03) 8820 1801</a><br />
              <a href="https://m2mmoving.au" style="color:${BRAND_MUTED};text-decoration:none;">m2mmoving.au</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function divider(): string {
  return `<tr><td style="padding:20px 0;"><hr style="border:none;border-top:1px solid #1e293b;margin:0;" /></td></tr>`
}

function row(label: string, value: string): string {
  return `
  <tr>
    <td style="padding:6px 0;color:${BRAND_MUTED};font-size:14px;width:40%;">${label}</td>
    <td style="padding:6px 0;color:${BRAND_TEXT};font-size:14px;font-weight:500;">${value}</td>
  </tr>`
}

// ─── Payment Receipt Email ─────────────────────────────────────────────────

export interface PaymentReceiptEmailParams {
  customerName: string
  customerEmail: string
  moveType: string
  origin: string
  destination: string
  scheduledDate: string
  depositAmount: number
  totalAmount: number
  referenceId: string
}

export function buildPaymentReceiptEmail(params: PaymentReceiptEmailParams): {
  subject: string
  html: string
  text: string
} {
  const {
    customerName,
    moveType,
    origin,
    destination,
    scheduledDate,
    depositAmount,
    totalAmount,
    referenceId,
  } = params

  const balanceAmount = totalAmount - depositAmount

  const content = `
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${BRAND_TEXT};">Payment Confirmed</h2>
    <p style="margin:0 0 28px;color:${BRAND_MUTED};font-size:15px;">
      Thank you, ${customerName}. Your deposit has been received and your move is confirmed.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      ${row("Reference", `#${referenceId.slice(0, 8).toUpperCase()}`)}
      ${row("Move Type", moveType)}
      ${row("From", origin)}
      ${row("To", destination)}
      ${row("Scheduled Date", scheduledDate)}
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b1623;border-radius:8px;padding:20px;margin-bottom:28px;">
      <tr>
        <td style="color:${BRAND_MUTED};font-size:14px;">Deposit Paid</td>
        <td align="right" style="color:${BRAND_GREEN};font-size:16px;font-weight:700;">${formatCurrency(depositAmount)}</td>
      </tr>
      <tr>
        <td style="color:${BRAND_MUTED};font-size:14px;padding-top:8px;">Estimated Total</td>
        <td align="right" style="color:${BRAND_TEXT};font-size:14px;padding-top:8px;">${formatCurrency(totalAmount)}</td>
      </tr>
      <tr>
        <td style="color:${BRAND_MUTED};font-size:14px;padding-top:8px;">Balance Due on Day of Move</td>
        <td align="right" style="color:${BRAND_TEXT};font-size:14px;padding-top:8px;">${formatCurrency(balanceAmount)}</td>
      </tr>
    </table>

    <p style="margin:0 0 8px;color:${BRAND_MUTED};font-size:14px;">
      Our team will contact you 48 hours before your scheduled move to confirm all the details.
      If you have any questions, please don't hesitate to get in touch.
    </p>
    <p style="margin:0;color:${BRAND_MUTED};font-size:14px;">
      Call us: <a href="tel:+61388201801" style="color:${BRAND_GREEN};text-decoration:none;">(03) 8820 1801</a>
    </p>
  `

  const text = `Payment Confirmed — M&M Commercial Moving

Hi ${customerName},

Your deposit has been received and your move is confirmed.

Reference: #${referenceId.slice(0, 8).toUpperCase()}
Move Type: ${moveType}
From: ${origin}
To: ${destination}
Scheduled Date: ${scheduledDate}

Deposit Paid: ${formatCurrency(depositAmount)}
Estimated Total: ${formatCurrency(totalAmount)}
Balance Due on Day of Move: ${formatCurrency(balanceAmount)}

Our team will contact you 48 hours before your scheduled move.

Call us: (03) 8820 1801
Website: https://m2mmoving.au

— M&M Commercial Moving`

  return {
    subject: `Payment confirmed — your move on ${scheduledDate} is booked`,
    html: emailWrapper(content),
    text,
  }
}

// ─── Follow-up Email ──────────────────────────────────────────────────────

export interface FollowUpEmailParams {
  customerName: string
  referenceId: string
  moveType: string
  estimatedTotal: number
  quoteUrl: string
  dayNumber: number   // 1, 3, 7, or 14
  offerDiscount?: boolean
}

export function buildFollowUpEmail(params: FollowUpEmailParams): {
  subject: string
  html: string
  text: string
} {
  const { customerName, referenceId, moveType, estimatedTotal, quoteUrl, dayNumber, offerDiscount } = params

  let subjectLine: string
  let headingText: string
  let bodyText: string

  if (dayNumber === 1) {
    subjectLine = "Still thinking about your move? We're here to help"
    headingText = "Your quote is ready"
    bodyText = `Hi ${customerName}, just following up on the ${moveType} quote you requested. Your estimated total is ${formatCurrency(estimatedTotal)}. We'd love to help make your move seamless.`
  } else if (dayNumber === 3) {
    subjectLine = "Ready to lock in your moving date?"
    headingText = "Secure your preferred date"
    bodyText = `Hi ${customerName}, your ${moveType} quote is still available. Moving dates fill up quickly — confirm yours today and we'll handle the rest.`
  } else if (dayNumber === 7) {
    subjectLine = offerDiscount ? "Special offer: 5% off your move this week" : "Your moving quote — last chance to hold your date"
    headingText = offerDiscount ? "Limited-time offer just for you" : "Don't miss your preferred date"
    bodyText = offerDiscount
      ? `Hi ${customerName}, as a valued enquirer we're offering you 5% off your ${moveType} move when you confirm this week. Simply click the button below and mention this email.`
      : `Hi ${customerName}, we wanted to remind you that your moving date is not yet secured. Confirm your ${moveType} quote today to avoid disappointment.`
  } else {
    subjectLine = "Final follow-up on your moving quote"
    headingText = "We're still here when you're ready"
    bodyText = `Hi ${customerName}, we understand timing can be tricky. When you're ready to move forward with your ${moveType} relocation, your quote reference is below and our team is standing by.`
  }

  const content = `
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${BRAND_TEXT};">${headingText}</h2>
    <p style="margin:0 0 28px;color:${BRAND_MUTED};font-size:15px;">${bodyText}</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      ${row("Reference", `#${referenceId.slice(0, 8).toUpperCase()}`)}
      ${row("Move Type", moveType)}
      ${row("Estimated Total", formatCurrency(estimatedTotal))}
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td align="center">
          <a href="${quoteUrl}" style="display:inline-block;background-color:${BRAND_GREEN};color:#000;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
            Confirm My Move
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;color:${BRAND_MUTED};font-size:13px;text-align:center;">
      Or call us directly: <a href="tel:+61388201801" style="color:${BRAND_GREEN};text-decoration:none;">(03) 8820 1801</a>
    </p>
  `

  const text = `${headingText} — M&M Commercial Moving

${bodyText}

Reference: #${referenceId.slice(0, 8).toUpperCase()}
Move Type: ${moveType}
Estimated Total: ${formatCurrency(estimatedTotal)}

Confirm your move: ${quoteUrl}

Or call us: (03) 8820 1801
Website: https://m2mmoving.au

— M&M Commercial Moving`

  return {
    subject: subjectLine,
    html: emailWrapper(content),
    text,
  }
}

// ─── Review Request Email ─────────────────────────────────────────────────

export interface ReviewRequestEmailParams {
  customerName: string
  companyName: string
  referenceId: string
  googleReviewUrl: string
}

export function buildReviewRequestEmail(params: ReviewRequestEmailParams): {
  subject: string
  html: string
  text: string
} {
  const { customerName, companyName, referenceId, googleReviewUrl } = params

  const content = `
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${BRAND_TEXT};">How did we go?</h2>
    <p style="margin:0 0 20px;color:${BRAND_MUTED};font-size:15px;">
      Hi ${customerName}, we hope the move went smoothly for ${companyName || "your team"}.
      Your feedback means the world to us and helps other businesses find the right removalist.
    </p>
    <p style="margin:0 0 28px;color:${BRAND_MUTED};font-size:15px;">
      Could you spare 60 seconds to leave us a Google review? It makes a huge difference.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td align="center">
          <a href="${googleReviewUrl}" style="display:inline-block;background-color:${BRAND_GREEN};color:#000;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
            Leave a Google Review ★
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;color:${BRAND_MUTED};font-size:14px;">
      If anything didn't meet your expectations, please reach out directly — we'd love the chance to make it right.
    </p>
    <p style="margin:0;color:${BRAND_MUTED};font-size:13px;">
      Reference: #${referenceId.slice(0, 8).toUpperCase()} &bull;
      <a href="tel:+61388201801" style="color:${BRAND_GREEN};text-decoration:none;">(03) 8820 1801</a>
    </p>
  `

  const text = `How did we go? — M&M Commercial Moving

Hi ${customerName},

We hope the move went smoothly for ${companyName || "your team"}.

Could you spare 60 seconds to leave us a Google review?

Leave your review: ${googleReviewUrl}

If anything didn't meet your expectations, please reach out directly.

Reference: #${referenceId.slice(0, 8).toUpperCase()}
Call us: (03) 8820 1801
Website: https://m2mmoving.au

— M&M Commercial Moving`

  return {
    subject: `How did your move go, ${customerName}? We'd love your feedback`,
    html: emailWrapper(content),
    text,
  }
}
