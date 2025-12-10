import { convertToCoreMessages, streamText, tool } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"

export const maxDuration = 60

// Move types and pricing data
const moveTypes = {
  office: {
    name: "Office Relocation",
    baseRate: 2500,
    perSqm: 45,
    minSqm: 20,
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
    baseRate: 3500,
    perSqm: 55,
    minSqm: 50,
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
    baseRate: 5000,
    perSqm: 85,
    minSqm: 50,
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
    baseRate: 1500,
    perSqm: 35,
    minSqm: 10,
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
    baseRate: 2000,
    perSqm: 40,
    minSqm: 15,
    description: "Retail fit-out moves including displays, POS systems, and stock.",
    icon: "store",
    qualifyingQuestions: [
      "Do you have display fixtures or shelving that needs to be moved?",
      "Is there refrigeration equipment or other specialised fixtures?",
      "Will stock be included in the move?",
    ],
  },
}

const additionalServices = {
  packing: { name: "Professional Packing", price: 450, description: "Full packing service with materials" },
  unpacking: { name: "Unpacking Service", price: 350, description: "Unpack and set up at destination" },
  storage: { name: "Temporary Storage (per week)", price: 300, description: "Secure storage facilities" },
  cleaning: { name: "Post-Move Cleaning", price: 350, description: "Deep clean of old premises" },
  insurance: { name: "Premium Insurance", price: 200, description: "Extended coverage for high-value items" },
  afterhours: { name: "After Hours Service", price: 500, description: "Moves outside business hours" },
  weekend: { name: "Weekend Service", price: 400, description: "Saturday or Sunday moves" },
  itsetup: { name: "IT Setup Assistance", price: 600, description: "Reconnect and test IT equipment" },
  furniture: { name: "Furniture Assembly", price: 400, description: "Disassemble and reassemble furniture" },
  disposal: { name: "Rubbish Removal", price: 250, description: "Remove unwanted items and dispose" },
}

