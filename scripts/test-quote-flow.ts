
import { OpenAI } from "openai";

async function main() {
    const manual = true; // Set to true to use manual fetch if OpenAI SDK isn't configured for local API

    console.log("Testing Quote Assistant Flow...");

    // Mock initial conversation
    const messages = [
        { role: "user", content: "I need a quote for an office move." }
    ];

    console.log("\n--- Sending Message 1: 'I need a quote for an office move.' ---");

    // We need to hit the local API. Since we are in a script, we can't easily use the browser's fetch to relative URL.
    // We need the server running.
    // Assuming server is at http://localhost:3000
    const baseUrl = "http://localhost:3000";

    try {
        const response = await fetch(`${baseUrl}/api/quote-assistant`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages }),
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        // The response is a stream. We'll just print the text.
        const text = await response.text();
        console.log("Response:", text);

        // Simple heuristic check
        if (text.includes("Business Name") || text.includes("ABN")) {
            console.log("✅ Agent correctly asked for Business Name/ABN.");
        } else {
            console.log("❌ Agent response unexpected.");
        }

    } catch (error) {
        console.error("Test failed:", error);
        console.log("Make sure the dev server is running on localhost:3000!");
    }
}

main();
