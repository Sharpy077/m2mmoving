
export const MAYA_SYSTEM_PROMPT = `You are Maya, an AI Sales Agent for M&M Commercial Moving, a premier commercial relocation service in Melbourne, Australia.

## Your Personality
- Professional yet warm and approachable
- Knowledgeable about commercial moving logistics
- Confident but not pushy
- Solution-oriented
- Uses Australian English (e.g., "centre" not "center", "organise" not "organize")

## Your Goals
1. Qualify leads using BANT (Budget, Authority, Need, Timeline)
2. Generate accurate quotes based on customer requirements
3. Address objections professionally
4. Guide customers through the booking process
5. Maximize conversion while maintaining customer satisfaction

## Conversation Guidelines
- Ask one question at a time
- Acknowledge customer responses before moving forward
- Provide specific, helpful information
- If you don't know something, say so and offer to find out
- Always offer to connect with a human specialist if the customer prefers

## Pricing Information
- Office Relocation: Base $2,500 + $45/sqm
- Data Center Migration: Base $5,000 + $85/sqm
- IT Equipment Transport: Base $1,500 + $35/sqm
- All prices plus GST
- 50% deposit required to confirm booking

## Available Additional Services
- Professional Packing: $450
- Temporary Storage: $300/week
- Post-Move Cleaning: $350
- Premium Insurance: $200
- After Hours Service: $500
- IT Setup Assistance: $600`

export type SalesStage = "discovery" | "qualification" | "proposal" | "negotiation" | "closing"

export interface SalesPlaybook {
    discovery: {
        questions: string[]
        objectionHandlers: Record<string, string>
    }
    qualification: {
        budgetCheck: string
        authorityCheck: string
        needCheck: string
        timelineCheck: string
    }
    proposal: {
        template: string
        customization: string
        validity: string
    }
    negotiation: {
        maxDiscount: number
        approvalRequired: number
        valueAdds: string[]
    }
    closing: {
        depositRequired: number
        contractType: string
        onboardingHandoff: string
    }
}

export const DEFAULT_SALES_PLAYBOOK: SalesPlaybook = {
    discovery: {
        questions: [
            "What's driving your decision to relocate?",
            "What's your timeline looking like?",
            "Who else is involved in this decision?",
            "Have you moved offices before? What worked or didn't work?",
            "What's most important to you in a moving company?",
        ],
        objectionHandlers: {},
    },
    qualification: {
        budgetCheck: "Confirm budget range aligns with estimate",
        authorityCheck: "Identify all decision makers",
        needCheck: "Validate move is necessary and urgent",
        timelineCheck: "Confirm realistic timeline",
    },
    proposal: {
        template: "dynamic based on service mix",
        customization: "company logo, specific requirements",
        validity: "14 days",
    },
    negotiation: {
        maxDiscount: 10,
        approvalRequired: 15,
        valueAdds: ["free packing materials", "extended insurance", "priority scheduling"],
    },
    closing: {
        depositRequired: 50,
        contractType: "digital signature",
        onboardingHandoff: "NEXUS_OPS",
    },
}

export const PRICING_CONFIG = {
    baseRates: {
        office: { base: 2500, perSqm: 45, minSqm: 20 },
        datacenter: { base: 5000, perSqm: 85, minSqm: 50 },
        warehouse: { base: 3000, perSqm: 35, minSqm: 100 },
        retail: { base: 2000, perSqm: 40, minSqm: 30 },
        it: { base: 1500, perSqm: 35, minSqm: 10 },
    },
    additionalServices: {
        packing: { price: 450, description: "Professional packing with materials" },
        storage: { price: 300, description: "Temporary storage per week" },
        cleaning: { price: 350, description: "Post-move cleaning" },
        insurance: { price: 200, description: "Premium insurance $100K coverage" },
        afterHours: { price: 500, description: "Weekend/evening moves" },
        itSetup: { price: 600, description: "IT equipment setup assistance" },
    },
} as const

export const OBJECTION_HANDLERS = {
    price: "I understand budget is important. Our pricing reflects our commitment to zero-damage moves and white-glove service. However, I may be able to offer some flexibility - can you tell me more about your budget constraints?",
    competitor: "I appreciate you're comparing options. What sets us apart is our technology-driven approach and 100% satisfaction guarantee. May I ask what the other quote included?",
    timing: "I completely understand. When would be a better time to discuss this? I can also send you information to review at your convenience.",
    decision: "Of course, take your time. This is an important decision. What information would help you decide? I'm happy to answer any questions.",
    default: "I hear you. Let me see how I can help address that concern.",
}
