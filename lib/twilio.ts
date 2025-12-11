// Twilio client is created lazily to prevent "Object prototype may only be an Object or null" errors

let twilioClientInstance: ReturnType<typeof import("twilio")["default"]> | null = null

export async function getTwilioClient() {
  if (twilioClientInstance) {
    return twilioClientInstance
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    return null
  }

  // Dynamic import to avoid bundling issues
  const twilio = (await import("twilio")).default
  twilioClientInstance = twilio(accountSid, authToken)
  return twilioClientInstance
}

// Keep the old export for backwards compatibility but mark as deprecated
export const twilioClient = null // Use getTwilioClient() instead

// Business hours configuration (Melbourne time)
export const BUSINESS_HOURS = {
  timezone: "Australia/Melbourne",
  start: 7, // 7am
  end: 17, // 5pm (17:00)
  days: [1, 2, 3, 4, 5], // Monday to Friday
}

// Mobile numbers to forward calls to
export const FORWARD_NUMBERS = [
  process.env.TWILIO_FORWARD_NUMBER_1 || "",
  process.env.TWILIO_FORWARD_NUMBER_2 || "",
].filter(Boolean)

export function isBusinessHours(currentDate: Date = new Date()): boolean {
  // Convert to Melbourne time
  const melbourneTime = new Date(currentDate.toLocaleString("en-US", { timeZone: BUSINESS_HOURS.timezone }))

  const hour = melbourneTime.getHours()
  const day = melbourneTime.getDay() // 0 = Sunday, 1 = Monday, etc.

  const isWorkDay = BUSINESS_HOURS.days.includes(day)
  const isWorkHour = hour >= BUSINESS_HOURS.start && hour < BUSINESS_HOURS.end

  return isWorkDay && isWorkHour
}

export function formatAustralianNumber(number: string): string {
  // Ensure number is in E.164 format for Australian numbers
  if (number.startsWith("04")) {
    return "+61" + number.slice(1)
  }
  if (number.startsWith("4") && number.length === 9) {
    return "+61" + number
  }
  if (number.startsWith("+61")) {
    return number
  }
  return number
}
