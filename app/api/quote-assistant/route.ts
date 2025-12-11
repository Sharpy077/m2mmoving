import { streamText, convertToModelMessages, type UIMessage } from "ai"

export const maxDuration = 60

// Pricing configuration
const PRICING_CONFIG = {
  baseRates: {
    office: { base: 2500, perSqm: 45, minSqm: 20 },
    warehouse: { base: 3000, perSqm: 35, minSqm: 100 },
    datacenter: { base: 5000, perSqm: 85, minSqm: 50 },
    retail: { base: 2000, perSqm: 40, minSqm: 30 },
  },
  modifiers: {
    floors: 150,
    noLift: 200,
    afterHours: 1.25,
    weekend: 1.35,
    fragile: 300,
    it_equipment: 400,
  },
}

// Move types configuration
const moveTypes: Record<
  string,
  { name: string; baseRate: number; perSqm: number; minSqm: number; description: string }
> = {
  office: {
    name: "Office Relocation",
    baseRate: PRICING_CONFIG.baseRates.office.base,
    perSqm: PRICING_CONFIG.baseRates.office.perSqm,
    minSqm: PRICING_CONFIG.baseRates.office.minSqm,
    description: "Full-service office moves including furniture, equipment, and IT setup.",
  },
  warehouse: {
    name: "Warehouse Move",
    baseRate: PRICING_CONFIG.baseRates.warehouse.base,
    perSqm: PRICING_CONFIG.baseRates.warehouse.perSqm,
    minSqm: PRICING_CONFIG.baseRates.warehouse.minSqm,
    description: "Industrial warehouse relocations with heavy equipment handling.",
  },
  datacenter: {
    name: "Data Centre",
    baseRate: PRICING_CONFIG.baseRates.datacenter.base,
    perSqm: PRICING_CONFIG.baseRates.datacenter.perSqm,
    minSqm: PRICING_CONFIG.baseRates.datacenter.minSqm,
    description: "Secure data centre relocations with specialized equipment handling.",
  },
  retail: {
    name: "Retail Fit-out",
    baseRate: PRICING_CONFIG.baseRates.retail.base,
    perSqm: PRICING_CONFIG.baseRates.retail.perSqm,
    minSqm: PRICING_CONFIG.baseRates.retail.minSqm,
    description: "Shop fit-outs and retail space relocations.",
  },
  it_equipment: {
    name: "IT Equipment",
    baseRate: PRICING_CONFIG.baseRates.office.base,
    perSqm: PRICING_CONFIG.baseRates.office.perSqm,
    minSqm: 10,
    description: "Specialized IT and technology equipment moves.",
  },
  medical: {
    name: "Medical & Lab",
    baseRate: PRICING_CONFIG.baseRates.datacenter.base,
    perSqm: PRICING_CONFIG.baseRates.datacenter.perSqm,
    minSqm: 30,
    description: "Medical facility and laboratory relocations.",
  },
  factory: {
    name: "Factory & Plant",
    baseRate: PRICING_CONFIG.baseRates.warehouse.base,
    perSqm: PRICING_CONFIG.baseRates.warehouse.perSqm,
    minSqm: 200,
    description: "Manufacturing facility and plant relocations.",
  },
  logistics: {
    name: "Logistics Hub",
    baseRate: PRICING_CONFIG.baseRates.warehouse.base,
    perSqm: PRICING_CONFIG.baseRates.warehouse.perSqm,
    minSqm: 150,
    description: "Distribution centre and logistics hub moves.",
  },
}

// Conversation context type
interface ConversationContext {
  stage: "greeting" | "service_selection" | "business_lookup" | "qualifying" | "quote" | "booking" | "human_escalation"
  businessConfirmed: boolean
  serviceType: string | null
  qualifyingAnswers: Record<string, string>
  inventoryItems: string[]
  locationOrigin: string | null
  locationDestination: string | null
  quoteAmount: number | null
  selectedDate: string | null
  contactInfo: { name?: string; email?: string; phone?: string } | null
  messageCount: number
  lastActivity: Date
  errorCount: number
}

// Helper function to get text from UIMessage
function getMessageText(message: UIMessage): string {
  if (!message) return ""

  // Check for parts array (AI SDK v5 format)
  if (message.parts && Array.isArray(message.parts)) {
    const textPart = message.parts.find((p: { type: string; text?: string }) => p.type === "text")
    if (textPart && "text" in textPart) return textPart.text || ""
  }

  // Check for content string (legacy format)
  if (typeof (message as { content?: string }).content === "string") {
    return (message as { content: string }).content
  }

  return ""
}

