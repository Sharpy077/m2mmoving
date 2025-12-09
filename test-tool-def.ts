import { tool } from "ai";
import { z } from "zod";

try {
    const t = tool({
        description: "test tool",
        parameters: z.object({
            q: z.string()
        }),
        execute: async ({ q }) => {
            return "done " + q;
        }
    });

    console.log("Tool created successfully");
    console.log("Parameters schema:", t.parameters);
    console.log("OPENAI_API_KEY present:", !!process.env.OPENAI_API_KEY);
} catch (e) {
    console.error("Tool creation failed:", e);
}
