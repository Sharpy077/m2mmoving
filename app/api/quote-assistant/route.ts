import { convertToCoreMessages, streamText } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { MAYA_SYSTEM_PROMPT, PRICING_CONFIG } from "@/lib/agents/maya/playbook"
import { ErrorClassifier } from "@/lib/conversation/error-classifier"
import {
  validateResponse,
  validateUserInput,
  checkConversationHealth,
  shouldEscalateToHuman,
} from "@/lib/conversation/guardrails"
import { detectHumanRequest, detectNegativeSentiment } from "@/lib/conversation/human-escalation"
import * as fs from "fs"
import * as path from "path"

function logToFile(message: string) {
  try {
    const logPath = path.join(process.cwd(), "debug.log")
    fs.appendFileSync(logPath, new Date().toISOString() + " " + message + "\n")
  } catch (e) {
    // ignore
  }
}

export const maxDuration = 60

// Map PRICING_CONFIG to the route's moveTypes structure with qualifying questions
const moveTypes = {
  office: {
    name: "Office Relocation",
    baseRate: PRICING_CONFIG.baseRates.office.base,
    perSqm: PRICING_CONFIG.baseRates.office.perSqm,
    minSqm: PRICING_CONFIG.baseRates.office.minSqm,
    description: "Complete office moves including workstations, furniture, and equipment.",
    icon: "building",
    qualifyingQuestions: [
      "How many workstations or desks need to be moved?",
      "Do you have any server rooms or IT infrastructure?",
      "Are there any large items like boardroom tables or reception desks?",
    ],
  },
  warehouse: {
    name: "Warehouse Relocation",
    baseRate: PRICING_CONFIG.baseRates.warehouse.base,
    perSqm: PRICING_CONFIG.baseRates.warehouse.perSqm,
    minSqm: PRICING_CONFIG.baseRates.warehouse.minSqm,
    description: "Industrial and warehouse moves with heavy equipment handling.",
    icon: "warehouse",
    qualifyingQuestions: [
      "Do you have pallet racking that needs to be moved?",
      "Is there any heavy machinery or forklifts?",
      "What type of stock or inventory will be moved?",
    ],
  },
  datacenter: {
    name: "Data Centre Migration",
    baseRate: PRICING_CONFIG.baseRates.datacenter.base,
    perSqm: PRICING_CONFIG.baseRates.datacenter.perSqm,
    minSqm: PRICING_CONFIG.baseRates.datacenter.minSqm,
    description: "Specialised data centre relocations with anti-static handling.",
    icon: "server",
    qualifyingQuestions: [
      "How many server racks need to be relocated?",
      "Is there a maximum downtime window we need to work within?",
      "Do you need us to coordinate with your IT team for reconnection?",
    ],
  },
  "it-equipment": {
    name: "IT Equipment Transport",
    baseRate: PRICING_CONFIG.baseRates.it.base,
    perSqm: PRICING_CONFIG.baseRates.it.perSqm,
    minSqm: PRICING_CONFIG.baseRates.it.minSqm,
    description: "Safe transport of computers, servers, and networking equipment.",
    icon: "computer",
    qualifyingQuestions: [
      "Approximately how many computers and monitors are being moved?",
      "Are there any servers or network switches included?",
      "Do you need packing materials for fragile equipment?",
    ],
  },
  retail: {
    name: "Retail Store Relocation",
    baseRate: PRICING_CONFIG.baseRates.retail.base,
    perSqm: PRICING_CONFIG.baseRates.retail.perSqm,
    minSqm: PRICING_CONFIG.baseRates.retail.minSqm,
    description: "Retail fit-out moves including displays, POS systems, and stock.",
    icon: "store",
    qualifyingQuestions: [
      "Do you have display fixtures or shelving that needs to be moved?",
      "Is there refrigeration equipment or other specialised fixtures?",
      "Will stock be included in the move?",
    ],
  },
}

