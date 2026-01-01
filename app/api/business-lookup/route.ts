import { NextResponse } from "next/server"

const ABN_LOOKUP_GUID = "62b9db95-297e-49e0-8635-c42ca2518af3"

function parseJSONP(text: string): unknown {
  const prefix = "callback("
  const suffix = ")"

  if (!text.startsWith(prefix) || !text.endsWith(suffix)) {
    throw new Error(`Invalid JSONP response: ${text.slice(0, 100)}`)
  }

  const jsonContent = text.slice(prefix.length, -suffix.length)
  return JSON.parse(jsonContent)
}

async function fetchABNDetails(abn: string) {
  try {
    const cleanABN = abn.replace(/\s/g, "")
    const abnUrl = `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${cleanABN}&callback=callback&guid=${ABN_LOOKUP_GUID}`
    const response = await fetch(abnUrl)
    const text = await response.text()
    const data = parseJSONP(text) as {
      Abn?: string
      Acn?: string
      EntityName?: string
      EntityTypeName?: string
      EntityStatusCode?: string
      AbnStatus?: string
      AbnStatusEffectiveFrom?: string
      AddressState?: string
      AddressPostcode?: string
      BusinessName?: Array<{ Value?: string; EffectiveFrom?: string }>
      Gst?: string
      GstEffectiveFrom?: string
      Message?: string
    }

    console.log("[v0] ABR API response for ABN", cleanABN, ":", JSON.stringify(data, null, 2))

    if (data.Message) {
      console.log("[v0] ABR API message:", data.Message)
      return null
    }

    const isActive =
      data.EntityStatusCode === "ACT" || data.AbnStatus === "Active" || (data.AbnStatusEffectiveFrom && !data.Message)

    const gstRegistered =
      data.Gst !== undefined &&
      data.Gst !== null &&
      data.Gst !== "" &&
      data.GstEffectiveFrom !== undefined &&
      data.GstEffectiveFrom !== null &&
      data.GstEffectiveFrom !== ""

    console.log("[v0] Parsed status:", {
      EntityStatusCode: data.EntityStatusCode,
      AbnStatus: data.AbnStatus,
      isActive,
      Gst: data.Gst,
      GstEffectiveFrom: data.GstEffectiveFrom,
      gstRegistered,
    })

    return {
      abn: data.Abn || cleanABN,
      acn: data.Acn || undefined,
      name: data.EntityName || "Unknown",
      tradingName: data.BusinessName?.[0]?.Value || undefined,
      tradingNames: (data.BusinessName || []).map((bn) => bn.Value).filter(Boolean) as string[],
      entityType: data.EntityTypeName || "Unknown",
      status: isActive ? "Active" : "Inactive",
      state: data.AddressState || "Unknown",
      postcode: data.AddressPostcode || "Unknown",
      gstRegistered,
      gstRegisteredDate: data.GstEffectiveFrom || undefined,
    }
  } catch (error) {
    console.error("[v0] fetchABNDetails error:", error)
    return null
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
    // For ABN lookups - use ABN search endpoint
    if (type === "abn") {
      const cleanABN = query.replace(/\s/g, "")
      if (!/^\d{11}$/.test(cleanABN)) {
        return NextResponse.json({ results: [], message: "Invalid ABN format. ABN must be 11 digits." })
      }

      const details = await fetchABNDetails(cleanABN)
      if (!details) {
        return NextResponse.json({ results: [], message: "ABN not found" })
      }

      return NextResponse.json({ results: [details] })
    }

    // For name searches - use name search endpoint
    const nameUrl = `https://abr.business.gov.au/json/MatchingNames.aspx?name=${encodeURIComponent(query)}&maxResults=10&callback=callback&guid=${ABN_LOOKUP_GUID}`
    const response = await fetch(nameUrl)
    const text = await response.text()

    console.log("[v0] ABR name search response:", text.slice(0, 500))

    const data = parseJSONP(text) as {
      Names?: Array<{
        Abn?: string
        Name?: string
        NameType?: string
        Score?: number
        IsCurrentIndicator?: string
        State?: string
        Postcode?: string
      }>
      Message?: string
    }

    if (data.Message && (!data.Names || data.Names.length === 0)) {
      return NextResponse.json({ results: [], message: data.Message })
    }

    const nameResults = data.Names || []

    console.log(
      "[v0] Name results:",
      nameResults.map((r) => ({
        name: r.Name,
        abn: r.Abn,
        isCurrentIndicator: r.IsCurrentIndicator,
      })),
    )

    const detailedResults = await Promise.all(
      nameResults.map(async (item) => {
        if (item.Abn) {
          const details = await fetchABNDetails(item.Abn)
          if (details) {
            return {
              ...details,
              // Use the name from search if it's a trading name
              tradingName: item.NameType === "Trading Name" ? item.Name : details.tradingName,
              score: item.Score || 0,
            }
          }
        }
        // Fallback to basic info if detailed fetch fails
        return {
          abn: item.Abn || "",
          name: item.Name || "Unknown",
          tradingName: item.NameType === "Trading Name" ? item.Name : undefined,
          entityType: item.NameType || "Unknown",
          status: "Unknown" as const,
          state: item.State || "Unknown",
          postcode: item.Postcode || "Unknown",
          score: item.Score || 0,
          gstRegistered: false,
        }
      }),
    )

    const sortedResults = detailedResults.sort((a, b) => {
      const statusOrder = { Active: 0, Unknown: 1, Inactive: 2 }
      const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 1
      const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 1

      if (aOrder !== bOrder) return aOrder - bOrder
      // Then sort by score (higher score first)
      return (b.score || 0) - (a.score || 0)
    })

    return NextResponse.json({ results: sortedResults })
  } catch (error) {
    console.error("[v0] Business lookup error:", error)
    return NextResponse.json({ error: "Failed to lookup business" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { abn } = await req.json()

  if (!abn) {
    return NextResponse.json({ error: "ABN required" }, { status: 400 })
  }

  try {
    const details = await fetchABNDetails(abn)

    if (!details) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 })
    }

    return NextResponse.json({ business: details })
  } catch (error) {
    console.error("[v0] Business details error:", error)
    return NextResponse.json({ error: "Failed to fetch business details" }, { status: 500 })
  }
}
