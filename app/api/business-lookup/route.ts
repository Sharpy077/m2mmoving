import { NextResponse } from "next/server"

// This provides a realistic UX while the client can register for API access later

function generateMockBusinesses(query: string) {
  // Generate realistic-looking mock businesses based on the search query
  const sanitizedQuery = query.trim()
  const words = sanitizedQuery.split(/\s+/)
  const primaryWord = words[0]?.charAt(0).toUpperCase() + words[0]?.slice(1).toLowerCase() || "Business"

  // Generate a realistic ABN (11 digits)
  const generateABN = (seed: number) => {
    const base = (Math.abs(seed * 12345678) % 90000000000) + 10000000000
    return base.toString().slice(0, 11)
  }

  const results = [
    {
      abn: generateABN(sanitizedQuery.length + 1),
      name: `${sanitizedQuery.toUpperCase()} PTY LTD`,
      tradingName: sanitizedQuery,
      entityType: "Australian Private Company",
      status: "Active",
      state: "VIC",
      postcode: "3000",
      score: 100,
    },
    {
      abn: generateABN(sanitizedQuery.length + 2),
      name: `${primaryWord} SERVICES PTY LTD`,
      tradingName: `${primaryWord} Services`,
      entityType: "Australian Private Company",
      status: "Active",
      state: "VIC",
      postcode: "3121",
      score: 85,
    },
    {
      abn: generateABN(sanitizedQuery.length + 3),
      name: `THE ${primaryWord.toUpperCase()} GROUP PTY LTD`,
      tradingName: `${primaryWord} Group`,
      entityType: "Australian Private Company",
      status: "Active",
      state: "NSW",
      postcode: "2000",
      score: 75,
    },
  ]

  return results
}

function generateMockBusinessDetails(abn: string, name?: string) {
  return {
    abn: abn,
    acn: abn.slice(0, 9),
    name: name || "BUSINESS PTY LTD",
    tradingNames: name ? [name] : [],
    entityType: "Australian Private Company",
    entityTypeCode: "PRV",
    status: "Active",
    statusDate: "2020-01-15",
    state: "VIC",
    postcode: "3000",
    gstRegistered: true,
    gstRegisteredDate: "2020-02-01",
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("q")
  const type = searchParams.get("type") || "name"

  if (!query) {
    return NextResponse.json({ error: "Query required" }, { status: 400 })
  }

  try {
    // For ABN lookups, generate a single result
    if (type === "abn") {
      const cleanABN = query.replace(/\s/g, "")
      if (!/^\d{11}$/.test(cleanABN)) {
        return NextResponse.json({ results: [], message: "Invalid ABN format" })
      }

      return NextResponse.json({
        results: [
          {
            abn: cleanABN,
            name: "VERIFIED BUSINESS PTY LTD",
            tradingName: "Verified Business",
            entityType: "Australian Private Company",
            status: "Active",
            state: "VIC",
            postcode: "3000",
          },
        ],
      })
    }

    // For name searches, generate matching results
    const results = generateMockBusinesses(query)
    return NextResponse.json({ results })
  } catch (error) {
    console.error("[v0] Business lookup error:", error)
    return NextResponse.json({ error: "Failed to lookup business" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { abn, name } = await req.json()

  if (!abn) {
    return NextResponse.json({ error: "ABN required" }, { status: 400 })
  }

  try {
    const business = generateMockBusinessDetails(abn, name)
    return NextResponse.json({ business })
  } catch (error) {
    console.error("[v0] Business details error:", error)
    return NextResponse.json({ error: "Failed to fetch business details" }, { status: 500 })
  }
}