// Map additional services from PRICING_CONFIG
const additionalServices = {
  packing: {
    name: "Professional Packing",
    price: PRICING_CONFIG.additionalServices.packing.price,
    description: PRICING_CONFIG.additionalServices.packing.description,
  },
  storage: {
    name: "Temporary Storage (per week)",
    price: PRICING_CONFIG.additionalServices.storage.price,
    description: PRICING_CONFIG.additionalServices.storage.description,
  },
  cleaning: {
    name: "Post-Move Cleaning",
    price: PRICING_CONFIG.additionalServices.cleaning.price,
    description: PRICING_CONFIG.additionalServices.cleaning.description,
  },
  insurance: {
    name: "Premium Insurance",
    price: PRICING_CONFIG.additionalServices.insurance.price,
    description: PRICING_CONFIG.additionalServices.insurance.description,
  },
  afterhours: {
    name: "After Hours Service",
    price: PRICING_CONFIG.additionalServices.afterHours.price,
    description: PRICING_CONFIG.additionalServices.afterHours.description,
  },
  itsetup: {
    name: "IT Setup Assistance",
    price: PRICING_CONFIG.additionalServices.itSetup.price,
    description: PRICING_CONFIG.additionalServices.itSetup.description,
  },
  // Keep explicit ones that might not be in config but are needed for UI
  unpacking: { name: "Unpacking Service", price: 350, description: "Unpack and set up at destination" },
  weekend: { name: "Weekend Service", price: 400, description: "Saturday or Sunday moves" },
  furniture: { name: "Furniture Assembly", price: 400, description: "Disassemble and reassemble furniture" },
  disposal: { name: "Rubbish Removal", price: 250, description: "Remove unwanted items and dispose" },
}

const operationalPrompt = `
CRITICAL CONVERSATION RULES:
1. Ask ONE question at a time - never overwhelm users.
2. ALWAYS acknowledge what the user said before asking the next question.
3. ALWAYS respond after a user selects an option - never leave them hanging.
4. Use tools immediately when you have the information needed.
5. Keep the conversation moving forward smoothly to the next stage (Discovery -> Qualification -> Quote -> Booking).
6. If a user selects a service option, acknowledge it immediately and ask the next qualifying question.

CONVERSATION FLOW:

STEP 1 - WELCOME & IDENTIFY BUSINESS:
"G'day! I'm Maya, your M&M Moving assistant. I'll help you get a quote in just a few minutes. First, what's your business name or ABN so I can look up your details?"
(Use lookupBusiness immediately if ABN/Name provided)

STEP 2 - CONFIRM BUSINESS:
"I found [Business Name]. Is this correct?"
(Use showServiceOptions immediately after confirmation)

STEP 3 - SELECT SERVICE TYPE:
After business is confirmed, use showServiceOptions.
"What type of move are you planning?"
CRITICAL: When user selects a service (e.g., "I need Office Relocation"), you MUST:
- Acknowledge their selection: "Great! Office relocation is one of our specialties."
- Immediately ask the first qualifying question for that service type.
- Do NOT just say "okay" or remain silent.

STEP 4 - QUALIFYING QUESTIONS (Mandatory):
Once the user selects a move type (or types it), you MUST ask the relevant qualifying questions to gauge the size and complexity.
- Office: "How many workstations or desks need to be moved?"
- Warehouse: "Do you have pallet racking that needs to be moved?"
- Data Centre: "How many server racks need to be relocated?"
- IT: "Approximately how many computers and monitors are being moved?"
- Retail: "Do you have display fixtures or shelving that needs to be moved?"

STEP 5 - LOCATIONS:
"Where are you moving from? (Suburb)"
"And where are you moving to?"

STEP 6 - GENERATE QUOTE:
Use calculateQuoteTool once you have Type, Size (Sqm/Desks), and Locations.
Present the quote and checkAvailability.

STEP 7 - SELECT DATE & DETAILS:
"When would you like to move?"
Then collect Name, Phone, Email.

STEP 8 - PAYMENT:
"To lock in your booking, we just need a 50% deposit. You can pay securely right here."
Use initiatePayment.

HANDLING QUICK STARTS:
If user starts with "I need to move my office", immediately Confirm "Office Relocation" and ask for Business Name.

RESPONSE REQUIREMENTS:
- After ANY option selection, you MUST respond with acknowledgment AND continue the conversation.
- Never leave a user message unanswered.
- If you're unsure what to say, ask a clarifying question rather than staying silent.
- After calling ANY tool, you MUST provide a text response to the user explaining what happened and what's next.
- Tool calls alone are not sufficient - always follow up with a conversational text response.
- Example: After calling showServiceOptions, say "Great! I've shown you our service options. Which type of move are you planning?"
`

