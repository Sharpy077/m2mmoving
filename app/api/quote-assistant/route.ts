import { convertToCoreMessages, streamText } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { MAYA_SYSTEM_PROMPT, PRICING_CONFIG } from "@/lib/agents/maya/playbook"
import { ErrorClassifier } from "@/lib/conversation/error-classifier"
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
  unpacking: { name: "Unpacking Service", price: 350, description: "Unpack and set up at destination" },
  weekend: { name: "Weekend Service", price: 400, description: "Saturday or Sunday moves" },
  furniture: { name: "Furniture Assembly", price: 400, description: "Disassemble and reassemble furniture" },
  disposal: { name: "Rubbish Removal", price: 250, description: "Remove unwanted items and dispose" },
}

const operationalPrompt = `
CRITICAL CONVERSATION RULES - YOU MUST FOLLOW THESE:

1. NEVER leave the user without a response. Every user message MUST get a reply.
2. ALWAYS acknowledge what the user said before asking the next question.
3. Ask ONE question at a time - never overwhelm users.
4. After ANY tool call, you MUST provide a text response explaining what happened AND what's next.
5. Keep the conversation moving forward smoothly.

MANDATORY RESPONSE PATTERN:
After EVERY interaction, your response MUST contain:
1. Acknowledgment of what the user said/did
2. A clear next step or question
Example: "Great choice! Office relocation is one of our most popular services. Now, to give you an accurate quote, I need to understand the size of your move. How many workstations or desks need to be moved?"

CONVERSATION FLOW:

STEP 1 - GREETING:
"G'day! I'm Maya, your M&M Moving assistant. I'll help you get a quote in just a few minutes. First, what's your business name or ABN so I can look up your details?"

STEP 2 - BUSINESS LOOKUP:
When user provides business name or ABN, use lookupBusiness tool.
THEN respond: "I found [Business Name]. Is this the right business?"

STEP 3 - BUSINESS CONFIRMED:
After confirmation, use showServiceOptions tool.
THEN respond: "Perfect! I've noted your business details. What type of move are you planning? Select from the options I've shown, or just tell me."

STEP 4 - SERVICE SELECTED (CRITICAL - THIS IS WHERE THE FLOW OFTEN BREAKS):
When user selects a service type (e.g., "Office Relocation" or "I need to move my office"):
- ACKNOWLEDGE: "Excellent choice! [Service type] is one of our specialties."
- USE showInventoryPicker tool if available, OR ask qualifying questions
- FOLLOW UP: "To give you an accurate quote, I need to understand the scope. How many workstations or desks will be moving?"

STEP 5 - GATHER SIZE INFO:
Based on service type, ask relevant qualifying questions:
- Office: "How many workstations?" then "Do you have any server rooms or large furniture?"
- Warehouse: "Do you have pallet racking?" then "Any heavy machinery?"
- Data Centre: "How many server racks?" then "What's your downtime window?"
- IT Equipment: "How many computers and monitors?" then "Any servers?"
- Retail: "Do you have display fixtures?" then "Any refrigeration?"

STEP 6 - LOCATIONS:
"Where are you moving from? Just the suburb is fine."
Then: "And where are you moving to?"

STEP 7 - CALCULATE QUOTE:
Use calculateQuote tool with gathered information.
THEN respond: "Based on your requirements, here's your quote: [summary]. The estimated total is $X,XXX including GST, with a $X,XXX deposit to secure your booking. Would you like to check our available dates?"

STEP 8 - DATE SELECTION:
Use checkAvailability tool.
THEN respond: "Here are our available dates. Select one from the calendar, or tell me when works best for you."

STEP 9 - CONTACT DETAILS:
"Great! I've locked in that date. Now I just need your contact details to finalise the booking. What's your name?"
Then collect: email, phone number

STEP 10 - PAYMENT:
Use initiatePayment tool.
THEN respond: "To secure your booking for [date], we just need the 50% deposit of $X,XXX. You can complete the payment securely above."

ERROR RECOVERY:
If anything goes wrong:
- Apologise briefly
- Summarise where you were in the conversation
- Offer to continue or connect with a human
Example: "I apologise for that hiccup. We were discussing your [service type] move. Shall we continue?"

HUMAN ESCALATION:
If user asks to speak to someone, or after 3+ errors:
"I'll arrange for one of our team to call you. What's the best number to reach you, and when would suit?"

QUALIFYING QUESTION TEMPLATES BY SERVICE:
${JSON.stringify(
  Object.entries(moveTypes).map(([key, val]) => ({
    type: key,
    name: val.name,
    questions: val.qualifyingQuestions,
  })),
  null,
  2,
)}

REMEMBER: The user should NEVER be left hanging after selecting an option. Always respond with acknowledgment + next question.
`

