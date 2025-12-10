import { MayaAgent } from "../lib/agents/maya/agent"
import { SentinelAgent } from "../lib/agents/sentinel/agent"
import { NexusAgent } from "../lib/agents/nexus/agent"

async function simulateE2E() {
    console.log("\n==================================================================")
    console.log("   M2M MOVING - END-TO-END CONVERSATION SIMULATION")
    console.log("==================================================================\n")

    const user = { userId: "customer-123", role: "user" }

    // 1. SALES PHASE (Maya)
    console.log("--- PHASE 1: SALES & QUOTING (Maya) ---\n")
    const maya = new MayaAgent()

    const salesMessages = [
        "Hi, I need to move my tech startup office from Cremorne to Richmond next month.",
        "We have 15 desks and I also need to buy 15 new Dell 27' monitors and have them set up.",
        "That quote looks good. Let's go ahead."
    ]

    let bookingId = "BOOK-SIM-001" // usage mock

    for (const content of salesMessages) {
        console.log(`👤 Customer: ${content}`)
        const response = await maya.process({
            type: "message",
            id: `msg-${Date.now()}`,
            userId: user.userId,
            content,
            timestamp: new Date(),
            metadata: user
        })
        console.log(`🤖 Maya: ${response.data?.response || response.response}\n`)

        // Simulate booking confirmation logic if agent reached closing stage
        // For simulation visual purposes we assume success after the last message
    }

    console.log(`✅ [SYSTEM]: Booking Confirmed. ID: ${bookingId}\n`)


    // 2. OPERATIONS PHASE (Nexus) - Backend
    // (Nexus receives the booking event - simplified here as a log)
    console.log("--- PHASE 2: OPERATIONS (Nexus) ---\n")
    console.log(`✅ [NEXUS]: Received booking ${bookingId}.`)
    console.log(`✅ [NEXUS]: Scheduled 'IT Specialist' crew for job.\n`)


    // 3. SUPPORT PHASE (Sentinel) - Post-Move
    console.log("--- PHASE 3: POST-MOVE SUPPORT (Sentinel) ---\n")
    const sentinel = new SentinelAgent()
    const supportMessages = [
        "Hi, the move was yesterday. Booking ID is BOOK-SIM-001.",
        "We have a major issue. The server network wasn't configured correctly and we are offline."
    ]

    for (const content of supportMessages) {
        console.log(`👤 Customer: ${content}`)
        const response = await sentinel.process({
            type: "message",
            id: `msg-${Date.now()}`,
            userId: user.userId,
            content,
            timestamp: new Date(),
            metadata: { ...user, bookingId } // Context often persists or is looked up
        })

        console.log(`🤖 Sentinel: ${response.data?.response || response.response}`)

        if (response.actions && response.actions.length > 0) {
            console.log(`   [ACTION]: ${JSON.stringify(response.actions.map(a => a.type + ": " + JSON.stringify(a.payload)))}`)
        }
        console.log("")
    }

    console.log("\n==================================================================")
    console.log("   SIMULATION COMPLETE")
    console.log("==================================================================")
}

simulateE2E().catch(console.error)