// Input validation
function validateUserInput(input: string): { valid: boolean; sanitized: string } {
  if (!input || typeof input !== "string") {
    return { valid: false, sanitized: "" }
  }
  const sanitized = input.trim().slice(0, 2000)
  return { valid: sanitized.length > 0, sanitized }
}

// Detect requests for human assistance
function detectHumanRequest(text: string): boolean {
  const humanKeywords = ["human", "person", "agent", "representative", "manager", "speak to someone", "real person"]
  const lower = text.toLowerCase()
  return humanKeywords.some((k) => lower.includes(k))
}

// Detect negative sentiment
function detectNegativeSentiment(text: string): boolean {
  const negativeKeywords = ["frustrated", "angry", "upset", "terrible", "awful", "hate", "worst", "ridiculous"]
  const lower = text.toLowerCase()
  return negativeKeywords.some((k) => lower.includes(k))
}

// Check conversation health
function checkConversationHealth(context: ConversationContext): { healthy: boolean; recommendation?: string } {
  if (context.errorCount > 3) {
    return { healthy: false, recommendation: "escalate" }
  }
  if (context.messageCount > 20 && !context.quoteAmount) {
    return { healthy: false, recommendation: "escalate" }
  }
  return { healthy: true }
}

// Build system prompt
function buildSystemPrompt(context: ConversationContext): string {
  let prompt = `\n\n--- CONVERSATION CONTEXT ---`
  prompt += `\nCurrent stage: ${context.stage}`
  if (context.businessConfirmed) prompt += `\nBusiness verified: Yes`
  if (context.serviceType) prompt += `\nService type: ${context.serviceType}`
  if (context.locationOrigin) prompt += `\nOrigin: ${context.locationOrigin}`
  if (context.locationDestination) prompt += `\nDestination: ${context.locationDestination}`
  if (context.quoteAmount) prompt += `\nQuote provided: $${context.quoteAmount}`
  prompt += `\n\nPRICING REFERENCE:\n${Object.entries(moveTypes)
    .map(([key, val]) => `- ${val.name}: Base $${val.baseRate} + $${val.perSqm}/sqm (min ${val.minSqm}sqm)`)
    .join("\n")}`
  prompt += `\n\nAll prices plus GST. 50% deposit required to confirm booking.`
  return prompt
}

function initializeConversationContext(messages: UIMessage[]): ConversationContext {
  const context: ConversationContext = {
    stage: "greeting",
    businessConfirmed: false,
    serviceType: null,
    qualifyingAnswers: {},
    inventoryItems: [],
    locationOrigin: null,
    locationDestination: null,
    quoteAmount: null,
    selectedDate: null,
    contactInfo: null,
    messageCount: messages.length,
    lastActivity: new Date(),
    errorCount: 0,
  }

  for (const msg of messages) {
    const text = getMessageText(msg).toLowerCase()

    // Detect service type from message content
    if (text.includes("office")) context.serviceType = "office"
    else if (text.includes("warehouse")) context.serviceType = "warehouse"
    else if (text.includes("data") || text.includes("datacenter") || text.includes("data centre"))
      context.serviceType = "datacenter"
    else if (text.includes("retail")) context.serviceType = "retail"
    else if (text.includes("it equipment") || text.includes("it ")) context.serviceType = "it_equipment"
    else if (text.includes("medical") || text.includes("lab")) context.serviceType = "medical"
    else if (text.includes("factory") || text.includes("plant")) context.serviceType = "factory"
    else if (text.includes("logistics") || text.includes("distribution")) context.serviceType = "logistics"

    // Update stage based on context
    if (context.serviceType) context.stage = "qualifying"
    if (text.includes("abn") || text.includes("business")) context.stage = "business_lookup"
    if (text.includes("quote") || text.includes("price") || text.includes("cost")) context.stage = "quote"
  }

  return context
}

