import { type NextRequest, NextResponse } from "next/server"
import { checkApiSecurity } from "@/lib/api-security"

// Google Places Autocomplete API proxy
// This keeps the API key secure on the server side
const autocompleteCache = new Map<string, { data: unknown; timestamp: number }>()
const AUTOCOMPLETE_CACHE_TTL = 30 * 24 * 60 * 60 * 1000 // 30 days
const MAX_AUTOCOMPLETE_CACHE = 500

export async function GET(request: NextRequest) {
  const security = await checkApiSecurity(request, {
    rateLimit: { windowMs: 60000, maxRequests: 60 }, // 60 requests per minute
    validateOrigin: true,
  })

  if (!security.allowed) {
    return security.response
  }

  const searchParams = request.nextUrl.searchParams
  const input = searchParams.get("input")
  const sessionToken = searchParams.get("sessionToken")
  const types = searchParams.get("types")

  if (!input) {
    return NextResponse.json({ error: "Input is required" }, { status: 400 })
  }

  const cacheKey = `${input.toLowerCase().trim()}-${types || "all"}`
  const cached = autocompleteCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < AUTOCOMPLETE_CACHE_TTL) {
    console.log("[v0] Autocomplete cache HIT:", cacheKey)
    return NextResponse.json(cached.data)
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY

  // If no API key, return mock suggestions for development
  if (!apiKey) {
    console.log("[v0] No GOOGLE_PLACES_API_KEY found, using mock data")
    const mockResponse = {
      predictions: getMockPredictions(input, types),
      status: "OK",
      _source: "mock",
    }
    return NextResponse.json(mockResponse)
  }

  try {
    const url = "https://places.googleapis.com/v1/places:autocomplete"

    let includedPrimaryTypes = ["locality", "sublocality", "postal_code", "street_address", "route"]
    if (types === "address") {
      includedPrimaryTypes = ["street_address", "premise", "subpremise", "route"]
    }

    const requestBody = {
      input: input,
      includedRegionCodes: ["au"], // Restrict to Australia
      languageCode: "en",
      locationBias: {
        circle: {
          center: {
            latitude: -37.8136,
            longitude: 144.9631,
          },
          radius: 50000.0, // 50km radius (maximum allowed)
        },
      },
      includedPrimaryTypes,
    }

    console.log("[v0] Fetching from Google Places API (New):", url, { types, includedPrimaryTypes })

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        ...(sessionToken && { "X-Goog-Session-Token": sessionToken }),
      },
      body: JSON.stringify(requestBody),
    })

    const data = await response.json()

    console.log("[v0] Google Places API (New) response:", {
      suggestionsCount: data.suggestions?.length || 0,
      error: data.error?.message,
    })

    // Handle successful response - transform to legacy format for compatibility
    if (data.suggestions && Array.isArray(data.suggestions)) {
      const predictions = data.suggestions.map((suggestion: any) => ({
        description:
          suggestion.placePrediction?.text?.text || suggestion.placePrediction?.structuredFormat?.mainText?.text || "",
        place_id: suggestion.placePrediction?.placeId || "",
        structured_formatting: {
          main_text: suggestion.placePrediction?.structuredFormat?.mainText?.text || "",
          secondary_text: suggestion.placePrediction?.structuredFormat?.secondaryText?.text || "",
        },
      }))

      const result = {
        predictions,
        status: "OK",
        _source: "google",
      }

      if (predictions.length > 0) {
        if (autocompleteCache.size >= MAX_AUTOCOMPLETE_CACHE) {
          const keysToRemove = Array.from(autocompleteCache.keys()).slice(0, 50)
          keysToRemove.forEach((key) => autocompleteCache.delete(key))
        }
        autocompleteCache.set(cacheKey, { data: result, timestamp: Date.now() })
      }

      return NextResponse.json(result)
    }

    // Handle API errors
    if (data.error) {
      console.error("[v0] Google Places API (New) error:", data.error.code, data.error.message)

      return NextResponse.json({
        predictions: getMockPredictions(input, types),
        status: "OK",
        _source: "mock",
        _apiError: `${data.error.code}: ${data.error.message}`,
      })
    }

    // No suggestions found
    return NextResponse.json({
      predictions: [],
      status: "ZERO_RESULTS",
      _source: "google",
    })
  } catch (error) {
    console.error("[v0] Places API fetch error:", error)
    // Return mock data on network error
    return NextResponse.json({
      predictions: getMockPredictions(input, types),
      status: "OK",
      _source: "mock",
      _apiError: `Network error: ${error instanceof Error ? error.message : "Unknown"}`,
    })
  }
}

