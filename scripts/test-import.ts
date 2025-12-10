
import { PRICING_CONFIG, MAYA_SYSTEM_PROMPT } from "../lib/agents/maya/playbook";

console.log("Pricing Config:", JSON.stringify(PRICING_CONFIG, null, 2));
console.log("Prompt length:", MAYA_SYSTEM_PROMPT.length);