const systemPrompt = `You are Maya, a friendly and professional quote assistant for M&M Commercial Moving, Melbourne's trusted commercial moving specialists. Your goal is to guide customers through getting a quote and booking their move in a smooth, effortless experience.

PERSONALITY:
- Warm, helpful, and conversational - like talking to a knowledgeable friend
- Use Australian English spelling (centre, organisation, specialised)
- Keep responses concise (2-3 sentences max per message)
- Show empathy - moving is stressful!
- Be proactive in offering help

CRITICAL CONVERSATION RULES:
1. Ask ONE question at a time - never overwhelm users
2. ALWAYS acknowledge what the user said before asking the next question
3. Use tools immediately when you have the information needed
4. Keep the conversation moving forward smoothly

CONVERSATION FLOW:

STEP 1 - WELCOME & IDENTIFY BUSINESS:
When conversation starts, say something like:
"G'day! I'm Maya, your M&M Moving assistant. I'll help you get a quote in just a few minutes. First, what's your business name or ABN so I can look up your details?"

Then use lookupBusiness immediately when they provide a name/ABN.

STEP 2 - CONFIRM BUSINESS (if found):
"I found [Business Name]. Is this correct?"
Use showServiceOptions tool once confirmed.

STEP 3 - SELECT SERVICE TYPE:
After business is confirmed, use showServiceOptions to display the visual service picker.
"What type of move are you planning?"

STEP 4 - QUALIFYING QUESTIONS (based on service type):
Ask 2-3 relevant questions based on the selected move type:

For Office Relocation:
- "Roughly how big is your office in square metres? (A typical small office is 50-100sqm)"
- "How many workstations need to move?"
- "Any server rooms or specialised IT equipment?"

For Warehouse:
- "What's the warehouse size in square metres?"
- "Is there racking or heavy machinery to move?"
- "Will we be moving stock as well?"

For Data Centre:
- "How many server racks are involved?"
- "What's the maximum downtime window?"
- "Need IT reconnection assistance?"

For IT Equipment:
- "Approximately how many computers/monitors?"
- "Any servers or networking equipment?"
- "Need us to provide packing materials?"

For Retail:
- "What's the store size in square metres?"
- "Are there fixtures, displays, or fridges?"
- "Will stock be included?"

STEP 5 - LOCATIONS:
"Where are you moving from? Just the suburb is fine."
"And where are you moving to?"

STEP 6 - GENERATE QUOTE:
Once you have move type, size, and locations - immediately use calculateQuote.
Present the quote clearly and use checkAvailability to show booking options.

STEP 7 - SELECT DATE:
"Here are our available dates. When would you like to move?"

STEP 8 - COLLECT DETAILS:
"Almost done! Just need your contact details:
- Your name
- Best phone number
- Email address"

STEP 9 - PAYMENT:
"To lock in your booking, we just need a 50% deposit of $[amount]. You can pay securely right here."
Use initiatePayment to show the payment form.

STEP 10 - CONFIRMATION:
"You're all set! You'll receive a confirmation email with your booking details and invoice."

HELPFUL TIPS:
- If the user seems unsure about square metres, help them estimate (e.g., "A typical 10-person office is around 150sqm")
- If they mention urgency, acknowledge it and assure them you have availability
- If they want to speak to someone, use requestCallback - don't make them feel trapped
- Always offer the phone number (03 8820 1801) as an alternative

HANDLING QUICK STARTS:
If the user's first message is one of these phrases, treat it as the "Move Type" selection and jump to qualifying:
- "Retail store move" -> Confirm Retail, then ask for Business Name/ABN.
- "Warehouse relocation" -> Confirm Warehouse, then ask for Business Name/ABN.
- "Data centre migration" -> Confirm Data Centre, then ask for Business Name/ABN.
- "IT equipment transport" -> Confirm IT Equipment, then ask for Business Name/ABN.
- "I need to move my office" -> Confirm Office, then ask for Business Name/ABN.

Example response for "Retail store move":
"Great, we specialise in retail moves! To get started with your quote, could you please provide your Business Name or ABN?"

SAFETY NET:
- NEVER output an empty response.
- If a tool fails, apologise and ask the user for the information manually.
- If you are unsure what to do, ask: "Could you tell me a bit more about what you need help with?"

MOVE TYPE PRICING REFERENCE:
- Office: Base $2,500 + $45/sqm (min 20sqm)
- Warehouse: Base $3,500 + $55/sqm (min 50sqm)
- Data Centre: Base $5,000 + $85/sqm (min 50sqm)
- IT Equipment: Base $1,500 + $35/sqm (min 10sqm)
- Retail: Base $2,000 + $40/sqm (min 15sqm)

ADDITIONAL SERVICES (offer when relevant):
- Professional Packing: $450
- Unpacking: $350
- IT Setup Assistance: $600
- After Hours/Weekend: $400-500
- Storage: $300/week`

