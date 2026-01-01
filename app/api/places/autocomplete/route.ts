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
    return NextResponse.json({
      predictions: getMockPredictions(input),
      status: "OK",
    })
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json")
    url.searchParams.set("input", input)
    url.searchParams.set("key", apiKey)
    url.searchParams.set("components", "country:au") // Restrict to Australia
    url.searchParams.set("types", "address")
    if (sessionToken) {
      url.searchParams.set("sessiontoken", sessionToken)
    }

    const response = await fetch(url.toString())
    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error("Places API error:", error)
    return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 })
  }
}

// Mock predictions for development without API key
function getMockPredictions(input: string) {
  const mockAddresses = [
    {
      description: "123 Collins Street, Melbourne VIC 3000",
      place_id: "mock_1",
      structured_formatting: { main_text: "123 Collins Street", secondary_text: "Melbourne VIC 3000" },
    },
    {
      description: "456 Bourke Street, Melbourne VIC 3000",
      place_id: "mock_2",
      structured_formatting: { main_text: "456 Bourke Street", secondary_text: "Melbourne VIC 3000" },
    },
    {
      description: "789 Flinders Street, Melbourne VIC 3000",
      place_id: "mock_3",
      structured_formatting: { main_text: "789 Flinders Street", secondary_text: "Melbourne VIC 3000" },
    },
    {
      description: "321 Swanston Street, Melbourne VIC 3000",
      place_id: "mock_4",
      structured_formatting: { main_text: "321 Swanston Street", secondary_text: "Melbourne VIC 3000" },
    },
    {
      description: "555 Lonsdale Street, Melbourne VIC 3000",
      place_id: "mock_5",
      structured_formatting: { main_text: "555 Lonsdale Street", secondary_text: "Melbourne VIC 3000" },
    },
  ]

  const lowerInput = input.toLowerCase()
  return mockAddresses.filter((addr) => addr.description.toLowerCase().includes(lowerInput)).slice(0, 5)
}
