import { type NextRequest, NextResponse } from "next/server"

// Google Places Autocomplete API proxy
// This keeps the API key secure on the server side
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const input = searchParams.get("input")
  const sessionToken = searchParams.get("sessionToken")

  if (!input) {
    return NextResponse.json({ error: "Input is required" }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY

  // If no API key, return mock suggestions for development
  if (!apiKey) {
    console.log("[v0] No GOOGLE_PLACES_API_KEY found, using mock data")
    return NextResponse.json({
      predictions: getMockPredictions(input),
      status: "OK",
      _source: "mock",
    })
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json")
    url.searchParams.set("input", input)
    url.searchParams.set("key", apiKey)
    url.searchParams.set("components", "country:au") // Restrict to Australia
    url.searchParams.set("types", "(regions)")
    url.searchParams.set("location", "-37.8136,144.9631")
    url.searchParams.set("radius", "500000") // 500km radius covers most of Victoria
    if (sessionToken) {
      url.searchParams.set("sessiontoken", sessionToken)
    }

    console.log("[v0] Fetching from Google Places API:", url.toString().replace(apiKey, "REDACTED"))
    const response = await fetch(url.toString())
    const data = await response.json()

    console.log("[v0] Google Places API response:", {
      status: data.status,
      predictionsCount: data.predictions?.length || 0,
      errorMessage: data.error_message,
    })

    // Handle various API response statuses
    if (data.status === "OK" || data.status === "ZERO_RESULTS") {
      return NextResponse.json({
        ...data,
        _source: "google",
      })
    }

    // Log the error for debugging
    console.error("[v0] Google Places API error:", data.status, data.error_message)

    // If API returns error, fall back to mock data with error info
    if (data.status === "REQUEST_DENIED") {
      console.error("[v0] API Key issue - check if Places API is enabled and key has correct restrictions")
      return NextResponse.json({
        predictions: getMockPredictions(input),
        status: "OK",
        _source: "mock",
        _apiError: `REQUEST_DENIED: ${data.error_message || "Check API key configuration"}`,
      })
    }

    if (data.status === "OVER_QUERY_LIMIT") {
      console.error("[v0] Query limit exceeded")
      return NextResponse.json({
        predictions: getMockPredictions(input),
        status: "OK",
        _source: "mock",
        _apiError: "OVER_QUERY_LIMIT: API quota exceeded",
      })
    }

    // Unknown error - return mock data
    return NextResponse.json({
      predictions: getMockPredictions(input),
      status: "OK",
      _source: "mock",
      _apiError: `${data.status}: ${data.error_message || "Unknown error"}`,
    })
  } catch (error) {
    console.error("[v0] Places API fetch error:", error)
    // Return mock data on network error
    return NextResponse.json({
      predictions: getMockPredictions(input),
      status: "OK",
      _source: "mock",
      _apiError: `Network error: ${error instanceof Error ? error.message : "Unknown"}`,
    })
  }
}

function getMockPredictions(input: string) {
  const mockAddresses = [
    // Melbourne CBD and surrounds
    {
      description: "Melbourne VIC 3000, Australia",
      place_id: "mock_melbourne",
      structured_formatting: { main_text: "Melbourne", secondary_text: "VIC 3000, Australia" },
    },
    {
      description: "Melbourne CBD VIC 3000, Australia",
      place_id: "mock_melbourne_cbd",
      structured_formatting: { main_text: "Melbourne CBD", secondary_text: "VIC 3000, Australia" },
    },
    {
      description: "Richmond VIC 3121, Australia",
      place_id: "mock_richmond",
      structured_formatting: { main_text: "Richmond", secondary_text: "VIC 3121, Australia" },
    },
    {
      description: "South Yarra VIC 3141, Australia",
      place_id: "mock_south_yarra",
      structured_formatting: { main_text: "South Yarra", secondary_text: "VIC 3141, Australia" },
    },
    {
      description: "St Kilda VIC 3182, Australia",
      place_id: "mock_st_kilda",
      structured_formatting: { main_text: "St Kilda", secondary_text: "VIC 3182, Australia" },
    },
    {
      description: "Fitzroy VIC 3065, Australia",
      place_id: "mock_fitzroy",
      structured_formatting: { main_text: "Fitzroy", secondary_text: "VIC 3065, Australia" },
    },
    {
      description: "Carlton VIC 3053, Australia",
      place_id: "mock_carlton",
      structured_formatting: { main_text: "Carlton", secondary_text: "VIC 3053, Australia" },
    },
    {
      description: "Brunswick VIC 3056, Australia",
      place_id: "mock_brunswick",
      structured_formatting: { main_text: "Brunswick", secondary_text: "VIC 3056, Australia" },
    },
    {
      description: "Collingwood VIC 3066, Australia",
      place_id: "mock_collingwood",
      structured_formatting: { main_text: "Collingwood", secondary_text: "VIC 3066, Australia" },
    },
    {
      description: "Prahran VIC 3181, Australia",
      place_id: "mock_prahran",
      structured_formatting: { main_text: "Prahran", secondary_text: "VIC 3181, Australia" },
    },
    // Outer Melbourne
    {
      description: "Dandenong VIC 3175, Australia",
      place_id: "mock_dandenong",
      structured_formatting: { main_text: "Dandenong", secondary_text: "VIC 3175, Australia" },
    },
    {
      description: "Footscray VIC 3011, Australia",
      place_id: "mock_footscray",
      structured_formatting: { main_text: "Footscray", secondary_text: "VIC 3011, Australia" },
    },
    {
      description: "Box Hill VIC 3128, Australia",
      place_id: "mock_box_hill",
      structured_formatting: { main_text: "Box Hill", secondary_text: "VIC 3128, Australia" },
    },
    {
      description: "Ringwood VIC 3134, Australia",
      place_id: "mock_ringwood",
      structured_formatting: { main_text: "Ringwood", secondary_text: "VIC 3134, Australia" },
    },
    // Regional Victoria
    {
      description: "Geelong VIC 3220, Australia",
      place_id: "mock_geelong",
      structured_formatting: { main_text: "Geelong", secondary_text: "VIC 3220, Australia" },
    },
    {
      description: "Ballarat VIC 3350, Australia",
      place_id: "mock_ballarat",
      structured_formatting: { main_text: "Ballarat", secondary_text: "VIC 3350, Australia" },
    },
    {
      description: "Bendigo VIC 3550, Australia",
      place_id: "mock_bendigo",
      structured_formatting: { main_text: "Bendigo", secondary_text: "VIC 3550, Australia" },
    },
    // South Australia
    {
      description: "Mount Gambier SA 5290, Australia",
      place_id: "mock_mt_gambier",
      structured_formatting: { main_text: "Mount Gambier", secondary_text: "SA 5290, Australia" },
    },
    {
      description: "Adelaide SA 5000, Australia",
      place_id: "mock_adelaide",
      structured_formatting: { main_text: "Adelaide", secondary_text: "SA 5000, Australia" },
    },
    // Other states
    {
      description: "Sydney NSW 2000, Australia",
      place_id: "mock_sydney",
      structured_formatting: { main_text: "Sydney", secondary_text: "NSW 2000, Australia" },
    },
    {
      description: "Brisbane QLD 4000, Australia",
      place_id: "mock_brisbane",
      structured_formatting: { main_text: "Brisbane", secondary_text: "QLD 4000, Australia" },
    },
    {
      description: "Perth WA 6000, Australia",
      place_id: "mock_perth",
      structured_formatting: { main_text: "Perth", secondary_text: "WA 6000, Australia" },
    },
  ]

  const lowerInput = input.toLowerCase()
  return mockAddresses.filter((addr) => addr.description.toLowerCase().includes(lowerInput)).slice(0, 5)
}
