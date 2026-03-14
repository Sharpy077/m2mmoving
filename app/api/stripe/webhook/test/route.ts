import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"

/**
 * Automated Stripe Webhook Verification
 *
 * This endpoint creates a test checkout session and monitors the webhook delivery
 * to verify the entire payment flow is working correctly.
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const testId = `test_${Date.now()}`

    // Step 1: Create a test lead
    const { data: testLead, error: leadError } = await supabase
      .from("leads")
      .insert({
        contact_name: "Webhook Test User",
        email: "webhook-test@m2mmoving.test",
        company_name: "Webhook Verification Test",
        move_type: "commercial",
        origin_suburb: "Test Origin",
        destination_suburb: "Test Destination",
        deposit_amount: 1.0, // $1 test amount
        payment_status: "pending",
        status: "test",
        internal_notes: `Automated webhook test - ${testId}`,
      })
      .select("id")
      .single()

    if (leadError) {
      return NextResponse.json(
        {
          success: false,
          step: "create_lead",
          error: leadError.message,
        },
        { status: 500 },
      )
    }

    // Step 2: Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      redirect_on_completion: "never",
      customer_email: "webhook-test@m2mmoving.test",
      line_items: [
        {
          price_data: {
            currency: "aud",
            product_data: {
              name: "Webhook Test - $1.00",
              description: `Automated webhook verification test - ${testId}`,
            },
            unit_amount: 100, // $1.00 in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        lead_id: testLead.id,
        test_id: testId,
        is_webhook_test: "true",
      },
    })

    // Step 3: Create payment record
    const { error: paymentError } = await supabase.from("payments").insert({
      lead_id: testLead.id,
      stripe_checkout_session_id: session.id,
      amount: 1.0,
      status: "pending",
      payment_type: "deposit",
      customer_email: "webhook-test@m2mmoving.test",
      customer_name: "Webhook Test User",
      description: `Webhook verification test - ${testId}`,
      metadata: { test_id: testId, is_webhook_test: true },
    })

    if (paymentError) {
      // Cleanup test lead
      await supabase.from("leads").delete().eq("id", testLead.id)
      return NextResponse.json(
        {
          success: false,
          step: "create_payment",
          error: paymentError.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      testId,
      leadId: testLead.id,
      sessionId: session.id,
      clientSecret: session.client_secret,
      message: "Test checkout session created. Complete the payment to verify webhook.",
      instructions: [
        "1. Use the client_secret to render the Stripe checkout form",
        "2. Complete payment with test card: 4242 4242 4242 4242",
        "3. Check the webhook verification endpoint to confirm delivery",
      ],
    })
  } catch (error) {
    console.error("[v0] Webhook test error:", error)
    return NextResponse.json(
      {
        success: false,
        step: "unknown",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

/**
 * GET - Check webhook verification status
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const testId = searchParams.get("testId")
  const leadId = searchParams.get("leadId")

  if (!testId && !leadId) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing testId or leadId parameter",
      },
      { status: 400 },
    )
  }

  try {
    const supabase = await createClient()

    // Check lead status
    let leadQuery = supabase.from("leads").select("*")
    if (leadId) {
      leadQuery = leadQuery.eq("id", leadId)
    } else {
      leadQuery = leadQuery.ilike("internal_notes", `%${testId}%`)
    }

    const { data: lead, error: leadError } = await leadQuery.single()

    if (leadError || !lead) {
      return NextResponse.json(
        {
          success: false,
          webhookReceived: false,
          error: "Test lead not found",
        },
        { status: 404 },
      )
    }

    // Check payment status
    const { data: payment } = await supabase.from("payments").select("*").eq("lead_id", lead.id).single()

    const webhookReceived = lead.deposit_paid === true && lead.payment_status === "paid"
    const paymentUpdated = payment?.status === "succeeded"

    return NextResponse.json({
      success: true,
      verification: {
        webhookReceived,
        paymentUpdated,
        leadUpdated: webhookReceived,
        allChecksPass: webhookReceived && paymentUpdated,
      },
      lead: {
        id: lead.id,
        status: lead.status,
        paymentStatus: lead.payment_status,
        depositPaid: lead.deposit_paid,
      },
      payment: payment
        ? {
            id: payment.id,
            status: payment.status,
            stripeSessionId: payment.stripe_checkout_session_id,
            stripePaymentIntentId: payment.stripe_payment_intent_id,
          }
        : null,
      message: webhookReceived
        ? "Webhook verification PASSED - Payment processed successfully!"
        : "Webhook not yet received - Complete the test payment or check Stripe dashboard",
    })
  } catch (error) {
    console.error("[v0] Webhook status check error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

/**
 * DELETE - Cleanup test data
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const leadId = searchParams.get("leadId")

  if (!leadId) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing leadId parameter",
      },
      { status: 400 },
    )
  }

  try {
    const supabase = await createClient()

    // Delete payment record
    await supabase.from("payments").delete().eq("lead_id", leadId)

    // Delete test lead
    await supabase.from("leads").delete().eq("id", leadId)

    return NextResponse.json({
      success: true,
      message: "Test data cleaned up successfully",
    })
  } catch (error) {
    console.error("[v0] Cleanup error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
