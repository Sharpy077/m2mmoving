import { NextResponse } from "next/server"

const ABN_LOOKUP_GUID = "62b9db95-297e-49e0-8635-c42ca2518af3"

function parseJSONP(text: string): unknown {
  const prefix = "callback("
  const suffix = ")"

  if (text.includes("A server error has occurred") || text.includes("server error")) {
    console.log("[v0] ABR API server error detected, returning null")
    return null
  }

  if (!text.startsWith(prefix) || !text.endsWith(suffix)) {
    console.log("[v0] Invalid JSONP format, response:", text.slice(0, 200))
    return null
  }

  try {
    const jsonContent = text.slice(prefix.length, -suffix.length)
    return JSON.parse(jsonContent)
  } catch {
    console.log("[v0] Failed to parse JSONP content")
    return null
  }
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
    } | null

    if (!data) {
      return null
    }

    console.log("[v0] ABR API raw response for ABN", cleanABN, ":", JSON.stringify(data, null, 2))

    if (data.Message) {
      console.log("[v0] ABR API message:", data.Message)
      return null
    }

    // EntityStatusCode: "ACT" = Active, "CAN" = Cancelled
    // AbnStatus can be "Active" or "Cancelled"
    const isActive =
      data.EntityStatusCode === "ACT" ||
      data.AbnStatus === "Active" ||
      (data.AbnStatusEffectiveFrom && !data.EntityStatusCode) // Has effective date but no cancellation

    // GST: if Gst field has a date, the entity is GST registered
    const gstRegistered = !!(data.Gst && data.Gst.trim() !== "" && data.Gst.trim().length > 0)

    console.log("[v0] Parsed status for", cleanABN, ":", {
      EntityStatusCode: data.EntityStatusCode,
      AbnStatus: data.AbnStatus,
      isActive,
      Gst: data.Gst,
      gstRegistered,
    })

    const tradingNames = (data.BusinessName || [])
      .map((bn) => bn.Value)
      .filter((v): v is string => !!v && v.trim() !== "")

    return {
      abn: data.Abn || cleanABN,
      acn: data.Acn || undefined,
      name: data.EntityName || "Unknown",
      tradingName: tradingNames[0] || undefined,
      tradingNames,
      entityType: data.EntityTypeName || "Unknown",
      status: isActive ? "Active" : "Inactive",
      state: data.AddressState || "Unknown",
      postcode: data.AddressPostcode || "Unknown",
      gstRegistered,
      gstRegisteredDate: data.Gst || data.GstEffectiveFrom || undefined,
    }
  } catch (error) {
    console.log("[v0] fetchABNDetails failed for ABN (rate limit or network issue):", abn)
    return null
  }
}

function calculateNameRelevance(
  searchQuery: string,
  entityName: string,
  tradingName?: string,
  nameType?: string,
): number {
  const query = searchQuery.toLowerCase().trim()
  const name = entityName.toLowerCase()
  const trading = tradingName?.toLowerCase() || ""

  // Exact match on entity name = highest score
  if (name === query) return 100

  // Entity name starts with query
  if (name.startsWith(query)) return 90

  // Entity name contains query as a word
  if (name.includes(` ${query}`) || name.includes(`${query} `)) return 80

  // Entity name contains query
  if (name.includes(query)) return 70

  // Match was on trading name (NameType from ABR API)
  if (nameType === "Trading Name") {
    if (trading === query) return 50
    if (trading.startsWith(query)) return 45
    if (trading.includes(query)) return 40
  }

  // Partial match
  return 30
}

function getEntityTypePriority(entityType: string): number {
  const type = entityType.toLowerCase()
  // Australian Private Company should appear first
  if (type.includes("private company") || type.includes("pty ltd") || type.includes("australian private")) return 0
  if (type.includes("public company")) return 1
  if (type.includes("company")) return 2
  if (type.includes("trust")) return 3
  if (type.includes("partnership")) return 4
  if (type.includes("individual") || type.includes("sole trader")) return 5
  return 6
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
    const nameUrl = `https://abr.business.gov.au/json/MatchingNames.aspx?name=${encodeURIComponent(query)}&maxResults=20&callback=callback&guid=${ABN_LOOKUP_GUID}`
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

    console.log("[v0] Name search returned", nameResults.length, "results")
    console.log(
      "[v0] First few results:",
      nameResults.slice(0, 3).map((r) => ({
        Name: r.Name,
        NameType: r.NameType,
        IsCurrentIndicator: r.IsCurrentIndicator,
        Score: r.Score,
      })),
    )

    const detailedResults = await Promise.all(
      nameResults.map(async (item) => {
        if (item.Abn) {
          const details = await fetchABNDetails(item.Abn)
          if (details) {
            const statusFromDetails = details.status
            const statusFromNameSearch =
              item.IsCurrentIndicator === "Y" ? "Active" : item.IsCurrentIndicator === "N" ? "Inactive" : null

            // Prefer details status, but use name search indicator if details says Unknown
            const finalStatus = statusFromDetails !== "Unknown" ? statusFromDetails : statusFromNameSearch || "Unknown"

            return {
              ...details,
              status: finalStatus,
              tradingName: item.NameType === "Trading Name" ? item.Name : details.tradingName,
              nameType: item.NameType, // "Entity Name" or "Trading Name"
              score: item.Score || 0,
              nameRelevance: calculateNameRelevance(query, details.name, details.tradingName, item.NameType),
            }
          }
        }
        return {
          abn: item.Abn || "",
          name: item.Name || "Unknown",
          tradingName: item.NameType === "Trading Name" ? item.Name : undefined,
          nameType: item.NameType,
          entityType: item.NameType || "Unknown",
          status: item.IsCurrentIndicator === "Y" ? "Active" : item.IsCurrentIndicator === "N" ? "Inactive" : "Unknown",
          state: item.State || "Unknown",
          postcode: item.Postcode || "Unknown",
          score: item.Score || 0,
          nameRelevance: calculateNameRelevance(query, item.Name || "", undefined, item.NameType),
          gstRegistered: false,
        }
      }),
    )

    // 1. Name relevance (closest match to entity NAME, not trading name)
    // 2. Active status (Active > Unknown > Inactive)
    // 3. Entity type (Australian Private Company first)
    // 4. Original score from ABR
    const sortedResults = detailedResults.sort((a, b) => {
      // 1. Name relevance - higher is better
      const relevanceDiff = (b.nameRelevance || 0) - (a.nameRelevance || 0)
      if (relevanceDiff !== 0) return relevanceDiff

      // 2. Status - Active first
      const statusOrder = { Active: 0, Unknown: 1, Inactive: 2 }
      const aStatusOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 1
      const bStatusOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 1
      if (aStatusOrder !== bStatusOrder) return aStatusOrder - bStatusOrder

      // 3. Entity type - Private Company first
      const aTypeOrder = getEntityTypePriority(a.entityType)
      const bTypeOrder = getEntityTypePriority(b.entityType)
      if (aTypeOrder !== bTypeOrder) return aTypeOrder - bTypeOrder

      // 4. Original ABR score
      return (b.score || 0) - (a.score || 0)
    })

    console.log(
      "[v0] Sorted results:",
      sortedResults.slice(0, 5).map((r) => ({
        name: r.name,
        status: r.status,
        entityType: r.entityType,
        nameRelevance: r.nameRelevance,
      })),
    )

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