const MAYA_SYSTEM_PROMPT = `You are Maya, a friendly and professional AI assistant for M&M Commercial Moving in Melbourne, Australia.

## YOUR PERSONALITY
- Warm, professional, and efficient
- Use Australian English (centre, organisation, colour)
- Keep responses concise (2-3 sentences max)
- Ask ONE question at a time

## CRITICAL: ALWAYS RESPOND
You MUST provide a helpful response to every message. Never leave the user without a reply.

## CONVERSATION FLOW
When a user selects a service (e.g., "I need help with Office Relocation" or "IT Equipment"):

1. **Acknowledge & Confirm** - Warmly confirm their selection
   Example: "Excellent choice! Office relocations are our specialty here at M&M. When are you planning to make the move?"

2. **Timeline** - Ask about their preferred date/timeframe
   Example: "Do you have a specific date in mind, or a general timeframe?"

3. **Origin Location** - Where they're moving FROM
   Example: "Great! Where is your current location? The suburb or address would be helpful."

4. **Destination** - Where they're moving TO
   Example: "And where will the equipment be going to?"

5. **Size/Scope** - Square metres or workstations
   Example: "Approximately how large is the space? You can estimate in square metres or number of workstations."

6. **Special Requirements** - Any fragile items, after-hours needs
   Example: "Are there any special requirements like fragile equipment or after-hours access?"

7. **Quote** - Provide preliminary estimate
   Example: "Based on what you've told me, your estimated quote is $X,XXX + GST. This includes..."

8. **Contact Details** - Collect name, email, phone
   Example: "To secure this quote, I just need your contact details - name, email, and phone number."

9. **Confirmation** - Confirm booking, provide reference
   Example: "Perfect! Your quote reference is MM-XXXXX. Our team will be in touch within 24 hours."

## EXAMPLE CONVERSATION
User: "I need help with IT Equipment"
Maya: "Great choice! IT equipment moves require special care, and that's exactly what we provide. When are you planning to make this move?"

User: "Next week"
Maya: "That's quite soon - we can definitely accommodate that. Where is your current location?"

User: "Melbourne CBD"
Maya: "Perfect, CBD moves are our specialty. And where will the equipment be going to?"

## HUMAN ESCALATION
If the user asks to speak to a human, seems frustrated, or if you're unsure:
- Offer to connect them with our team
- Provide phone number: 1300 123 456
- Be empathetic and understanding

## GUARDRAILS
- Stay focused on commercial moving services
- Don't discuss competitors negatively
- Don't make promises you can't keep
- If unsure about pricing, give a range and offer to have team confirm
`

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log("[v0] Received request body keys:", Object.keys(body))

    const messages: UIMessage[] = body.messages || []
    console.log("[v0] Received messages count:", messages.length)

    const lastMessage = messages[messages.length - 1]
    const userMessageText = lastMessage ? getMessageText(lastMessage) : ""
    console.log("[v0] Last user message:", userMessageText)

    // Initialize conversation context
    const conversationContext = initializeConversationContext(messages)

    // Validate user input
    const validation = validateUserInput(userMessageText)
    if (!validation.valid && validation.sanitized) {
      console.log("[v0] Input validation - using sanitized")
    }

    // Check for human escalation
    if (detectHumanRequest(userMessageText) || detectNegativeSentiment(userMessageText)) {
      conversationContext.stage = "human_escalation"
    }

    // Check conversation health
    const health = checkConversationHealth(conversationContext)
    if (!health.healthy && health.recommendation === "escalate") {
      conversationContext.stage = "human_escalation"
    }

    // Build enhanced system prompt
    const systemPrompt = MAYA_SYSTEM_PROMPT + buildSystemPrompt(conversationContext)

    // Ensure valid messages
    const validMessages: UIMessage[] =
      messages.length > 0
        ? messages
        : [
            {
              id: "initial",
              role: "user" as const,
              parts: [{ type: "text" as const, text: userMessageText || "Hello" }],
            },
          ]

    console.log("[v0] Valid messages for conversion:", validMessages.length)

    // Convert to model format
    const modelMessages = convertToModelMessages(validMessages)
    console.log("[v0] Model messages prepared:", modelMessages.length)

    console.log("[v0] Starting streamText with Claude model (no tools)")

    const result = streamText({
      model: "anthropic/claude-sonnet-4-20250514",
      system: systemPrompt,
      messages: modelMessages,
      // Tools removed - Claude will handle conversation naturally
      onFinish: ({ text, finishReason }) => {
        console.log("[v0] Stream finished - reason:", finishReason, "text length:", text?.length || 0)
      },
    })

    console.log("[v0] Returning stream response")
    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("[v0] Quote assistant error:", error)

    return new Response(
      JSON.stringify({
        error: "I apologize for the technical difficulty. Please try again or call us at 1300 123 456.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}

export async function GET() {
  return Response.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    model: "anthropic/claude-sonnet-4-20250514",
  })
}