function getMockPredictions(input: string, types?: string | null) {
  const mockStreetAddresses = [
    {
      description: "123 Collins Street, Melbourne VIC 3000, Australia",
      place_id: "mock_collins_123",
      structured_formatting: { main_text: "123 Collins Street", secondary_text: "Melbourne VIC 3000, Australia" },
    },
    {
      description: "456 Bourke Street, Melbourne VIC 3000, Australia",
      place_id: "mock_bourke_456",
      structured_formatting: { main_text: "456 Bourke Street", secondary_text: "Melbourne VIC 3000, Australia" },
    },
    {
      description: "789 Flinders Street, Melbourne VIC 3000, Australia",
      place_id: "mock_flinders_789",
      structured_formatting: { main_text: "789 Flinders Street", secondary_text: "Melbourne VIC 3000, Australia" },
    },
    {
      description: "10 Main Street, Richmond VIC 3121, Australia",
      place_id: "mock_main_10",
      structured_formatting: { main_text: "10 Main Street", secondary_text: "Richmond VIC 3121, Australia" },
    },
    {
      description: "25 Church Street, Richmond VIC 3121, Australia",
      place_id: "mock_church_25",
      structured_formatting: { main_text: "25 Church Street", secondary_text: "Richmond VIC 3121, Australia" },
    },
    {
      description: "47 Blazey Street, Richmond VIC 3121, Australia",
      place_id: "mock_blazey_47",
      structured_formatting: { main_text: "47 Blazey Street", secondary_text: "Richmond VIC 3121, Australia" },
    },
    {
      description: "100 High Street, Prahran VIC 3181, Australia",
      place_id: "mock_high_100",
      structured_formatting: { main_text: "100 High Street", secondary_text: "Prahran VIC 3181, Australia" },
    },
    {
      description: "55 Chapel Street, South Yarra VIC 3141, Australia",
      place_id: "mock_chapel_55",
      structured_formatting: { main_text: "55 Chapel Street", secondary_text: "South Yarra VIC 3141, Australia" },
    },
    {
      description: "200 Whitehorse Road, Nunawading VIC 3131, Australia",
      place_id: "mock_whitehorse_200",
      structured_formatting: { main_text: "200 Whitehorse Road", secondary_text: "Nunawading VIC 3131, Australia" },
    },
    {
      description: "88 Station Street, Box Hill VIC 3128, Australia",
      place_id: "mock_station_88",
      structured_formatting: { main_text: "88 Station Street", secondary_text: "Box Hill VIC 3128, Australia" },
    },
  ]

  const mockSuburbs = [
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
    // Eastern suburbs
    {
      description: "Nunawading VIC 3131, Australia",
      place_id: "mock_nunawading",
      structured_formatting: { main_text: "Nunawading", secondary_text: "VIC 3131, Australia" },
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
    {
      description: "Doncaster VIC 3108, Australia",
      place_id: "mock_doncaster",
      structured_formatting: { main_text: "Doncaster", secondary_text: "VIC 3108, Australia" },
    },
    {
      description: "Mitcham VIC 3132, Australia",
      place_id: "mock_mitcham",
      structured_formatting: { main_text: "Mitcham", secondary_text: "VIC 3132, Australia" },
    },
    {
      description: "Blackburn VIC 3130, Australia",
      place_id: "mock_blackburn",
      structured_formatting: { main_text: "Blackburn", secondary_text: "VIC 3130, Australia" },
    },
    {
      description: "Burwood VIC 3125, Australia",
      place_id: "mock_burwood",
      structured_formatting: { main_text: "Burwood", secondary_text: "VIC 3125, Australia" },
    },
    {
      description: "Glen Waverley VIC 3150, Australia",
      place_id: "mock_glen_waverley",
      structured_formatting: { main_text: "Glen Waverley", secondary_text: "VIC 3150, Australia" },
    },
    {
      description: "Mount Waverley VIC 3149, Australia",
      place_id: "mock_mount_waverley",
      structured_formatting: { main_text: "Mount Waverley", secondary_text: "VIC 3149, Australia" },
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
      description: "Sunshine VIC 3020, Australia",
      place_id: "mock_sunshine",
      structured_formatting: { main_text: "Sunshine", secondary_text: "VIC 3020, Australia" },
    },
    {
      description: "Werribee VIC 3030, Australia",
      place_id: "mock_werribee",
      structured_formatting: { main_text: "Werribee", secondary_text: "VIC 3030, Australia" },
    },
    {
      description: "Cranbourne VIC 3977, Australia",
      place_id: "mock_cranbourne",
      structured_formatting: { main_text: "Cranbourne", secondary_text: "VIC 3977, Australia" },
    },
    {
      description: "Frankston VIC 3199, Australia",
      place_id: "mock_frankston",
      structured_formatting: { main_text: "Frankston", secondary_text: "VIC 3199, Australia" },
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

  const mockData = types === "address" ? mockStreetAddresses : mockSuburbs

  const lowerInput = input.toLowerCase()
  return mockData.filter((addr) => addr.description.toLowerCase().includes(lowerInput)).slice(0, 5)
}