const systemPrompt = `${MAYA_SYSTEM_PROMPT}\n\n${operationalPrompt}`

const lookupBusinessTool = {
  description:
    "Look up an Australian business by name or ABN. Use immediately when customer mentions their company name or ABN.",
  inputSchema: z.object({
    query: z.string().describe("Business name or ABN to search for"),
    searchType: z.string().describe("Type of search - 'name' or 'abn'"),
  }),
  execute: async ({ query, searchType }: { query: string; searchType: string }) => {
    try {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || "http://localhost:3000"

      // In a real scenario, this would call the ABR API.
      // For now, we return valid mock data for testing flow if API fails or for generic queries
      if (query.toLowerCase().includes("test") || query.toLowerCase().includes("sample")) {
        return {
          success: true,
          results: [
            {
              abn: "71661027309",
              name: "Sample Business Pty Ltd",
              tradingName: "M&M Sample Client",
              entityType: "Australian Private Company",
              state: "VIC",
              postcode: "3000",
              status: "Active",
            },
          ],
          message: "Found: Sample Business Pty Ltd (ABN: 71661027309)",
        }
      }

      const response = await fetch(`${baseUrl}/api/business-lookup?q=${encodeURIComponent(query)}&type=${searchType}`)

      if (!response.ok) {
        // Fallback to mock on error to keep flow going
        return { success: false, error: "Failed to lookup business", results: [] }
      }

      const data = await response.json()

      if (data.results && data.results.length > 0) {
        return {
          success: true,
          results: data.results.map((r: any) => ({
            abn: r.abn,
            name: r.name,
            tradingName: r.tradingName || null,
            entityType: r.entityType || null,
            state: r.state,
            postcode: r.postcode,
            status: r.status || "Active",
          })),
          message:
            data.results.length === 1
              ? `Found: ${data.results[0].name} (ABN: ${data.results[0].abn})`
              : `Found ${data.results.length} matching businesses`,
        }
      }

      return {
        success: false,
        results: [],
        message: "No businesses found. No worries - we can proceed without the ABN. What's your company name?",
      }
    } catch (error) {
      // Fallback mock
      return { success: false, error: "Lookup service unavailable", results: [] }
    }
  },
}

const confirmBusinessTool = {
  description: "Confirm the business details after customer validates the lookup result",
  inputSchema: z.object({
    name: z.string().describe("Confirmed business name"),
    abn: z.string().describe("Confirmed ABN"),
    entityType: z.string().describe("Business entity type"),
    state: z.string().describe("Business state"),
  }),
  execute: async ({
    name,
    abn,
    entityType,
    state,
  }: { name: string; abn: string; entityType: string; state: string }) => {
    return {
      success: true,
      confirmed: true,
      name,
      abn,
      entityType,
      state,
      showServiceOptions: true,
      message: `Great! I've got ${name} on file. Now, what type of move are you planning?`,
    }
  },
}

const showServiceOptionsTool = {
  description:
    "Display the visual service type picker for the customer to choose their move type. Use after business is confirmed or at start of conversation.",
  inputSchema: z.object({
    context: z
      .string()
      .describe("Brief context about why showing options, e.g. 'after_business_confirmed' or 'initial'"),
  }),
  execute: async ({ context }: { context: string }) => {
    return {
      success: true,
      showServicePicker: true,
      services: [
        { id: "office", name: "Office Relocation", icon: "building", description: "Desks, furniture, equipment" },
        { id: "warehouse", name: "Warehouse Move", icon: "warehouse", description: "Racking, machinery, stock" },
        { id: "datacenter", name: "Data Centre", icon: "server", description: "Servers, racks, IT infrastructure" },
        { id: "it-equipment", name: "IT Equipment", icon: "computer", description: "Computers, monitors, networks" },
        { id: "retail", name: "Retail Store", icon: "store", description: "Fixtures, displays, POS systems" },
      ],
      message: "Please select the type of move you need:",
    }
  },
}

