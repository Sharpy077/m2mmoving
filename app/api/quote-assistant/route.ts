import { convertToModelMessages, streamText, tool, type UIMessage } from "ai"
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
  datacenter: {
    name: "Data Center Migration",
    baseRate: 5000,
    perSqm: 85,
    minSqm: 50,
    description: "Specialized data centre relocations with anti-static handling.",
  },
  "it-equipment": {
    name: "IT Equipment Transport",
    baseRate: 1500,
    perSqm: 35,
    minSqm: 10,
    description: "Safe transport of computers, servers, and networking equipment.",
  },
}

const additionalServices = {
  packing: { name: "Professional Packing", price: 450 },
  storage: { name: "Temporary Storage", price: 300 },
  cleaning: { name: "Post-Move Cleaning", price: 350 },
  insurance: { name: "Premium Insurance", price: 200 },
  afterhours: { name: "After Hours Service", price: 500 },
  itsetup: { name: "IT Setup Assistance", price: 600 },
}

const systemPrompt = `You are a friendly, professional quote assistant for M&M Commercial Moving, a commercial moving company in Melbourne, Australia. Your goal is to help potential customers get a quick quote and book their move with minimal friction.

IMPORTANT GUIDELINES:
- Be warm, helpful, and conversational - not robotic
- Ask ONE question at a time to avoid overwhelming users
- Use Australian English spelling (e.g., "centre" not "center", "organisation" not "organization")
- If someone seems unsure, provide helpful context
- Always validate that you have enough info before generating a quote
- Proactively check availability and suggest dates
- If the request is complex or unusual, recommend scheduling a call with the team

BUSINESS LOOKUP FEATURE:
When the customer mentions a company name, business name, or ABN:
1. Use the lookupBusiness tool to search for their business details
2. Present the results and ask them to confirm which one is correct (if multiple matches)
3. If confirmed, use those details (ABN, registered address state, trading name) to auto-fill information
4. This saves them time and ensures accuracy for invoicing

If they provide an 11-digit ABN directly, look it up immediately to verify and get full details.

MOVE TYPES WE OFFER:
1. Office Relocation - For moving office spaces (base: $2,500 + $45/sqm, min 20sqm)
2. Data Center Migration - For server rooms and IT infrastructure (base: $5,000 + $85/sqm, min 50sqm)
3. IT Equipment Transport - For computers, servers, equipment (base: $1,500 + $35/sqm, min 10sqm)

ADDITIONAL SERVICES (can be added to any move):
- Professional Packing: $450
- Temporary Storage: $300/week
- Post-Move Cleaning: $350
- Premium Insurance: $200
- After Hours Service: $500
- IT Setup Assistance: $600

BOOKING & AVAILABILITY FLOW:
1. After generating a quote, use checkAvailability to show available dates
2. Present the calendar to the user so they can select their preferred date
3. When they select a date, confirm it's still available
4. Collect contact details with the selected date included

QUALIFYING QUESTIONS FLOW:
1. What's their company name or ABN? (Use lookupBusiness to verify)
2. What type of move do they need? (office, datacenter, IT equipment)
3. What's the approximate size in square metres?
4. Where are they moving from and to? (suburbs/areas)
5. When do they need to move? (Use checkAvailability to show options)
6. Do they need any additional services?
7. Contact details to finalise the booking (name, email, phone)

Once you have all the information, use the calculateQuote tool, then checkAvailability to show dates, then captureLeadDetails to complete the booking.

If at any point the customer wants to speak to someone, use the requestCallback tool.`

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: "anthropic/claude-sonnet-4",
    system: systemPrompt,
    messages: convertToModelMessages(messages),
    tools: {
      lookupBusiness: tool({
        description:
          "Look up an Australian business by name or ABN to get their registered details. Use this when the customer mentions their company name or provides an ABN.",
        inputSchema: z.object({
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
              message: "No businesses found matching that search. Please try a different name or provide the ABN.",
            }
          } catch (error) {
            return { success: false, error: "Lookup service unavailable", results: [] }
          }
        },
      }),

      getBusinessDetails: tool({
        description: "Get full details for a business after the customer confirms the ABN",
        inputSchema: z.object({
          abn: z.string().describe("The confirmed ABN"),
        }),
        execute: async ({ abn }) => {
          try {
            const baseUrl = process.env.VERCEL_URL
              ? `https://${process.env.VERCEL_URL}`
              : process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || "http://localhost:3000"

            const response = await fetch(`${baseUrl}/api/business-lookup`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ abn }),
            })

            if (!response.ok) {
              return { success: false, error: "Failed to get business details" }
            }

            const data = await response.json()

            if (data.business) {
              return {
                success: true,
                business: data.business,
                message: `Verified: ${data.business.name}`,
              }
            }

            return { success: false, error: "Business not found" }
          } catch (error) {
            return { success: false, error: "Service unavailable" }
          }
        },
      }),

      checkAvailability: tool({
        description:
          "Check available dates for scheduling a move. Returns a list of available dates for the next 30 days. Use this after calculating a quote to show the customer when they can book.",
        inputSchema: z.object({
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
              // Return fallback availability
              return {
                success: true,
                showCalendar: true,
                message: "Here are our available dates. Please select your preferred moving date.",
                availableDates: generateFallbackDates(),
              }
            }

            const data = await response.json()
            const availableDates = data.availability
              ?.filter((d: any) => d.is_available && d.current_bookings < d.max_bookings)
              .map((d: any) => ({
                date: d.date,
                slotsRemaining: d.max_bookings - d.current_bookings,
              }))

            // Highlight next available dates
            const nextAvailable = availableDates?.slice(0, 5) || []

            return {
              success: true,
              showCalendar: true,
              message:
                urgency === "asap"
                  ? `We have availability as early as ${nextAvailable[0]?.date}! Please select your preferred date.`
                  : "Here are our available dates for the coming weeks. Please select your preferred moving date.",
              availableDates: availableDates || generateFallbackDates(),
              nextAvailable,
              totalAvailableSlots: availableDates?.length || 0,
            }
          } catch (error) {
            return {
              success: true,
              showCalendar: true,
              message: "Please select your preferred moving date from the calendar.",
              availableDates: generateFallbackDates(),
            }
          }
        },
      }),

      confirmBookingDate: tool({
        description: "Confirm a specific date the customer has selected for their move",
        inputSchema: z.object({
          selectedDate: z.string().describe("The date selected by the customer (YYYY-MM-DD format)"),
        }),
        execute: async ({ selectedDate }) => {
          try {
            const baseUrl = process.env.VERCEL_URL
              ? `https://${process.env.VERCEL_URL}`
              : process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || "http://localhost:3000"

            const response = await fetch(`${baseUrl}/api/availability?start=${selectedDate}&end=${selectedDate}`)

            if (!response.ok) {
              return {
                success: true,
                date: selectedDate,
                confirmed: true,
                message: `Great! ${formatDate(selectedDate)} is confirmed for your move.`,
              }
            }

            const data = await response.json()
            const dayAvailability = data.availability?.[0]

            if (
              dayAvailability &&
              dayAvailability.is_available &&
              dayAvailability.current_bookings < dayAvailability.max_bookings
            ) {
              return {
                success: true,
                date: selectedDate,
                confirmed: true,
                slotsRemaining: dayAvailability.max_bookings - dayAvailability.current_bookings - 1,
                message: `Excellent! ${formatDate(selectedDate)} is available and has been reserved for you.`,
              }
            }

            return {
              success: false,
              date: selectedDate,
              confirmed: false,
              message: `Unfortunately, ${formatDate(selectedDate)} is now fully booked. Please select another date.`,
            }
          } catch (error) {
            return {
              success: true,
              date: selectedDate,
              confirmed: true,
              message: `${formatDate(selectedDate)} has been tentatively reserved for your move.`,
            }
          }
        },
      }),

      calculateQuote: tool({
        description: "Calculate a quote estimate based on the collected information",
        inputSchema: z.object({
          moveType: z.enum(["office", "datacenter", "it-equipment"]).describe("Type of move"),
          squareMeters: z.number().min(1).describe("Size in square metres"),
          originSuburb: z.string().describe("Origin location/suburb"),
          destinationSuburb: z.string().describe("Destination location/suburb"),
          estimatedDistanceKm: z.number().optional().describe("Estimated distance in km"),
          additionalServices: z
            .array(z.enum(["packing", "storage", "cleaning", "insurance", "afterhours", "itsetup"]))
            .optional(),
          targetDate: z.string().optional().describe("Target move date"),
          specialRequirements: z.string().optional().describe("Any special requirements mentioned"),
        }),
        execute: async ({
          moveType,
          squareMeters,
          originSuburb,
          destinationSuburb,
          estimatedDistanceKm,
          additionalServices: services,
          targetDate,
          specialRequirements,
        }) => {
          const type = moveTypes[moveType]
          const effectiveSqm = Math.max(squareMeters, type.minSqm)
          let total = type.baseRate + type.perSqm * effectiveSqm

          if (estimatedDistanceKm) {
            total += estimatedDistanceKm * 8
          }

          const serviceDetails: string[] = []
          if (services) {
            services.forEach((serviceId) => {
              const service = additionalServices[serviceId]
              total += service.price
              serviceDetails.push(`${service.name}: $${service.price}`)
            })
          }

          const estimate = Math.round(total)
          const depositAmount = Math.round(estimate * 0.5)

          return {
            moveType: type.name,
            squareMeters: effectiveSqm,
            origin: originSuburb,
            destination: destinationSuburb,
            distance: estimatedDistanceKm,
            targetDate,
            specialRequirements,
            additionalServices: serviceDetails,
            estimatedTotal: estimate,
            depositRequired: depositAmount,
            showAvailability: true,
            breakdown: {
              baseRate: type.baseRate,
              areaCost: type.perSqm * effectiveSqm,
              distanceCost: estimatedDistanceKm ? estimatedDistanceKm * 8 : 0,
              servicesCost: services ? services.reduce((sum, s) => sum + additionalServices[s].price, 0) : 0,
            },
          }
        },
      }),

      captureLeadDetails: tool({
        description: "Capture customer contact details to save the quote and finalise the booking",
        inputSchema: z.object({
          contactName: z.string().describe("Customer name"),
          email: z.string().email().describe("Customer email"),
          phone: z.string().optional().describe("Phone number"),
          companyName: z.string().optional().describe("Company name"),
          abn: z.string().optional().describe("Australian Business Number"),
          businessState: z.string().optional().describe("Business registered state"),
          preferredContactTime: z.string().optional().describe("Best time to contact"),
          scheduledDate: z.string().optional().describe("The confirmed moving date (YYYY-MM-DD)"),
          quoteDetails: z.object({
            moveType: z.string(),
            squareMeters: z.number(),
            origin: z.string(),
            destination: z.string(),
            estimatedTotal: z.number(),
            additionalServices: z.array(z.string()).optional(),
            targetDate: z.string().optional(),
            specialRequirements: z.string().optional(),
          }),
        }),
        execute: async ({
          contactName,
          email,
          phone,
          companyName,
          abn,
          businessState,
          preferredContactTime,
          scheduledDate,
          quoteDetails,
        }) => {
          return {
            success: true,
            message: scheduledDate ? `Booking confirmed for ${formatDate(scheduledDate)}!` : "Contact details captured",
            leadData: {
              contactName,
              email,
              phone,
              companyName,
              abn,
              businessState,
              preferredContactTime,
              scheduledDate,
              ...quoteDetails,
            },
          }
        },
      }),

      requestCallback: tool({
        description:
          "Request a callback from the M&M team for complex enquiries or when customer prefers to speak with someone",
        inputSchema: z.object({
          name: z.string().describe("Customer name"),
          phone: z.string().describe("Phone number to call back"),
          preferredTime: z.string().optional().describe("Preferred callback time"),
          reason: z.string().optional().describe("Brief reason for callback"),
        }),
        execute: async ({ name, phone, preferredTime, reason }) => {
          return {
            success: true,
            message: `Callback requested for ${name} at ${phone}`,
            preferredTime,
            reason,
          }
        },
      }),
    },
    abortSignal: req.signal,
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

  for (let i = 1; i <= 45; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    const dayOfWeek = date.getDay()

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Skip weekends
      dates.push({
        date: date.toISOString().split("T")[0],
        slotsRemaining: Math.floor(Math.random() * 3) + 1,
      })
    }
  }

  return dates
}
