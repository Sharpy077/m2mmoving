import type { LeadInsert } from "@/lib/types"

const ANGLE_BRACKETS = /[<>]/g
const UNSAFE_SPEECH_CHARS = /[^a-z0-9.,\-\s]/gi
const NON_DIGIT_PHONE = /[^+\d]/g

export interface AssistantQuoteContext {
  moveType: string
  moveTypeKey?: string
  estimatedTotal: number
  depositRequired: number
  origin: string
  destination: string
  squareMeters: number
}

export interface AssistantContactContext {
  contactName: string
  email: string
  phone: string
  companyName?: string
}

export interface AssistantBusinessContext {
  name?: string
  abn?: string
}

export interface AssistantLeadContext {
  quote: AssistantQuoteContext
  contact: AssistantContactContext
  business?: AssistantBusinessContext | null
  scheduledDate: string | null
}

function sanitize(value: string): string {
  return value?.replace(ANGLE_BRACKETS, "").trim() ?? ""
}

function sanitizePhone(phone: string): string | undefined {
  const normalized = phone.replace(NON_DIGIT_PHONE, "")
  if (!normalized) return undefined
  return normalized.startsWith("+") ? normalized : `+61${normalized.replace(/^0+/, "")}`
}

export function sanitizeVoiceTranscript(input: string): string {
  return input?.replace(UNSAFE_SPEECH_CHARS, "").trim() ?? ""
}

export function formatBookingDate(date: string, locale = "en-AU"): string {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) {
    return "Invalid date"
  }
  return parsed.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
}

export function buildAssistantLeadPayload(context: AssistantLeadContext): LeadInsert {
  const { quote, contact, business, scheduledDate } = context
  const contactName = sanitize(contact.contactName)
  const email = contact.email?.trim()

  if (!contactName || !email) {
    throw new Error("Contact name and email are required before submitting a booking.")
  }

  const scheduled = scheduledDate && !Number.isNaN(new Date(scheduledDate).getTime()) ? scheduledDate : undefined
  const company = sanitize(business?.name || contact.companyName || "")
  const abnNote = business?.abn ? `ABN ${business.abn}` : null

  return {
    lead_type: "instant_quote",
    email,
    contact_name: contactName,
    company_name: company || undefined,
    phone: sanitizePhone(contact.phone),
    move_type: quote.moveTypeKey || quote.moveType,
    origin_suburb: sanitize(quote.origin) || undefined,
    destination_suburb: sanitize(quote.destination) || undefined,
    square_meters: quote.squareMeters,
    estimated_total: Math.round(quote.estimatedTotal),
    deposit_amount: Math.round(quote.depositRequired),
    deposit_paid: true,
    scheduled_date: scheduled,
    status: "quoted",
    internal_notes: abnNote ? `${abnNote} · Deposit paid` : "Deposit paid",
  }
}
