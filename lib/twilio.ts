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

export async function sendSMS(to: string, body: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    console.error("[v0] Missing Twilio credentials")
    return false
  }

  const formattedTo = formatAustralianNumber(to)

  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
      },
      body: new URLSearchParams({
        To: formattedTo,
        From: fromNumber,
        Body: body,
      }).toString(),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("[v0] Twilio API error:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("[v0] Failed to send SMS:", error)
    return false
  }
}

// Keep legacy export for backwards compatibility (deprecated)
export const twilioClient = null
export async function getTwilioClient() {
  console.warn("[v0] getTwilioClient is deprecated, use sendSMS instead")
  return null
}