const checkAvailabilityTool = {
  description: "Check available dates for scheduling. Use after generating a quote to show booking options.",
  inputSchema: z.object({
    monthName: z.string().describe("Month to check, e.g. 'December 2024'"),
    moveUrgency: z.string().describe("Urgency level - 'asap', 'flexible', or 'specific'"),
  }),
  execute: async ({ monthName, moveUrgency }: { monthName: string; moveUrgency: string }) => {
    try {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || "http://localhost:3000"

      const startDate = new Date().toISOString().split("T")[0]
      const endDate = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

      const response = await fetch(`${baseUrl}/api/availability?start=${startDate}&end=${endDate}`)

      if (!response.ok) {
        return {
          success: true,
          showCalendar: true,
          dates: generateFallbackDates(),
          message:
            moveUrgency === "asap"
              ? "Good news - we have availability soon! Select your preferred date:"
              : "Here are our available dates. When works best for you?",
        }
      }

      const data = await response.json()
      const availableDates = data.availability
        ?.filter((d: any) => d.is_available && d.current_bookings < d.max_bookings)
        .map((d: any) => ({
          date: d.date,
          available: true,
          slots: d.max_bookings - d.current_bookings,
        }))

      return {
        success: true,
        showCalendar: true,
        dates: availableDates || generateFallbackDates(),
        message:
          moveUrgency === "asap"
            ? "Good news - we have availability soon! Select your preferred date:"
            : "Here are our available dates for the coming weeks:",
      }
    } catch (error) {
      return {
        success: true,
        showCalendar: true,
        dates: generateFallbackDates(),
        message: "Select your preferred moving date:",
      }
    }
  },
}

const confirmBookingDateTool = {
  description: "Confirm a specific date the customer has selected",
  inputSchema: z.object({
    selectedDate: z.string().describe("Selected date in YYYY-MM-DD format"),
  }),
  execute: async ({ selectedDate }: { selectedDate: string }) => {
    return {
      success: true,
      confirmedDate: selectedDate,
      message: `Perfect! ${formatDate(selectedDate)} is locked in. Now I just need your contact details to finalise the booking.`,
    }
  },
}