const systemPrompt = `${MAYA_SYSTEM_PROMPT}\n\n${operationalPrompt}`

// Helper function to generate fallback dates
function generateFallbackDates() {
  const dates = []
  const today = new Date()
  for (let i = 3; i < 45; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    // Skip Sundays for fallback
    if (date.getDay() !== 0) {
      dates.push({
        date: date.toISOString().split("T")[0],
        available: true,
        slots: Math.floor(Math.random() * 3) + 1,
      })
    }
  }
  return dates
}

// Helper function to format date
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

const lookupBusinessTool = {
  description:
    "Look up an Australian business by name or ABN. Use immediately when customer mentions their company name or ABN. ALWAYS follow up with a text response after this tool.",
  inputSchema: z.object({
    query: z.string().describe("Business name or ABN to search for"),
    searchType: z.string().describe("Type of search - 'name' or 'abn'"),
  }),
  execute: async ({ query, searchType }: { query: string; searchType: string }) => {
    try {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || "http://localhost:3000"

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
          followUpRequired: true,
          suggestedResponse: "I found Sample Business Pty Ltd (ABN: 71661027309). Is this the correct business?",
        }
      }

      const response = await fetch(`${baseUrl}/api/business-lookup?q=${encodeURIComponent(query)}&type=${searchType}`)

      if (!response.ok) {
        return {
          success: false,
          error: "Failed to lookup business",
          results: [],
          followUpRequired: true,
          suggestedResponse:
            "I had trouble looking up that business. No worries though - we can proceed without the ABN. What's your company name?",
        }
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
          followUpRequired: true,
          suggestedResponse:
            data.results.length === 1
              ? `I found ${data.results[0].name} (ABN: ${data.results[0].abn}). Is this the correct business?`
              : `I found ${data.results.length} matching businesses. Please select the correct one from the list.`,
        }
      }

      return {
        success: false,
        results: [],
        followUpRequired: true,
        suggestedResponse:
          "I couldn't find a business with those details. No worries - we can proceed without the ABN. What's your company name?",
      }
    } catch (error) {
      return {
        success: false,
        error: "Lookup service unavailable",
        results: [],
        followUpRequired: true,
        suggestedResponse:
          "I'm having trouble with the business lookup right now. Let's continue - what's your company name?",
      }
    }
  },
}

const confirmBusinessTool = {
  description:
    "Confirm the business details after customer validates the lookup result. ALWAYS show service options and ask about move type after this.",
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
  }: {
    name: string
    abn: string
    entityType: string
    state: string
  }) => {
    return {
      success: true,
      confirmed: true,
      name,
      abn,
      entityType,
      state,
      showServiceOptions: true,
      followUpRequired: true,
      suggestedResponse: `Great! I've got ${name} on file. Now, what type of move are you planning? I've shown our service options below, or you can just tell me.`,
    }
  },
}

const showServiceOptionsTool = {
  description:
    "Display the visual service type picker for the customer to choose their move type. ALWAYS ask which type of move they need after calling this.",
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
      followUpRequired: true,
      suggestedResponse: "Which type of move are you planning? Select from the options above, or just tell me.",
    }
  },
}

const showInventoryPickerTool = {
  description:
    "Show the detailed inventory picker for the customer to select specific items being moved. Use after service type is confirmed to get accurate sizing.",
  inputSchema: z.object({
    serviceType: z.string().describe("The selected service type: office, warehouse, datacenter, it-equipment, retail"),
    context: z.string().describe("Why showing the picker, e.g. 'after_service_selected'"),
  }),
  execute: async ({ serviceType, context }: { serviceType: string; context: string }) => {
    return {
      success: true,
      showInventoryPicker: true,
      serviceType,
      followUpRequired: true,
      suggestedResponse:
        "I've opened our item selector where you can pick exactly what needs to be moved. This helps me give you the most accurate quote. Take your time selecting items, or use one of the quick estimates if you prefer.",
    }
  },
}

const checkAvailabilityTool = {
  description:
    "Check available dates for scheduling. Use after generating a quote. ALWAYS show calendar and ask user to select a date.",
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
          followUpRequired: true,
          suggestedResponse:
            moveUrgency === "asap"
              ? "Good news - we have availability soon! Select your preferred date from the calendar."
              : "Here are our available dates. Which one works best for you?",
        }
      }

      const data = await response.json()
      const availableDates =
        data.availability
          ?.filter((d: any) => d.is_available && d.current_bookings < d.max_bookings)
          .map((d: any) => ({
            date: d.date,
            available: true,
            slots: d.max_bookings - d.current_bookings,
          })) || generateFallbackDates()

      return {
        success: true,
        showCalendar: true,
        dates: availableDates,
        followUpRequired: true,
        suggestedResponse:
          moveUrgency === "asap"
            ? "Good news - we have availability soon! Select your preferred date from the calendar."
            : "Here are our available dates for the coming weeks. Which one suits you best?",
      }
    } catch (error) {
      return {
        success: true,
        showCalendar: true,
        dates: generateFallbackDates(),
        followUpRequired: true,
        suggestedResponse: "Here are our available moving dates. Select your preferred date from the calendar.",
      }
    }
  },
}

