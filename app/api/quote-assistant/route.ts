import { streamText, convertToModelMessages, type UIMessage } from "ai"

const M2M_PHONE = "03 8820 1801"
const M2M_PHONE_LINK = "tel:0388201801"
const OPERATIONS_EMAIL = "operations@m2mmoving.au"

export const maxDuration = 60

const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(clientId: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = rateLimitMap.get(clientId)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 }
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0 }
  }

  record.count++
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - record.count }
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}, 60 * 1000)

// Helper to extract text from UIMessage
function getMessageText(message: UIMessage): string {
  if (!message) return ""
  if (typeof message.content === "string") return message.content
  if (Array.isArray(message.parts)) {
    const textPart = message.parts.find((p: { type: string }) => p.type === "text")
    if (textPart && "text" in textPart) return textPart.text
  }
  return ""
}

// Conversation context
interface ConversationContext {
  stage: string
  moveType?: string
  businessName?: string
  abn?: string
  originAddress?: string
  destinationAddress?: string
  moveDate?: string
  timeSlot?: string
  inventory?: string
  specialRequirements?: string
  quoteAmount?: number
  contactName?: string
  contactEmail?: string
  contactPhone?: string
}

function initializeConversationContext(messages: UIMessage[]): ConversationContext {
  const context: ConversationContext = { stage: "service_selected" }

  for (const msg of messages) {
    const text = getMessageText(msg).toLowerCase()

    if (
      text.includes("office") ||
      text.includes("warehouse") ||
      text.includes("data centre") ||
      text.includes("retail") ||
      text.includes("it equipment") ||
      text.includes("medical") ||
      text.includes("factory") ||
      text.includes("logistics")
    ) {
      context.moveType = text
    }
    if (text.includes("business name")) {
      context.businessName = text.replace("business name", "").trim()
      context.stage = "business_name"
    }
    if (text.includes("abn") && text.match(/\d{11}/)) {
      context.abn = text.match(/\d{11}/)?.[0]
      context.stage = "abn"
    }
    if (text.includes("street") || text.includes("road") || text.includes("avenue") || text.includes("suburb")) {
      if (!context.originAddress) {
        context.originAddress = text
        context.stage = "origin_address"
      } else if (!context.destinationAddress) {
        context.destinationAddress = text
        context.stage = "destination_address"
      }
    }
    if (
      text.includes("monday") ||
      text.includes("tuesday") ||
      text.includes("am") ||
      text.includes("pm") ||
      text.match(/\d{1,2}\/\d{1,2}/)
    ) {
      context.moveDate = text
      context.stage = "move_date"
    }
    if (text.includes("morning") || text.includes("afternoon") || text.match(/\d{1,2}:\d{2}/)) {
      context.timeSlot = text
      context.stage = "time_slot"
    }
    if (text.includes("items") || text.includes("equipment")) {
      context.inventory = text
      context.stage = "inventory"
    }
    if (text.includes("special requirements") || text.includes("stairs") || text.includes("fragile")) {
      context.specialRequirements = text
      context.stage = "special_requirements"
    }
    if (text.includes("proceed") && context.quoteAmount !== undefined) {
      context.stage = "contact_name"
    }
    if (text.includes("@")) {
      context.contactEmail = text
      context.stage = "contact_email"
    }
    if (text.match(/04\d{8}/)) {
      context.contactPhone = text
      context.stage = "contact_phone"
    }
    if (text.includes("SHOW_PAYMENT_FORM")) {
      context.stage = "payment"
    }
  }

  return context
}

function detectHumanRequest(text: string): boolean {
  const patterns = ["speak to human", "real person", "talk to someone", "customer service", "manager"]
  return patterns.some((p) => text.toLowerCase().includes(p))
}

function detectNegativeSentiment(text: string): boolean {
  const patterns = ["frustrated", "annoyed", "terrible", "worst", "hate", "useless"]
  return patterns.some((p) => text.toLowerCase().includes(p))
}