const calculateQuoteTool = {
  description: "Calculate quote estimate. Use once you have move type, size, and locations.",
  inputSchema: z.object({
    moveType: z.string().describe("Move type: office, warehouse, datacenter, it-equipment, or retail"),
    squareMeters: z.number().describe("Size in square metres"),
    originSuburb: z.string().describe("Origin suburb"),
    destinationSuburb: z.string().describe("Destination suburb"),
    estimatedDistanceKm: z.number().describe("Estimated distance in km (use 15 if unknown)"),
    additionalServicesList: z.string().describe("Comma-separated additional services"),
  }),
  execute: async ({
    moveType,
    squareMeters,
    originSuburb,
    destinationSuburb,
    estimatedDistanceKm,
    additionalServicesList,
  }: {
    moveType: string
    squareMeters: number
    originSuburb: string
    destinationSuburb: string
    estimatedDistanceKm: number
    additionalServicesList: string
  }) => {
    const type = moveTypes[moveType as keyof typeof moveTypes] || moveTypes.office
    const effectiveSqm = Math.max(squareMeters, type.minSqm)
    let total = type.baseRate + type.perSqm * effectiveSqm

    const distanceCost = estimatedDistanceKm ? estimatedDistanceKm * 8 : 0
    total += distanceCost

    let crewSize = 2
    let truckSize = "Medium (45m³)"
    if (effectiveSqm > 100) {
      crewSize = 4
      truckSize = "Large (75m³)"
    } else if (effectiveSqm > 50) {
      crewSize = 3
      truckSize = "Large (75m³)"
    }

    const estimatedHours =
      Math.ceil(effectiveSqm / 15) + (estimatedDistanceKm ? Math.ceil(estimatedDistanceKm / 30) : 1)

    const serviceDetails: { name: string; price: number }[] = []
    let servicesCost = 0

    const services = additionalServicesList
      ? additionalServicesList
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      : []

    services.forEach((serviceId: string) => {
      const service = additionalServices[serviceId as keyof typeof additionalServices]
      if (service) {
        total += service.price
        servicesCost += service.price
        serviceDetails.push({ name: service.name, price: service.price })
      }
    })

    const estimate = Math.round(total)
    const depositAmount = Math.round(estimate * 0.5)

    return {
      moveType: type.name,
      moveTypeKey: moveType,
      squareMeters: effectiveSqm,
      origin: originSuburb,
      destination: destinationSuburb,
      distance: estimatedDistanceKm,
      additionalServices: serviceDetails.map((s) => s.name),
      estimatedTotal: estimate,
      depositRequired: depositAmount,
      estimatedHours,
      crewSize,
      truckSize,
      showAvailability: true,
      breakdown: [
        { label: "Base Rate", amount: type.baseRate },
        { label: `Area (${effectiveSqm}sqm × $${type.perSqm})`, amount: type.perSqm * effectiveSqm },
        ...(distanceCost > 0 ? [{ label: "Distance", amount: distanceCost }] : []),
        ...(servicesCost > 0 ? [{ label: "Additional Services", amount: servicesCost }] : []),
      ],
    }
  },
}

const collectContactInfoTool = {
  description: "Collect customer contact details before payment.",
  inputSchema: z.object({
    contactName: z.string().describe("Customer's full name"),
    email: z.string().describe("Customer's email"),
    phone: z.string().describe("Customer's phone number"),
    companyName: z.string().describe("Company name"),
    scheduledDate: z.string().describe("Moving date in YYYY-MM-DD format"),
  }),
  execute: async ({
    contactName,
    email,
    phone,
    companyName,
    scheduledDate,
  }: {
    contactName: string
    email: string
    phone: string
    companyName: string
    scheduledDate: string
  }) => {
    return {
      success: true,
      collected: true,
      contactName,
      email,
      phone,
      companyName,
      scheduledDate,
      message: `Thanks ${contactName.split(" ")[0]}! To secure your booking for ${formatDate(scheduledDate)}, we just need the 50% deposit.`,
    }
  },
}

const initiatePaymentTool = {
  description: "Show Stripe payment form for deposit.",
  inputSchema: z.object({
    amount: z.number().describe("Deposit amount in dollars"),
    customerEmail: z.string().describe("Customer email"),
    customerName: z.string().describe("Customer name"),
    description: z.string().describe("Payment description"),
  }),
  execute: async ({
    amount,
    customerEmail,
    customerName,
    description,
  }: {
    amount: number
    customerEmail: string
    customerName: string
    description: string
  }) => {
    return {
      success: true,
      showPayment: true,
      amount,
      customerEmail,
      customerName,
      description,
      message: `Secure your booking with a $${amount.toLocaleString()} deposit. You'll receive a confirmation email and invoice once complete.`,
    }
  },
}

const requestCallbackTool = {
  description: "Request a callback for complex enquiries or when customer prefers to speak with someone.",
  inputSchema: z.object({
    name: z.string().describe("Customer name"),
    phone: z.string().describe("Phone number"),
    preferredTime: z.string().describe("Preferred callback time"),
    reason: z.string().describe("Brief reason for callback"),
  }),
  execute: async ({
    name,
    phone,
    preferredTime,
    reason,
  }: {
    name: string
    phone: string
    preferredTime: string
    reason: string
  }) => {
    return {
      success: true,
      callbackRequested: true,
      message: `No worries! I've arranged for our team to call you ${preferredTime}. They'll be in touch at ${phone} shortly.`,
    }
  },
}