const confirmBookingDateTool = {
  description: "Confirm a specific date the customer has selected. ALWAYS collect contact details after this.",
  inputSchema: z.object({
    selectedDate: z.string().describe("Selected date in YYYY-MM-DD format"),
  }),
  execute: async ({ selectedDate }: { selectedDate: string }) => {
    return {
      success: true,
      confirmedDate: selectedDate,
      followUpRequired: true,
      suggestedResponse: `Perfect! I've locked in ${formatDate(selectedDate)} for your move. Now I just need your contact details to finalise the booking. What's your name?`,
    }
  },
}

const calculateQuoteTool = {
  description:
    "Calculate quote estimate. Use once you have move type, size, and locations. ALWAYS present the quote clearly and offer to show available dates.",
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
      followUpRequired: true,
      suggestedResponse: `Here's your quote for moving from ${originSuburb} to ${destinationSuburb}. The estimated total is $${estimate.toLocaleString()} including GST. To secure your booking, we require a 50% deposit of $${depositAmount.toLocaleString()}. Would you like to check our available dates?`,
    }
  },
}

const collectContactInfoTool = {
  description: "Collect customer contact details before payment. ALWAYS initiate payment after this.",
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
      followUpRequired: true,
      suggestedResponse: `Thanks ${contactName.split(" ")[0]}! I have all your details. To secure your booking for ${formatDate(scheduledDate)}, we just need the 50% deposit. Ready to complete the payment?`,
    }
  },
}

const initiatePaymentTool = {
  description: "Show Stripe payment form for deposit. Explain the payment process clearly.",
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
      followUpRequired: true,
      suggestedResponse: `You can complete your $${amount.toLocaleString()} deposit securely using the payment form above. Once complete, you'll receive a confirmation email with your booking details and invoice.`,
    }
  },
}

const requestCallbackTool = {
  description:
    "Request a callback for complex enquiries or when customer prefers to speak with someone. Use when user explicitly asks to speak to a person or after multiple errors.",
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
      followUpRequired: true,
      suggestedResponse: `No worries, ${name.split(" ")[0]}! I've arranged for one of our team to call you ${preferredTime} on ${phone}. They'll be able to help with ${reason}. Is there anything else I can help with in the meantime?`,
    }
  },
}

const tools = {
  lookupBusiness: lookupBusinessTool,
  confirmBusiness: confirmBusinessTool,
  showServiceOptions: showServiceOptionsTool,
  showInventoryPicker: showInventoryPickerTool,
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

  try {
    const errorPrompt = userMessage
      ? `The user said: "${userMessage}". I encountered a ${classified.type} error. Please acknowledge this gracefully, apologise briefly, and offer to help them continue. Be warm and helpful. End with a question to keep the conversation going.`
      : `I encountered a ${classified.type} error. Please acknowledge this gracefully, apologise briefly, and offer to help the user continue. Be warm and helpful. End with a question.`

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
      maxTokens: 200,
    })

    return errorResult.toTextStreamResponse()
  } catch (fallbackError) {
    const errorMessage =
      classified.message ||
      "I'm having a small technical hiccup. No worries though - would you like to try again or shall I arrange a callback?"

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

export async function POST(req: Request) {
  logToFile("[v0] Quote Assistant POST called")

  let userMessage: string | undefined

  try {
    const body = await req.json()
    logToFile("[v0] Request body parsed: " + JSON.stringify(body).slice(0, 100))
    const rawMessages = body.messages || []

    const lastUserMsg = rawMessages.findLast((m: any) => m.role === "user")
    userMessage = lastUserMsg?.content || lastUserMsg?.parts?.[0]?.text

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
        if (result.error) {
          logToFile("[v0] streamText finished with error: " + JSON.stringify(result.error))
        }
      },
      onError: ({ error }) => {
        logToFile("[v0] streamText error callback: " + error)
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

/**
 * Health check endpoint
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const detailed = searchParams.get("detailed") === "true"

  try {
    const health = {
      status: "healthy" as const,
      timestamp: new Date().toISOString(),
    }

    if (detailed) {
      try {
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
