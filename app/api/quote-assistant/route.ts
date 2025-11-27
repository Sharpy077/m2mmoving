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

const systemPrompt = `You are a friendly, professional quote assistant for M&M Commercial Moving, a commercial moving company in Australia. Your goal is to help potential customers get a quick quote by asking qualifying questions naturally and conversationally.

IMPORTANT GUIDELINES:
- Be warm, helpful, and conversational - not robotic
- Ask ONE question at a time to avoid overwhelming users
- Use Australian English spelling (e.g., "centre" not "center", "organisation" not "organization")
- If someone seems unsure, provide helpful context
- Always validate that you have enough info before generating a quote
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

QUALIFYING QUESTIONS FLOW:
1. What's their company name or ABN? (Use lookupBusiness to verify)
2. What type of move do they need? (office, datacenter, IT equipment)
3. What's the approximate size in square metres?
4. Where are they moving from and to? (suburbs/areas)
5. When do they need to move? (timeline)
6. Do they need any additional services?
7. Contact details to send the quote (name, email, phone)

Once you have all the information, use the calculateQuote tool to generate an estimate, then use the captureLeadDetails tool to collect their contact info.

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
            // Call our internal API which handles ABR lookup
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

          // Add distance cost ($8 per km)
          if (estimatedDistanceKm) {
            total += estimatedDistanceKm * 8
          }

          // Add services
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
        description: "Capture customer contact details to save the quote and follow up",
        inputSchema: z.object({
          contactName: z.string().describe("Customer name"),
          email: z.string().email().describe("Customer email"),
          phone: z.string().optional().describe("Phone number"),
          companyName: z.string().optional().describe("Company name"),
          abn: z.string().optional().describe("Australian Business Number"),
          businessState: z.string().optional().describe("Business registered state"),
          preferredContactTime: z.string().optional().describe("Best time to contact"),
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
          quoteDetails,
        }) => {
          // This will be processed client-side to submit the lead
          return {
            success: true,
            message: "Contact details captured",
            leadData: {
              contactName,
              email,
              phone,
              companyName,
              abn,
              businessState,
              preferredContactTime,
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