const tools = {
  lookupBusiness: lookupBusinessTool,
  confirmBusiness: confirmBusinessTool,
  showServiceOptions: showServiceOptionsTool,
  checkAvailability: checkAvailabilityTool,
  confirmBookingDate: confirmBookingDateTool,
  calculateQuote: calculateQuoteTool,
  collectContactInfo: collectContactInfoTool,
  initiatePayment: initiatePaymentTool,
  requestCallback: requestCallbackTool,
} as const

/**
 * Create error stream response
 */
function createErrorStreamResponse(error: unknown, userMessage?: string): Response {
  const classified = ErrorClassifier.classify(error)
  logToFile(`[v0] Error classified as: ${classified.type}, message: ${classified.message}`)

  // Try to create a helpful error response via AI
  try {
    const errorPrompt = userMessage
      ? `The user said: "${userMessage}". I encountered a ${classified.type} error. Please acknowledge this gracefully and offer to help them continue. Be brief and helpful.`
      : `I encountered a ${classified.type} error. Please acknowledge this gracefully and offer to help the user continue. Be brief and helpful.`

    const errorResult = streamText({
      model: openai("gpt-4o"),
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: errorPrompt,
        },
      ],
      maxSteps: 1,
      maxTokens: 200, // Keep error responses short
    })

    return errorResult.toTextStreamResponse()
  } catch (fallbackError) {
    // Last resort: return a simple JSON error that client can handle
    const errorMessage = classified.message || "I'm having trouble connecting right now. Please try again in a moment."

    // Create a text stream response manually
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: errorMessage })}\n\n`))
        controller.close()
      },
    })

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  }
}

interface ConversationContext {
  stage: string
  errorCount: number
  lastMessageTime: number
  stageStartTime: number
  businessName?: string
  quoteAmount?: number
}

// In-memory context store (for stateless API, context is passed in request)
const contextStore = new Map<string, ConversationContext>()

export async function POST(req: Request) {
  let userMessage: string | undefined

  try {
    const body = await req.json()
    logToFile("[v0] Request body parsed: " + JSON.stringify(body).slice(0, 100))
    const rawMessages = body.messages || []
    const conversationId = body.id || `conv-${Date.now()}`

    // Extract last user message for error context
    const lastUserMsg = rawMessages.findLast((m: any) => m.role === "user")
    userMessage = lastUserMsg?.content || lastUserMsg?.parts?.[0]?.text

    if (userMessage) {
      const inputValidation = validateUserInput(userMessage, (body.stage || "greeting") as any)
      if (!inputValidation.valid) {
        logToFile(`[v0] Input validation failed: ${inputValidation.warnings.join(", ")}`)
      }
      userMessage = inputValidation.sanitized

      // Check for human escalation requests
      if (detectHumanRequest(userMessage)) {
        logToFile("[v0] Human escalation request detected")
        // Add system message to guide AI to offer human assistance
        rawMessages.push({
          role: "system",
          content:
            "The customer is requesting to speak with a human. Acknowledge their request warmly and offer to arrange a callback. Ask for their preferred contact number and best time to call.",
        })
      }

      // Check for negative sentiment
      if (detectNegativeSentiment(userMessage)) {
        logToFile("[v0] Negative sentiment detected")
        rawMessages.push({
          role: "system",
          content:
            "The customer seems frustrated. Acknowledge their feelings, apologize for any difficulties, and offer extra assistance. Consider offering to have someone call them.",
        })
      }
    }

    const context = contextStore.get(conversationId) || {
      stage: body.stage || "greeting",
      errorCount: 0,
      lastMessageTime: Date.now(),
      stageStartTime: Date.now(),
    }

    // Update context
    context.lastMessageTime = Date.now()
    if (body.stage && body.stage !== context.stage) {
      context.stage = body.stage
      context.stageStartTime = Date.now()
    }

    const health = checkConversationHealth(context as any)
    if (health.status === "critical") {
      logToFile(`[v0] Conversation health critical: ${health.issues.join(", ")}`)
      // Add recovery guidance for the AI
      rawMessages.push({
        role: "system",
        content: `Conversation health is critical (score: ${health.score}). Issues: ${health.issues.join(", ")}. Actions needed: ${health.actions.join(", ")}. Prioritize recovering the customer's trust.`,
      })
    }

    const escalationCheck = shouldEscalateToHuman(context as any)
    if (escalationCheck.shouldEscalate) {
      logToFile(`[v0] Escalation warranted: ${escalationCheck.reason}`)
      rawMessages.push({
        role: "system",
        content: `Multiple issues detected (${escalationCheck.reason}). Proactively offer to have a team member call the customer. Make this offer naturally without alarming them.`,
      })
    }

    // Detect if this is an initial message
    const isInitialMessage =
      rawMessages.length === 0 ||
      (rawMessages.length === 1 &&
        rawMessages[0].role === "user" &&
        (rawMessages[0].content === "start" ||
          rawMessages[0].content === "Start" ||
          rawMessages[0].content === "" ||
          rawMessages[0].parts?.[0]?.text?.includes("I'd like to get a quote")))

    const effectiveMessages = isInitialMessage
      ? [{ role: "user" as const, content: "Hi, I'd like to get a quote for a commercial move." }]
      : rawMessages

    logToFile(`[v0] Effective messages prepared (initial: ${isInitialMessage}), calling streamText with model gpt-4o`)

    const result = streamText({
      model: openai("gpt-4o"),
      system: systemPrompt,
      messages: convertToCoreMessages(effectiveMessages),
      tools,
      maxSteps: 5,
      onFinish: (result) => {
        logToFile("[v0] streamText finish: " + JSON.stringify(result.usage, null, 2))

        const toolCallNames = result.toolCalls?.map((tc) => tc.toolName) || []
        const responseValidation = validateResponse(
          result.text || "",
          toolCallNames,
          context.stage as any,
          userMessage || "",
        )

        if (!responseValidation.passed) {
          logToFile(
            `[v0] Response validation failed: ${responseValidation.violations.map((v) => v.message).join(", ")}`,
          )
          // Note: In streaming, we can't modify the response here, but we log for monitoring
        }

        if (responseValidation.recommendations.length > 0) {
          logToFile(`[v0] Response recommendations: ${responseValidation.recommendations.join(", ")}`)
        }

        // Update context store
        contextStore.set(conversationId, context)

        if (result.error) {
          logToFile("[v0] streamText finished with error: " + JSON.stringify(result.error))
          context.errorCount++
        }
      },
      onError: ({ error }) => {
        logToFile("[v0] streamText error callback: " + error)
        context.errorCount++
        contextStore.set(conversationId, context)
      },
    })

    logToFile("[v0] streamText initiated, returning stream")

    return result.toTextStreamResponse()
  } catch (error) {
    logToFile("[v0] Quote assistant FATAL error: " + error)
    if (error instanceof Error) {
      logToFile("[v0] Stack: " + error.stack)
    }

    return createErrorStreamResponse(error, userMessage)
  }
}

// Health check endpoint
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const detailed = searchParams.get("detailed") === "true"

  try {
    // Basic health check
    const health = {
      status: "healthy" as const,
      timestamp: new Date().toISOString(),
    }

    if (detailed) {
      // Detailed health check with OpenAI connectivity test
      try {
        // Quick test to see if OpenAI is accessible
        const testResult = await fetch("https://api.openai.com/v1/models", {
          method: "HEAD",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}`,
          },
        })

        return Response.json({
          ...health,
          checks: {
            openai: testResult.ok ? "healthy" : "degraded",
            api: "healthy",
          },
        })
      } catch (checkError) {
        return Response.json({
          ...health,
          status: "degraded" as const,
          checks: {
            openai: "unhealthy",
            api: "healthy",
          },
        })
      }
    }

    return Response.json(health)
  } catch (error) {
    return Response.json(
      {
        status: "unhealthy" as const,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

function formatDate(date: string): string {
  const options = { year: "numeric", month: "long", day: "numeric" }
  return new Date(date).toLocaleDateString(undefined, options)
}

function generateFallbackDates(): any[] {
  // Placeholder for fallback date generation logic
  return []
}
