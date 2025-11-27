import twilio from "twilio"

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN

export const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null

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

export function isBusinessHours(): boolean {
  const now = new Date()

  // Convert to Melbourne time
  const melbourneTime = new Date(now.toLocaleString("en-US", { timeZone: BUSINESS_HOURS.timezone }))

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
