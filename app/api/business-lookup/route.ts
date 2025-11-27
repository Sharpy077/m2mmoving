import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("q")
  const type = searchParams.get("type") || "name" // 'name' or 'abn'

  if (!query) {
    return NextResponse.json({ error: "Query required" }, { status: 400 })
  }

  try {
    // ABN Lookup API (free, no API key required for basic lookups)
    // Using the ABR (Australian Business Register) API
    const guid = "b1c9a350-2e23-4e12-b0a3-3145456e9a7b" // Public GUID for web services

    let searchUrl: string

    if (type === "abn") {
      // Direct ABN lookup
      searchUrl = `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${encodeURIComponent(query)}&callback=callback`
    } else {
      // Name search - returns up to 10 results
      searchUrl = `https://abr.business.gov.au/json/MatchingNames.aspx?name=${encodeURIComponent(query)}&maxResults=5&callback=callback`
    }

    const response = await fetch(searchUrl)
    const text = await response.text()

    const jsonMatch = text.match(/^callback$$([\s\S]*)$$$/)
    if (!jsonMatch) {
      console.error("[v0] Invalid JSONP response:", text.substring(0, 100))
      return NextResponse.json({ error: "Invalid response from ABN lookup" }, { status: 500 })
    }
    const data = JSON.parse(jsonMatch[1])

    if (type === "abn") {
      // Single ABN result
      if (data.Abn) {
        return NextResponse.json({
          results: [
            {
              abn: data.Abn,
              name: data.EntityName || data.BusinessName?.[0] || "Unknown",
              tradingName: data.BusinessName?.[0] || null,
              entityType: data.EntityTypeName,
              status: data.AbnStatus,
              state: data.AddressState,
              postcode: data.AddressPostcode,
              gst: data.Gst ? new Date(data.Gst).toLocaleDateString("en-AU") : null,
            },
          ],
        })
      }
      return NextResponse.json({ results: [] })
    } else {
      // Name search results
      if (data.Names && data.Names.length > 0) {
        const results = data.Names.map((item: any) => ({
          abn: item.Abn,
          name: item.Name,
          score: item.Score,
          state: item.State,
          postcode: item.Postcode,
        }))
        return NextResponse.json({ results })
      }
      return NextResponse.json({ results: [] })
    }
  } catch (error) {
    console.error("[v0] ABN lookup error:", error)
    return NextResponse.json({ error: "Failed to lookup business" }, { status: 500 })
  }
}

// Get full business details by ABN
export async function POST(req: Request) {
  const { abn } = await req.json()

  if (!abn) {
    return NextResponse.json({ error: "ABN required" }, { status: 400 })
  }

  try {
    // Fetch full details from ABR
    const searchUrl = `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${encodeURIComponent(abn)}&callback=callback`

    const response = await fetch(searchUrl)
    const text = await response.text()

    const jsonMatch = text.match(/^callback$$([\s\S]*)$$$/)
    if (!jsonMatch) {
      console.error("[v0] Invalid JSONP response:", text.substring(0, 100))
      return NextResponse.json({ error: "Invalid response from ABN lookup" }, { status: 500 })
    }
    const data = JSON.parse(jsonMatch[1])

    if (data.Abn) {
      return NextResponse.json({
        business: {
          abn: data.Abn,
          acn: data.Acn || null,
          name: data.EntityName,
          tradingNames: data.BusinessName || [],
          entityType: data.EntityTypeName,
          entityTypeCode: data.EntityTypeCode,
          status: data.AbnStatus,
          statusDate: data.AbnStatusEffectiveFrom,
          state: data.AddressState,
          postcode: data.AddressPostcode,
          gstRegistered: !!data.Gst,
          gstRegisteredDate: data.Gst || null,
        },
      })
    }

    return NextResponse.json({ error: "Business not found" }, { status: 404 })
  } catch (error) {
    console.error("[v0] ABN details error:", error)
    return NextResponse.json({ error: "Failed to fetch business details" }, { status: 500 })
  }
}
