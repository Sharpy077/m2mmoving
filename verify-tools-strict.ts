
import { tool } from "ai";
import { z } from "zod";

const lookupBusinessTool = tool({
    description: "Look up an Australian business by name or ABN.",
    parameters: z.object({
        query: z.string().describe("Business name or ABN to search for"),
        searchType: z.string().describe("Type of search - 'name' or 'abn'"),
    }).strict(),
    execute: async () => ({ success: true })
});

const collectContactInfoTool = tool({
    description: "Collect customer contact details.",
    parameters: z.object({
        contactName: z.string(),
        email: z.string(),
        phone: z.string(),
        companyName: z.string(),
        scheduledDate: z.string(),
    }).strict(),
    execute: async () => ({ success: true })
});

console.log("Tools created successfully.");

// Test validation manually
try {
    lookupBusinessTool.parameters.parse({ query: "Test", searchType: "name" });
    console.log("lookupBusinessTool validation passed for valid input.");
} catch (e) {
    console.error("lookupBusinessTool validation FAILED:", e);
}

try {
    lookupBusinessTool.parameters.parse({ query: "Test", searchType: "name", extra: "bad" });
    console.error("lookupBusinessTool FAILED to reject extra props (Strict mode broken?)");
} catch (e) {
    console.log("lookupBusinessTool correctly rejected extra props.");
}
