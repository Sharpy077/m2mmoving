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
        return NextResponse.json({ results: [], message: "Invalid ABN format" })
      }

      const abnUrl = `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${cleanABN}&callback=callback&guid=${ABN_LOOKUP_GUID}`
      const response = await fetch(abnUrl)
      const text = await response.text()
      const data = parseJSONP(text) as {
        Abn?: string
        EntityName?: string
        EntityTypeName?: string
        EntityStatusCode?: string
        AddressState?: string
        AddressPostcode?: string
        BusinessName?: Array<{ Value?: string }>
        Gst?: string
        Message?: string
      }

      if (data.Message && !data.Abn) {
        return NextResponse.json({ results: [], message: data.Message })
      }

      return NextResponse.json({
        results: [
          {
            abn: data.Abn || cleanABN,
            name: data.EntityName || "Unknown",
            tradingName: data.BusinessName?.[0]?.Value || data.EntityName || "Unknown",
            entityType: data.EntityTypeName || "Unknown",
            status: data.EntityStatusCode === "ACT" ? "Active" : "Inactive",
            state: data.AddressState || "Unknown",
            postcode: data.AddressPostcode || "Unknown",
            gstRegistered: data.Gst === "Registered",
          },
        ],
      })
    }

    // For name searches - use name search endpoint
    const nameUrl = `https://abr.business.gov.au/json/MatchingNames.aspx?name=${encodeURIComponent(query)}&maxResults=10&callback=callback&guid=${ABN_LOOKUP_GUID}`
    const response = await fetch(nameUrl)
    const text = await response.text()
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

    const results = (data.Names || []).map((item) => ({
      abn: item.Abn || "",
      name: item.Name || "Unknown",
      tradingName: item.NameType === "Trading Name" ? item.Name : undefined,
      entityType: item.NameType || "Unknown",
      status: item.IsCurrentIndicator === "Y" ? "Active" : "Inactive",
      state: item.State || "Unknown",
      postcode: item.Postcode || "Unknown",
      score: item.Score || 0,
    }))

    return NextResponse.json({ results })
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
    // Fetch full details using ABN
    const cleanABN = abn.replace(/\s/g, "")
    const abnUrl = `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${cleanABN}&callback=callback&guid=${ABN_LOOKUP_GUID}`
    const response = await fetch(abnUrl)
    const text = await response.text()
    const data = parseJSONP(text) as {
      Abn?: string
      Acn?: string
      EntityName?: string
      EntityTypeName?: string
      EntityTypeCode?: string
      EntityStatusCode?: string
      AddressState?: string
      AddressPostcode?: string
      BusinessName?: Array<{ Value?: string; EffectiveFrom?: string }>
      Gst?: string
      GstEffectiveFrom?: string
      Message?: string
    }

    if (data.Message && !data.Abn) {
      return NextResponse.json({ error: data.Message }, { status: 404 })
    }

    const business = {
      abn: data.Abn || cleanABN,
      acn: data.Acn || undefined,
      name: data.EntityName || "Unknown",
      tradingNames: (data.BusinessName || []).map((bn) => bn.Value).filter(Boolean),
      entityType: data.EntityTypeName || "Unknown",
      entityTypeCode: data.EntityTypeCode || "Unknown",
      status: data.EntityStatusCode === "ACT" ? "Active" : "Inactive",
      state: data.AddressState || "Unknown",
      postcode: data.AddressPostcode || "Unknown",
      gstRegistered: data.Gst === "Registered",
      gstRegisteredDate: data.GstEffectiveFrom || undefined,
    }

    return NextResponse.json({ business })
  } catch (error) {
    console.error("[v0] Business details error:", error)
    return NextResponse.json({ error: "Failed to fetch business details" }, { status: 500 })
  }
}