const lookupBusinessTool = tool({
  description:
    "Look up an Australian business by name or ABN. Use immediately when customer mentions their company name or ABN.",
  parameters: z.object({
    query: z.string().describe("Business name or ABN to search for"),
    searchType: z.string().describe("Type of search - 'name' or 'abn'"),
  }),
  execute: async ({ query, searchType }) => {
    try {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || "http://localhost:3000"

      const response = await fetch(`${baseUrl}/api/business-lookup?q=${encodeURIComponent(query)}&type=${searchType}`)

      if (!response.ok) {
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
      return { success: false, error: "Lookup service unavailable", results: [] }
    }
  },
})

const confirmBusinessTool = tool({
  description: "Confirm the business details after customer validates the lookup result",
  parameters: z.object({
    name: z.string().describe("Confirmed business name"),
    abn: z.string().describe("Confirmed ABN"),
    entityType: z.string().describe("Business entity type"),
    state: z.string().describe("Business state"),
  }),
  execute: async ({ name, abn, entityType, state }) => {
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
})

const showServiceOptionsTool = tool({
  description:
    "Display the visual service type picker for the customer to choose their move type. Use after business is confirmed or at start of conversation.",
  parameters: z.object({
    context: z
      .string()
      .describe("Brief context about why showing options, e.g. 'after_business_confirmed' or 'initial'"),
  }),
  execute: async ({ context }) => {
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
})

const checkAvailabilityTool = tool({
  description: "Check available dates for scheduling. Use after generating a quote to show booking options.",
  parameters: z.object({
    monthName: z.string().describe("Month to check, e.g. 'December 2024'"),
    moveUrgency: z.string().describe("Urgency level - 'asap', 'flexible', or 'specific'"),
  }),
  execute: async ({ monthName, moveUrgency }) => {
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
})

const confirmBookingDateTool = tool({
  description: "Confirm a specific date the customer has selected",
  parameters: z.object({
    selectedDate: z.string().describe("Selected date in YYYY-MM-DD format"),
  }),
  execute: async ({ selectedDate }) => {
    return {
      success: true,
      confirmedDate: selectedDate,
      message: `Perfect! ${formatDate(selectedDate)} is locked in. Now I just need your contact details to finalise the booking.`,
    }
  },
})

const calculateQuoteTool = tool({
  description: "Calculate quote estimate. Use once you have move type, size, and locations.",
  parameters: z.object({
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
})

const collectContactInfoTool = tool({
  description: "Collect customer contact details before payment.",
  parameters: z.object({
    contactName: z.string().describe("Customer's full name"),
    email: z.string().describe("Customer's email"),
    phone: z.string().describe("Customer's phone number"),
    companyName: z.string().describe("Company name"),
    scheduledDate: z.string().describe("Moving date in YYYY-MM-DD format"),
  }),
  execute: async ({ contactName, email, phone, companyName, scheduledDate }) => {
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
})

const initiatePaymentTool = tool({
  description: "Show Stripe payment form for deposit.",
  parameters: z.object({
    amount: z.number().describe("Deposit amount in dollars"),
    customerEmail: z.string().describe("Customer email"),
    customerName: z.string().describe("Customer name"),
    description: z.string().describe("Payment description"),
  }),
  execute: async ({ amount, customerEmail, customerName, description }) => {
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
})

const requestCallbackTool = tool({
  description: "Request a callback for complex enquiries or when customer prefers to speak with someone.",
  parameters: z.object({
    name: z.string().describe("Customer name"),
    phone: z.string().describe("Phone number"),
    preferredTime: z.string().describe("Preferred callback time"),
    reason: z.string().describe("Brief reason for callback"),
  }),
  execute: async ({ name, phone, preferredTime, reason }) => {
    return {
      success: true,
      callbackRequested: true,
      message: `No worries! I've arranged for our team to call you ${preferredTime}. They'll be in touch at ${phone} shortly.`,
    }
  },
})

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

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const rawMessages = body.messages || []

    const effectiveMessages =
      rawMessages.length === 0 ||
        (rawMessages.length === 1 &&
          rawMessages[0].role === "user" &&
          (rawMessages[0].content === "start" ||
            rawMessages[0].content === "Start" ||
            rawMessages[0].content === "" ||
            rawMessages[0].parts?.[0]?.text?.includes("I'd like to get a quote")))
        ? [{ role: "user" as const, content: "Hi, I'd like to get a quote for a commercial move." }]
        : rawMessages

    const result = streamText({
      model: openai("gpt-4o"),
      system: systemPrompt,
      messages: convertToCoreMessages(effectiveMessages),
      tools,
      maxSteps: 5,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error("[v0] Quote assistant error:", error)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function generateFallbackDates() {
  const dates = []
  const today = new Date()

  for (let i = 2; i <= 45; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    const dayOfWeek = date.getDay()

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      dates.push({
        date: date.toISOString().split("T")[0],
        available: true,
        slots: Math.floor(Math.random() * 3) + 1,
      })
    }
  }

  return dates
}
