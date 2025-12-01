import { Resend } from "resend"

export type MonitoringSeverity = "info" | "warning" | "error" | "critical"

export interface MonitoringEvent {
  source: string
  message: string
  severity?: MonitoringSeverity
  details?: Record<string, unknown> | string | null
}

type SendResult =
  | { delivered: true; id: string | null }
  | { delivered: false; reason: "missing-api-key" | "no-recipients" | "send-error" }

const DEFAULT_RECIPIENT = "admin@m2mmoving.au"
const DEFAULT_FROM_ADDRESS = "M&M Commercial Moving <notifications@m2mmoving.au>"

let resendClient: Resend | null = null

function getResendClient() {
  if (resendClient) {
    return resendClient
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error("[monitoring] RESEND_API_KEY is not configured")
  }

  resendClient = new Resend(apiKey)
  return resendClient
}

export function getMonitoringRecipients() {
  const raw =
    process.env.MONITORING_ALERT_EMAILS ||
    process.env.ADMIN_MONITORING_EMAIL ||
    process.env.LEAD_NOTIFICATION_EMAILS ||
    DEFAULT_RECIPIENT

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function buildMonitoringEmail(event: MonitoringEvent) {
  const severity = (event.severity ?? "warning").toUpperCase()
  const subject = `[Monitoring][${severity}] ${event.source}`

  const details = formatDetails(event.details)
  const htmlParts = [
    `<p style="font-size:14px;margin:0 0 12px 0;">${escapeHtml(event.message)}</p>`,
    `<p style="font-size:13px;margin:0 0 4px 0;"><strong>Source:</strong> ${escapeHtml(event.source)}</p>`,
    `<p style="font-size:13px;margin:0 0 12px 0;"><strong>Severity:</strong> ${severity}</p>`,
  ]

  if (details) {
    htmlParts.push(
      `<pre style="background:#0b0f19;padding:12px;border-radius:8px;font-size:12px;color:#e8f1ff;white-space:pre-wrap;">${escapeHtml(details)}</pre>`,
    )
  }

  return {
    subject,
    html: htmlParts.join(""),
    text: [`${event.message}`, `Source: ${event.source}`, `Severity: ${severity}`, details || ""]
      .filter(Boolean)
      .join("\n"),
  }
}

export async function sendMonitoringAlert(event: MonitoringEvent): Promise<SendResult> {
  const recipients = getMonitoringRecipients()
  if (!recipients.length) {
    console.warn("[monitoring] No recipients configured, skipping alert", event)
    return { delivered: false, reason: "no-recipients" }
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn("[monitoring] RESEND_API_KEY missing, skipping alert", event)
    return { delivered: false, reason: "missing-api-key" }
  }

  try {
    const resend = getResendClient()
    const { subject, html, text } = buildMonitoringEmail(event)
    const from = process.env.EMAIL_FROM_ADDRESS || DEFAULT_FROM_ADDRESS

    const response = await resend.emails.send({
      from,
      to: recipients,
      subject,
      html,
      text,
    })

    return { delivered: true, id: response?.id ?? null }
  } catch (error) {
    console.error("[monitoring] Failed to deliver alert", error)
    return { delivered: false, reason: "send-error" }
  }
}

export async function reportMonitoring(event: MonitoringEvent) {
  try {
    return await sendMonitoringAlert(event)
  } catch (error) {
    console.error("[monitoring] Unexpected error while sending alert", error)
    return { delivered: false, reason: "send-error" as const }
  }
}

function formatDetails(details: MonitoringEvent["details"]) {
  if (!details) return ""
  if (typeof details === "string") return details

  try {
    return JSON.stringify(details, null, 2)
  } catch {
    return "[unserializable details]"
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function __resetMonitoringTestingState() {
  resendClient = null
}

