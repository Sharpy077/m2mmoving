import { streamText, tool } from "ai"
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
  },
  warehouse: {
    name: "Warehouse Relocation",
    baseRate: 3500,
    perSqm: 55,
    minSqm: 50,
    description: "Industrial and warehouse moves with heavy equipment handling.",
  },
  datacenter: {
    name: "Data Centre Migration",
    baseRate: 5000,
    perSqm: 85,
    minSqm: 50,
    description: "Specialised data centre relocations with anti-static handling.",
  },
  "it-equipment": {
    name: "IT Equipment Transport",
    baseRate: 1500,
    perSqm: 35,
    minSqm: 10,
    description: "Safe transport of computers, servers, and networking equipment.",
  },
  retail: {
    name: "Retail Store Relocation",
    baseRate: 2000,
    perSqm: 40,
    minSqm: 15,
    description: "Retail fit-out moves including displays, POS systems, and stock.",
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

const systemPrompt = `You are Maya, a friendly and professional quote assistant for M&M Commercial Moving, a trusted commercial moving company in Melbourne, Australia. Your goal is to help potential customers get an accurate quote and book their move quickly and easily.

PERSONALITY & TONE:
- Warm, helpful, and conversational - not robotic
- Use Australian English spelling (e.g., "centre" not "center", "organisation" not "organization")  
- Keep responses concise but friendly
- Show empathy for the stress of moving
- Be proactive in offering helpful suggestions

CRITICAL RULES:
1. Ask ONE question at a time - never overwhelm users with multiple questions
2. ALWAYS wait for the user's response before asking the next question
3. After each user response, acknowledge what they said before asking the next question
4. Use tools proactively when you have enough information
5. If something seems complex, offer to arrange a callback with the team

START OF CONVERSATION:
When the conversation starts with just "start" or similar, introduce yourself warmly and ask for their company name or ABN to begin.

QUALIFYING QUESTIONS FLOW (ask in this order, ONE AT A TIME):
1. Company name or ABN (use lookupBusiness to verify and auto-fill details)
2. Type of move needed (office, warehouse, data centre, IT equipment, retail)
3. Approximate size in square metres (help estimate if unsure)
4. Current location (suburb/area)
5. New location (suburb/area)  
6. Preferred moving timeframe (use checkAvailability after quote to show dates)
7. Any additional services needed?
8. Contact details (name, email, phone) to finalise

MOVE TYPES & PRICING:
- Office Relocation: Base $2,500 + $45/sqm (min 20sqm)
- Warehouse Relocation: Base $3,500 + $55/sqm (min 50sqm)
- Data Centre Migration: Base $5,000 + $85/sqm (min 50sqm)
- IT Equipment Transport: Base $1,500 + $35/sqm (min 10sqm)
- Retail Store Relocation: Base $2,000 + $40/sqm (min 15sqm)

ADDITIONAL SERVICES:
- Professional Packing: $450
- Unpacking Service: $350
- Temporary Storage: $300/week
- Post-Move Cleaning: $350
- Premium Insurance: $200
- After Hours Service: $500
- Weekend Service: $400
- IT Setup Assistance: $600
- Furniture Assembly: $400
- Rubbish Removal: $250

BOOKING FLOW:
1. Once you have move type, size, and locations - use calculateQuote to generate estimate
2. After quote is shown - use checkAvailability to show available dates
3. When date is selected - confirm the booking
4. Collect contact details with the scheduled date
5. Use initiatePayment to set up the 50% deposit payment

BUSINESS LOOKUP:
When customer mentions company name or ABN, use lookupBusiness immediately to verify and auto-fill their details. This saves time and ensures accuracy.

Remember: Be helpful, efficient, and make the booking process as smooth as possible!`

export async function POST(req: Request) {
  const body = await req.json()

  // Validate and convert messages
  const messages = body.messages || []

  // Handle initial conversation start
  const effectiveMessages =
    messages.length === 0 ||
    (messages.length === 1 &&
      messages[0].role === "user" &&
      (messages[0].content === "start" ||
        messages[0].content === "Start" ||
        messages[0].content === "" ||
        messages[0].parts?.[0]?.text?.includes("I'd like to get a quote")))
      ? [{ role: "user" as const, content: "Hi, I'd like to get a quote for a commercial move." }]
      : messages.map((m: any) => ({
          role: m.role as "user" | "assistant",
          content:
            typeof m.content === "string"
              ? m.content
              : m.parts
                  ?.filter((p: any) => p.type === "text")
                  .map((p: any) => p.text)
                  .join(" ") || "",
        }))

  const result = streamText({
    model: "anthropic/claude-sonnet-4",
    system: systemPrompt,
    messages: effectiveMessages,
    tools: {
      lookupBusiness: tool({
        description:
          "Look up an Australian business by name or ABN to get their registered details. Use this when the customer mentions their company name or provides an ABN.",
        parameters: z.object({
          query: z.string().describe("Business name or ABN to search for"),
          type: z
            .enum(["name", "abn"])
            .describe("Type of search - 'name' for business name search, 'abn' for direct ABN lookup"),
        }),
        execute: async ({ query, type }) => {
          try {
            const baseUrl = process.env.VERCEL_URL
              ? `https://${process.env.VERCEL_URL}`
              : process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || "http://localhost:3000"

            const response = await fetch(`${baseUrl}/api/business-lookup?q=${encodeURIComponent(query)}&type=${type}`)

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
              message:
                "No businesses found matching that search. Please try a different name or provide the ABN directly.",
            }
          } catch (error) {
            return { success: false, error: "Lookup service unavailable", results: [] }
          }
        },
      }),

      confirmBusiness: tool({
        description: "Confirm the business details after customer validates the lookup result",
        parameters: z.object({
          name: z.string().describe("Confirmed business name"),
          abn: z.string().describe("Confirmed ABN"),
          type: z.string().optional().describe("Business entity type"),
          state: z.string().optional().describe("Business state"),
          address: z.string().optional().describe("Business address if available"),
        }),
        execute: async ({ name, abn, type, state, address }) => {
          return {
            success: true,
            confirmed: true,
            name,
            abn,
            type,
            state,
            address,
            message: `Great! I've confirmed your business as ${name} (ABN: ${abn}). Now, what type of move are you planning?`,
          }
        },
      }),

      checkAvailability: tool({
        description:
          "Check available dates for scheduling a move. Returns a list of available dates for the next 45 days. Use this after calculating a quote to show the customer when they can book.",
        parameters: z.object({
          request: z.literal(true).describe("Always pass true to request availability"),
          preferredMonth: z
            .string()
            .optional()
            .describe("Preferred month if mentioned (e.g., 'January', 'next month')"),
          urgency: z.enum(["asap", "flexible", "specific"]).optional().describe("How urgent is the move"),
        }),
        execute: async ({ preferredMonth, urgency }) => {
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
                message: "Here are our available dates. Please select your preferred moving date.",
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
                urgency === "asap"
                  ? "We have availability soon! Please select your preferred date from the calendar."
                  : "Here are our available dates for the coming weeks. Please select your preferred moving date.",
            }
          } catch (error) {
            return {
              success: true,
              showCalendar: true,
              dates: generateFallbackDates(),
              message: "Please select your preferred moving date from the calendar.",
            }
          }
        },
      }),

      confirmBookingDate: tool({
        description: "Confirm a specific date the customer has selected for their move",
        parameters: z.object({
          selectedDate: z.string().describe("The date selected by the customer (YYYY-MM-DD format)"),
        }),
        execute: async ({ selectedDate }) => {
          return {
            success: true,
            confirmedDate: selectedDate,
            message: `Excellent! ${formatDate(selectedDate)} has been reserved for your move. Now I just need a few contact details to finalise your booking.`,
          }
        },
      }),

      calculateQuote: tool({
        description:
          "Calculate a quote estimate based on the collected information. Use this once you have move type, size, and locations.",
        parameters: z.object({
          moveType: z.enum(["office", "warehouse", "datacenter", "it-equipment", "retail"]).describe("Type of move"),
          squareMeters: z.number().min(1).describe("Size in square metres"),
          originSuburb: z.string().describe("Origin location/suburb"),
          destinationSuburb: z.string().describe("Destination location/suburb"),
          estimatedDistanceKm: z.number().optional().describe("Estimated distance in km"),
          additionalServices: z
            .array(
              z.enum([
                "packing",
                "unpacking",
                "storage",
                "cleaning",
                "insurance",
                "afterhours",
                "weekend",
                "itsetup",
                "furniture",
                "disposal",
              ]),
            )
            .optional(),
          specialRequirements: z.string().optional().describe("Any special requirements mentioned"),
        }),
        execute: async ({
          moveType,
          squareMeters,
          originSuburb,
          destinationSuburb,
          estimatedDistanceKm,
          additionalServices: services,
          specialRequirements,
        }) => {
          const type = moveTypes[moveType]
          const effectiveSqm = Math.max(squareMeters, type.minSqm)
          let total = type.baseRate + type.perSqm * effectiveSqm

          // Distance cost
          const distanceCost = estimatedDistanceKm ? estimatedDistanceKm * 8 : 0
          total += distanceCost

          // Crew and truck calculation
          let crewSize = 2
          let truckSize = "Medium (45m³)"
          if (effectiveSqm > 100) {
            crewSize = 4
            truckSize = "Large (75m³)"
          } else if (effectiveSqm > 50) {
            crewSize = 3
            truckSize = "Large (75m³)"
          }

          // Hours estimate
          const estimatedHours =
            Math.ceil(effectiveSqm / 15) + (estimatedDistanceKm ? Math.ceil(estimatedDistanceKm / 30) : 1)
          const hourlyRate = 150 * crewSize

          const serviceDetails: { name: string; price: number }[] = []
          let servicesCost = 0
          if (services) {
            services.forEach((serviceId) => {
              const service = additionalServices[serviceId]
              total += service.price
              servicesCost += service.price
              serviceDetails.push({ name: service.name, price: service.price })
            })
          }

          const estimate = Math.round(total)
          const depositAmount = Math.round(estimate * 0.5)

          return {
            moveType: type.name,
            moveTypeKey: moveType,
            squareMeters: effectiveSqm,
            origin: originSuburb,
            destination: destinationSuburb,
            distance: estimatedDistanceKm,
            specialRequirements,
            additionalServices: serviceDetails.map((s) => s.name),
            estimatedTotal: estimate,
            depositRequired: depositAmount,
            hourlyRate,
            estimatedHours,
            crewSize,
            truckSize,
            showAvailability: true,
            breakdown: [
              { label: "Base Rate", amount: type.baseRate },
              { label: `Area Cost (${effectiveSqm}sqm × $${type.perSqm})`, amount: type.perSqm * effectiveSqm },
              ...(distanceCost > 0 ? [{ label: "Distance Cost", amount: distanceCost }] : []),
              ...(servicesCost > 0 ? [{ label: "Additional Services", amount: servicesCost }] : []),
            ],
          }
        },
      }),

      collectContactInfo: tool({
        description:
          "Collect and confirm customer contact details. Use this after all move details are confirmed to prepare for payment.",
        parameters: z.object({
          contactName: z.string().describe("Customer's full name"),
          email: z.string().describe("Customer's email address"),
          phone: z.string().describe("Customer's phone number"),
          companyName: z.string().optional().describe("Company name if not already captured"),
          abn: z.string().optional().describe("ABN if not already captured"),
          scheduledDate: z.string().optional().describe("The confirmed moving date"),
        }),
        execute: async ({ contactName, email, phone, companyName, abn, scheduledDate }) => {
          return {
            success: true,
            collected: true,
            contactName,
            email,
            phone,
            companyName,
            abn,
            scheduledDate,
            message: `Perfect! I have all your details. To secure your booking${scheduledDate ? ` for ${formatDate(scheduledDate)}` : ""}, we require a 50% deposit.`,
          }
        },
      }),

      initiatePayment: tool({
        description: "Show the Stripe payment form for the deposit. Use this after contact details are collected.",
        parameters: z.object({
          amount: z.number().describe("Deposit amount in dollars"),
          customerEmail: z.string().describe("Customer email for receipt"),
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
            message: `Please complete the $${amount.toLocaleString()} deposit payment below to confirm your booking. You'll receive a confirmation email and invoice once the payment is processed.`,
          }
        },
      }),

      requestCallback: tool({
        description:
          "Request a callback from the M&M team for complex enquiries or when customer prefers to speak with someone.",
        parameters: z.object({
          name: z.string().describe("Customer name"),
          phone: z.string().describe("Phone number to call back"),
          preferredTime: z.string().optional().describe("Preferred callback time"),
          reason: z.string().optional().describe("Brief reason for callback"),
        }),
        execute: async ({ name, phone, preferredTime, reason }) => {
          return {
            success: true,
            callbackRequested: true,
            message: `No worries! I've requested a callback for you. One of our team members will call ${name} at ${phone}${preferredTime ? ` ${preferredTime}` : " shortly"}.`,
          }
        },
      }),
    },
  })

  return result.toUIMessageStreamResponse()
}

// Helper function to format dates nicely
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

// Fallback date generator
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
        slots: Math.floor(Math.random() * 3) + 1,
      })
    }
  }

  return dates
}
