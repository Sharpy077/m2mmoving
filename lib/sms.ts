
import twilio from "twilio"

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_FROM_NUMBER || "M2M Moving"

const client = accountSid && authToken ? twilio(accountSid, authToken) : null

export async function sendBookingConfirmationSMS(
    phone: string,
    customerName: string,
    date: string
) {
    if (!client) {
        console.log(`[v0] Mock SMS to ${phone}: Hi ${customerName}, your move on ${date} is confirmed!`)
        return { success: true, mocked: true }
    }

    try {
        const message = await client.messages.create({
            body: `Hi ${customerName}, your M&M Commercial move on ${date} is confirmed! We've just emailed your invoice. Questions? Call us at 1300 M2M MOV.`,
            from: fromNumber,
            to: phone,
        })
        console.log(`[v0] SMS sent: ${message.sid}`)
        return { success: true, sid: message.sid }
    } catch (error) {
        console.error(`[v0] SMS failed:`, error)
        return { success: false, error }
    }
}
