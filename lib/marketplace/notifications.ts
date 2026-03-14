import type { MatchingMode, JobType } from './types'

interface JobNotificationContext {
  provider_name: string
  provider_email?: string
  job_id: string
  job_type: JobType | string
  suburb: string
  scheduled_date: string
  customer_price: number
  matching_mode: MatchingMode | string
  bid_deadline?: string | null
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(iso: string): string {
  return iso.split('T')[0]
}

export function buildJobNotificationSMS(ctx: JobNotificationContext): string {
  const lines = [
    `M&M Platform: New ${ctx.matching_mode} job matched — ${ctx.job_type.toUpperCase()} in ${ctx.suburb}`,
    `Date: ${ctx.scheduled_date} | Value: ${formatPrice(ctx.customer_price)}`,
    `Job ID: ${ctx.job_id}`,
  ]

  if (ctx.matching_mode === 'bidding' && ctx.bid_deadline) {
    lines.push(`Bid by: ${formatDate(ctx.bid_deadline)}`)
  }

  lines.push(`Login to accept: https://m2mmoving.com.au/provider/jobs`)
  return lines.join('\n')
}

export function buildJobNotificationEmail(ctx: JobNotificationContext & { provider_email: string }): {
  to: string
  subject: string
  html: string
} {
  const modeLabel = ctx.matching_mode === 'instant' ? 'Instant Assignment' : 'Open Bidding'
  const subject = `[M&M Platform] New ${ctx.job_type} job in ${ctx.suburb} — ${modeLabel}`

  const bidSection =
    ctx.matching_mode === 'bidding' && ctx.bid_deadline
      ? `<p><strong>Bid deadline:</strong> ${formatDate(ctx.bid_deadline)}</p>`
      : ''

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1a1a2e">New Job Match — M&amp;M Moving Platform</h2>
      <p>Hi ${ctx.provider_name},</p>
      <p>A new job has been matched to your company on the M&amp;M platform.</p>

      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr>
          <td style="padding:8px;background:#f5f5f5;font-weight:bold;width:40%">Job ID</td>
          <td style="padding:8px">${ctx.job_id}</td>
        </tr>
        <tr>
          <td style="padding:8px;background:#f5f5f5;font-weight:bold">Type</td>
          <td style="padding:8px;text-transform:capitalize">${ctx.job_type}</td>
        </tr>
        <tr>
          <td style="padding:8px;background:#f5f5f5;font-weight:bold">Location</td>
          <td style="padding:8px">${ctx.suburb}</td>
        </tr>
        <tr>
          <td style="padding:8px;background:#f5f5f5;font-weight:bold">Scheduled Date</td>
          <td style="padding:8px">${ctx.scheduled_date}</td>
        </tr>
        <tr>
          <td style="padding:8px;background:#f5f5f5;font-weight:bold">Job Value</td>
          <td style="padding:8px;font-weight:bold;color:#16a34a">${formatPrice(ctx.customer_price)}</td>
        </tr>
        <tr>
          <td style="padding:8px;background:#f5f5f5;font-weight:bold">Match Mode</td>
          <td style="padding:8px">${modeLabel}</td>
        </tr>
      </table>

      ${bidSection}

      <a href="https://m2mmoving.com.au/provider/jobs"
         style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:8px">
        View &amp; Accept Job
      </a>

      <p style="margin-top:24px;font-size:12px;color:#888">
        This notification was sent by the M&amp;M Commercial Moving Platform.<br/>
        To update your notification preferences, visit your provider dashboard.
      </p>
    </div>
  `

  return { to: ctx.provider_email, subject, html }
}
