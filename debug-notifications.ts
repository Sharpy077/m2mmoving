
import fetch from "node-fetch"

async function triggerWebhook() {
    const payload = {
        type: "checkout.session.completed",
        data: {
            object: {
                id: "cs_test_mock_123",
                payment_intent: "pi_test_mock_123",
                metadata: {
                    lead_id: "mock_lead_123",
                    customer_name: "John Doesla",
                    customer_email: "john@tesla.com",
                    customer_phone: "+61400000000",
                    scheduled_date: "2025-12-19",
                    deposit_amount: "243500", // $2435.00
                    move_type: "Office Relocation",
                    origin: "Sydney CBD",
                    destination: "North Sydney"
                }
            }
        }
    }

    // We need to sign this manually or bypass signature verification.
    // Since we can't easily bypass signature verification in the real route without modifying it to accept unsafe requests (bad practice),
    // we will instead rely on the fact that if we run this against the local dev server, 
    // we might need to use the stripe CLI or just modify the route temporarily to log the "attempt".
    // BUT: The route checks specifically for `stripe-signature`.

    // ALTERNATIVE: We can just import the logic and run it? No, it's inside the route handler.

    // EASIER PATH: Since we are in dev, and we want to verify the NOTIFICATION functionality, 
    // let's create a temporary test script that imports the notification functions and calls them directly.
    // This verifies the logic in lib/email.ts and lib/sms.ts works. 
    // Verifying the *webhook* wiring is harder without the Stripe CLI.

    // So this script will verify the LIB functions directly.

    const { sendClientConfirmation, sendStaffNotification } = require("./lib/email")
    const { sendBookingConfirmationSMS } = require("./lib/sms")

    console.log("--- Testing Notification Logic ---")

    console.log("\n1. Testing Client Email...")
    await sendClientConfirmation(
        "john@tesla.com",
        "John Doesla",
        "2025-12-19",
        243500,
        "$4,870.00",
        "Office Relocation"
    )

    console.log("\n2. Testing SMS...")
    await sendBookingConfirmationSMS("+61400000000", "John Doesla", "2025-12-19")

    console.log("\n3. Testing Staff Alert...")
    await sendStaffNotification({
        name: "John Doesla",
        email: "john@tesla.com",
        phone: "+61400000000",
        date: "2025-12-19",
        type: "Office Relocation",
        origin: "Sydney CBD",
        destination: "North Sydney",
        amount: 243500
    })
}

// Check if run directly
// We need to transpile this or run with ts-node. 
// For simplicity in this env, let's make it a JS file that mocks the imports or uses 'require' if it was CommonJS.
// But the project is ESM/TypeScript.
// We'll write this as a TS file and run it with `npx tsx debug-notifications.ts`
triggerWebhook().catch(console.error)
