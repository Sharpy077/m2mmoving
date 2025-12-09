import { MayaAgent } from "../lib/agents/maya/agent"
import { SentinelAgent } from "../lib/agents/sentinel/agent"

async function runVerification() {
    console.log("=== Verifying IT & Furniture Flows ===")

    // 1. Verify Maya - IT Procurement
    console.log("\n--- Testing Maya: IT Procurement ---")
    const maya = new MayaAgent()

    const procurementQuery = {
        type: "message",
        id: "msg-1",
        userId: "user-test",
        content: "I need a quote for moving our office, plus we need to buy 10 Dell monitors.",
        timestamp: new Date(),
        metadata: { role: "user" }
    }

    // We'll just check if the agent acknowledges the monitors or product search capability
    // Note: The agent loop is complex, but we can check if it triggers a catalog search if we mock it or observe logs.
    // Ideally we'd invoke the tool directly or check the response text.
    const mayaResponse = await maya.process(procurementQuery as any)
    console.log("Maya Response:", mayaResponse.data?.response)

    // Test search tool directly
    console.log("\n--- Testing Maya Tool: searchProductCatalog ---")
    // @ts-ignore - private method access or via tool map if public
    // Accessing via registered tool handler would be best, but let's assume we can instance it.
    // maya.tools.get("searchProductCatalog")?.handler(...)

    // 2. Verify Sentinel - IT Support
    console.log("\n--- Testing Sentinel: IT Support ---")
    const sentinel = new SentinelAgent()
    const supportQuery = {
        type: "message",
        id: "msg-2",
        userId: "user-test",
        content: "Our server network is offline after the move.",
        timestamp: new Date(),
        metadata: { role: "user" }
    }

    const sentinelResponse = await sentinel.process(supportQuery as any)
    console.log("Sentinel Response:", sentinelResponse.data?.response)
    console.log("Sentinel Actions:", sentinelResponse.actions) // Should show ticket creation with 'it_support' category
}

runVerification().catch(console.error)