const MAYA_SYSTEM_PROMPT = `You are Maya, a friendly and professional AI assistant for M&M Commercial Moving, Australia's trusted commercial relocation specialists.

## YOUR PERSONALITY
- Warm, professional, and efficient
- Use Australian English
- Be conversational but focused on helping complete the booking
- Always guide the conversation toward the next step

## COMPANY CONTACT DETAILS
- Phone: ${M2M_PHONE} (ONLY use this number, never any other)
- Email: ${OPERATIONS_EMAIL}
- ABN: 71 661 027 309

## CRITICAL RULE: ONE QUESTION AT A TIME
**NEVER ask multiple questions in a single message.** Always:
1. Acknowledge what the user just told you
2. Ask ONLY ONE follow-up question
3. Wait for their response before asking the next question

BAD EXAMPLE: "What's your business name? And what's your ABN? Also, where are you moving from and to?"
GOOD EXAMPLE: "Thanks for choosing office relocation! What's your business name?"

## CONVERSATION FLOW - FOLLOW THIS EXACT ORDER:

### STEP 1: SERVICE TYPE (Already selected from buttons)
When user selects a service type, acknowledge it and ask for business name ONLY.
- Say: "Great choice! What's your business name?"

### STEP 2: BUSINESS NAME
After they provide business name, ask for ABN ONLY.
- Say: "Thanks! What's your ABN? (11-digit Australian Business Number)"

### STEP 3: ORIGIN ADDRESS
After ABN, ask for origin address ONLY.
- Say: "Perfect! What's the full address you're moving FROM? (Include street, suburb, state, postcode)"

### STEP 4: DESTINATION ADDRESS
After origin, ask for destination ONLY.
- Say: "Got it! And what's the full address you're moving TO?"

### STEP 5: MOVE DATE
After both addresses, ask for preferred date ONLY.
- Say: "When would you like to schedule this move?"

### STEP 6: TIME SLOT
After date, ask for time preference ONLY.
- Say: "What time works best? Morning (7am-12pm), afternoon (12pm-5pm), or a specific time?"

### STEP 7: INVENTORY
After time, ask about items ONLY.
- Say: "What items will you be moving? Any large or special equipment?"

### STEP 8: SPECIAL REQUIREMENTS
After inventory, ask about access/special needs ONLY.
- Say: "Any special requirements? (Stairs, loading dock access, fragile items, etc.)"

### STEP 9: PRESENT QUOTE
Calculate and present the quote. Then ask if they want to proceed.
- Say: "Based on your requirements, your estimated quote is $X,XXX including GST. Would you like to proceed with booking?"

### STEP 10: CONTACT NAME
After they agree, ask for contact name ONLY.
- Say: "Excellent! What's your full name for the booking?"

### STEP 11: CONTACT EMAIL
After name, ask for email ONLY.
- Say: "Thanks [Name]! What's your email address?"

### STEP 12: CONTACT PHONE
After email, ask for phone ONLY.
- Say: "And your mobile number?"

### STEP 13: PAYMENT
After all contact details, trigger payment. Include these EXACT words to trigger the payment form:
- Say: "Perfect! To secure your booking for [date], we require a 50% deposit of $[calculated_50%]. This will be deducted from your final invoice of $[total]. SHOW_PAYMENT_FORM"

### STEP 14: CONFIRMATION
After payment completes:
- Say: "Your booking is confirmed! Reference: MM-XXXXXX. You'll receive confirmation via email and SMS. Our team will contact you 24 hours before your move. Any questions?"

## IMPORTANT RULES:
1. **ONE QUESTION PER MESSAGE** - Never combine questions
2. Always acknowledge their answer before asking the next question
3. Be warm and conversational, not robotic
4. NEVER use any phone number other than ${M2M_PHONE}
5. If user provides extra info, acknowledge it and continue to the next step
6. For human escalation, say: "I'll connect you with our team. Please call ${M2M_PHONE}."

## PRICING GUIDE:
- Office Relocation: $150-250/hour (2-hour minimum)
- Warehouse Move: $200-350/hour
- IT Equipment: $180-280/hour
- Medical/Lab: $250-400/hour
- Data Centre: $300-500/hour
- Retail Fit-out: $180-300/hour
- Factory/Plant: $250-450/hour
- Logistics Hub: $200-350/hour

All prices + GST. Deposit: 50% of quote total (deducted from final invoice).
`

export async function POST(req: Request) {
  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "anonymous"

    const rateLimit = checkRateLimit(clientIp)

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: `Too many requests. Please wait a moment before trying again, or call us at ${M2M_PHONE}.`,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Date.now() + RATE_LIMIT_WINDOW),
          },
        },
      )
    }

    const body = await req.json()
    const messages: UIMessage[] = body.messages || []

    const lastMessage = messages[messages.length - 1]
    const userMessageText = lastMessage ? getMessageText(lastMessage) : ""

    // Initialize conversation context
    const conversationContext = initializeConversationContext(messages)

    // Check for human escalation
    if (detectHumanRequest(userMessageText) || detectNegativeSentiment(userMessageText)) {
      conversationContext.stage = "human_escalation"
    }

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

    // Convert to model format
    const modelMessages = convertToModelMessages(validMessages)

    const result = streamText({
      model: "anthropic/claude-sonnet-4-20250514",
      system: MAYA_SYSTEM_PROMPT,
      messages: modelMessages,
      onFinish: ({ text, finishReason }) => {
        console.log("[v0] Stream finished - reason:", finishReason, "text length:", text?.length || 0)
      },
    })

    const response = result.toUIMessageStreamResponse()
    response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining))

    return response
  } catch (error) {
    console.error("[v0] Quote assistant error:", error)

    return new Response(
      JSON.stringify({
        error: `I apologize for the technical difficulty. Please try again or call us at ${M2M_PHONE}.`,
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
    service: "Maya Quote Assistant",
    phone: M2M_PHONE,
  })
}
