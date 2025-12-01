import type { LeadInsert } from "@/lib/types"

export interface CustomQuoteFormData {
  fullName: string
  companyName: string
  email: string
  phone: string
  industryType: string
  employeeCount: string
  currentLocation: string
  newLocation: string
  targetMoveDate: string
  estimatedSqm: string
  projectDescription: string
  preferredContactTime: string
}

const ANGLE_BRACKETS = /[<>]/g
const NON_DIGIT_PHONE = /[^+\d]/g

function sanitize(value: string): string {
  return value?.replace(ANGLE_BRACKETS, "").trim() ?? ""
}

function normalizePhone(phone: string): string {
  const normalized = phone.replace(NON_DIGIT_PHONE, "")
  if (!normalized) return ""
  if (normalized.startsWith("+")) return normalized
  return normalized.startsWith("0") ? `+61${normalized.replace(/^0+/, "")}` : normalized
}

function required(value: string, field: string): string {
  const sanitized = sanitize(value)
  if (!sanitized) {
    throw new Error(`${field} is required`)
  }
  return sanitized
}

export function buildCustomQuoteLeadPayload(
  formData: CustomQuoteFormData,
  selectedRequirements: string[],
): LeadInsert {
  const email = required(formData.email, "Email")
  const contactName = required(formData.fullName, "Full name")
  const companyName = required(formData.companyName, "Company name")
  const currentLocation = required(formData.currentLocation, "Current location")
  const newLocation = required(formData.newLocation, "New location")
  const industryType = required(formData.industryType, "Industry type")

  const squareMetersValue = formData.estimatedSqm ? Number.parseInt(formData.estimatedSqm, 10) : undefined
  const safeSquareMeters = squareMetersValue && squareMetersValue > 0 ? Math.min(squareMetersValue, 100000) : undefined

  const payload: LeadInsert = {
    lead_type: "custom_quote",
    email,
    contact_name: contactName,
    company_name: companyName,
    phone: normalizePhone(formData.phone) || undefined,
    industry_type: industryType,
    employee_count: sanitize(formData.employeeCount) || undefined,
    current_location: currentLocation,
    new_location: newLocation,
    target_move_date: sanitize(formData.targetMoveDate) || undefined,
    square_meters: safeSquareMeters,
    special_requirements: selectedRequirements.length > 0 ? Array.from(new Set(selectedRequirements)) : undefined,
    project_description: sanitize(formData.projectDescription) || undefined,
    preferred_contact_time: sanitize(formData.preferredContactTime) || undefined,
  }

  return payload
}
