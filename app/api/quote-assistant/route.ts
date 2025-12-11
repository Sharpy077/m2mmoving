import { streamText, convertToModelMessages, type UIMessage } from "ai"

const M2M_PHONE = "03 8820 1801"
const M2M_PHONE_LINK = "tel:0388201801"
const OPERATIONS_EMAIL = "operations@m2mmoving.au"

export const maxDuration = 60

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
  hasBusinessInfo?: boolean
  hasAddresses?: boolean
  hasDateTime?: boolean
  hasContactInfo?: boolean
  quoteAmount?: number
}

function initializeConversationContext(messages: UIMessage[]): ConversationContext {
  const context: ConversationContext = { stage: "greeting" }

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
      context.stage = "service_selected"
    }
    if (text.includes("abn") || text.includes("pty ltd") || text.includes("business")) {
      context.hasBusinessInfo = true
      context.stage = "business_info"
    }
    if (text.includes("street") || text.includes("road") || text.includes("avenue") || text.includes("suburb")) {
      context.hasAddresses = true
      context.stage = "addresses"
    }
    if (
      text.includes("monday") ||
      text.includes("tuesday") ||
      text.includes("am") ||
      text.includes("pm") ||
      text.match(/\d{1,2}\/\d{1,2}/)
    ) {
      context.hasDateTime = true
      context.stage = "datetime"
    }
    if (text.includes("@") || text.match(/04\d{8}/)) {
      context.hasContactInfo = true
      context.stage = "contact"
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

## CONVERSATION FLOW - FOLLOW THIS EXACT ORDER:

### STEP 1: SERVICE TYPE (Already selected from buttons)
When user selects a service type, acknowledge it warmly and move to Step 2.

### STEP 2: BUSINESS DETAILS
Ask for their business information:
- Company name
- ABN (Australian Business Number - 11 digits)
- Say: "Great choice! To get started, I'll need your company details. What's your business name and ABN?"

### STEP 3: ADDRESSES (Full details required)
After business info, ask for COMPLETE addresses:
- Origin: Full street address, suburb, state, postcode
- Destination: Full street address, suburb, state, postcode
- Say: "Thanks! Now I need the move locations. What's the FULL address you're moving FROM? (Street number, street name, suburb, state, postcode)"
- Then ask: "And the FULL address you're moving TO?"

### STEP 4: DATE & TIME SELECTION
After addresses, ask for preferred date and time:
- Say: "When would you like to schedule this move? Please provide your preferred date and time slot (morning 7am-12pm, afternoon 12pm-5pm, or a specific time)."
- Confirm: "Just to confirm, you'd like [DATE] at [TIME]. Is that correct?"

### STEP 5: INVENTORY & SPECIAL REQUIREMENTS
Ask about what they're moving:
- Estimated items/volume
- Any special equipment (servers, medical equipment, etc.)
- Access requirements (lifts, stairs, loading docks)
- Say: "What items will you be moving? Any special equipment or access requirements I should note?"

### STEP 6: CALCULATE & PRESENT QUOTE
Based on the information, provide a quote estimate:
- Base rate: $150/hour for standard moves
- Add premiums for: special equipment (+20%), stairs (+$50/floor), after-hours (+30%)
- Include GST in final price
- Say: "Based on your requirements, your estimated quote is $X,XXX including GST. This includes [list services]."

### STEP 7: CONTACT DETAILS FOR CONFIRMATION
Collect contact information:
- Full name of contact person
- Email address
- Mobile phone number
- Say: "To confirm this booking and send you the details, I'll need your contact information - name, email, and mobile number."

### STEP 8: PAYMENT
After collecting all details:
- Say: "Excellent! To secure your booking, we require a $200 deposit. This will be deducted from your final invoice. I'll now show you our secure payment form."
- The system will display a Stripe payment form.

### STEP 9: CONFIRMATION
After payment:
- Generate a quote reference number (format: MM-XXXXXX)
- Confirm email and SMS will be sent
- Say: "Your booking is confirmed! Reference number: MM-XXXXXX. You'll receive a confirmation email and SMS shortly. Our operations team at ${OPERATIONS_EMAIL} will contact you 24 hours before your move. Any questions?"

## IMPORTANT RULES:
1. ALWAYS guide the user to the next step - don't wait for them to ask
2. If user provides partial info, acknowledge what you have and ask for what's missing
3. NEVER use any phone number other than ${M2M_PHONE}
4. Be proactive - after each response, tell them what comes next
5. If they seem stuck, offer helpful suggestions
6. For human escalation, say: "I'll connect you with our team. Please call ${M2M_PHONE} and reference your conversation."

## PRICING GUIDE:
- Office Relocation: $150-250/hour (2-hour minimum)
- Warehouse Move: $200-350/hour
- IT Equipment: $180-280/hour (specialized handling)
- Medical/Lab: $250-400/hour (compliance requirements)
- Data Centre: $300-500/hour (24/7 availability)
- Retail Fit-out: $180-300/hour
- Factory/Plant: $250-450/hour
- Logistics Hub: $200-350/hour

All prices + GST. Deposit: $200 (deducted from final invoice).
`

export async function POST(req: Request) {
  try {
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

    return result.toUIMessageStreamResponse()
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
