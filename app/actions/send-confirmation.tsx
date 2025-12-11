"use server"

import { resend, EMAIL_FROM_ADDRESS } from "@/lib/email"
import { twilioClient } from "@/lib/twilio"
import { createClient } from "@/lib/supabase/server"

const OPERATIONS_EMAIL = "operations@m2mmoving.au"

interface BookingConfirmation {
  quoteReference: string
  customerName: string
  customerEmail: string
  customerPhone: string
  businessName: string
  businessABN: string
  serviceType: string
  originAddress: string
  destinationAddress: string
  moveDate: string
  moveTime: string
  quoteAmount: number
  depositPaid: number
}

export async function sendBookingConfirmation(booking: BookingConfirmation) {
  const results = {
    email: { customer: false, operations: false },
    sms: false,
    database: false,
  }

  // 1. Send customer email confirmation
  if (resend && booking.customerEmail) {
    try {
      await resend.emails.send({
        from: EMAIL_FROM_ADDRESS || "M&M Moving <noreply@m2mmoving.au>",
        to: booking.customerEmail,
        subject: `Booking Confirmed - ${booking.quoteReference}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f97316, #ef4444); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">M&M Commercial Moving</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #333;">Booking Confirmed!</h2>
              <p>Hi ${booking.customerName},</p>
              <p>Thank you for choosing M&M Commercial Moving. Your booking has been confirmed.</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #f97316; margin-top: 0;">Booking Details</h3>
                <p><strong>Reference:</strong> ${booking.quoteReference}</p>
                <p><strong>Service:</strong> ${booking.serviceType}</p>
                <p><strong>Date:</strong> ${booking.moveDate}</p>
                <p><strong>Time:</strong> ${booking.moveTime}</p>
                <p><strong>From:</strong> ${booking.originAddress}</p>
                <p><strong>To:</strong> ${booking.destinationAddress}</p>
                <p><strong>Quote:</strong> $${booking.quoteAmount.toFixed(2)} (incl. GST)</p>
                <p><strong>Deposit Paid:</strong> $${booking.depositPaid.toFixed(2)}</p>
              </div>
              
              <p>Our operations team will contact you 24 hours before your scheduled move to confirm final details.</p>
              <p>If you have any questions, please call us at <strong>03 8820 1801</strong> or reply to this email.</p>
              
              <p style="margin-top: 30px;">Best regards,<br>The M&M Moving Team</p>
            </div>
            <div style="background: #333; color: #999; padding: 15px; text-align: center; font-size: 12px;">
              <p>M&M Commercial Moving | ABN: 71 661 027 309</p>
              <p>Phone: 03 8820 1801 | Email: operations@m2mmoving.au</p>
            </div>
          </div>
        `,
      })
      results.email.customer = true
    } catch (error) {
      console.error("[v0] Failed to send customer email:", error)
    }
  }

  // 2. Send operations team email
  if (resend) {
    try {
      await resend.emails.send({
        from: EMAIL_FROM_ADDRESS || "M&M Moving <noreply@m2mmoving.au>",
        to: OPERATIONS_EMAIL,
        subject: `New Booking - ${booking.quoteReference} - ${booking.businessName}`,
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>New Booking Received</h2>
            <table style="border-collapse: collapse; width: 100%;">
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Reference</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${booking.quoteReference}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Business</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${booking.businessName} (ABN: ${booking.businessABN})</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Contact</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${booking.customerName}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Email</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${booking.customerEmail}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Phone</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${booking.customerPhone}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Service</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${booking.serviceType}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Move Date</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${booking.moveDate} at ${booking.moveTime}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>From</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${booking.originAddress}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>To</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${booking.destinationAddress}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Quote</strong></td><td style="padding: 8px; border: 1px solid #ddd;">$${booking.quoteAmount.toFixed(2)}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Deposit</strong></td><td style="padding: 8px; border: 1px solid #ddd;">$${booking.depositPaid.toFixed(2)} PAID</td></tr>
            </table>
          </div>
        `,
      })
      results.email.operations = true
    } catch (error) {
      console.error("[v0] Failed to send operations email:", error)
    }
  }

  // 3. Send SMS confirmation
  if (twilioClient && booking.customerPhone) {
    try {
      const formattedPhone = booking.customerPhone.startsWith("+61")
        ? booking.customerPhone
        : `+61${booking.customerPhone.replace(/^0/, "")}`

      await twilioClient.messages.create({
        body: `M&M Moving: Booking confirmed! Ref: ${booking.quoteReference}. ${booking.moveDate} at ${booking.moveTime}. Questions? Call 03 8820 1801`,
        to: formattedPhone,
        from: process.env.TWILIO_PHONE_NUMBER || "+61000000000",
      })
      results.sms = true
    } catch (error) {
      console.error("[v0] Failed to send SMS:", error)
    }
  }

  // 4. Save to database
  try {
    const supabase = await createClient()
    const { error } = await supabase.from("leads").insert({
      lead_type: "quote_assistant",
      status: "confirmed",
      contact_name: booking.customerName,
      company_name: booking.businessName,
      email: booking.customerEmail,
      phone: booking.customerPhone,
      move_type: booking.serviceType,
      origin_suburb: booking.originAddress,
      destination_suburb: booking.destinationAddress,
      target_move_date: booking.moveDate,
      estimated_total: booking.quoteAmount,
      deposit_amount: booking.depositPaid,
      deposit_paid: true,
      payment_status: "deposit_paid",
      internal_notes: `Quote Reference: ${booking.quoteReference}. Time: ${booking.moveTime}. ABN: ${booking.businessABN}`,
    })

    if (error) throw error
    results.database = true
  } catch (error) {
    console.error("[v0] Failed to save to database:", error)
  }

  return results
}
