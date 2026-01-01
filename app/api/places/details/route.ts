import { type NextRequest, NextResponse } from "next/server"

// Google Places Details API proxy
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const placeId = searchParams.get("placeId")
  const sessionToken = searchParams.get("sessionToken")

  if (!placeId) {
    return NextResponse.json({ error: "Place ID is required" }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY

  // If no API key, return mock details for development
  if (!apiKey) {
    return NextResponse.json({
      result: getMockPlaceDetails(placeId),
      status: "OK",
    })
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json")
    url.searchParams.set("place_id", placeId)
    url.searchParams.set("key", apiKey)
    url.searchParams.set("fields", "address_components,formatted_address,geometry")
    if (sessionToken) {
      url.searchParams.set("sessiontoken", sessionToken)
    }

    const response = await fetch(url.toString())
    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error("Places Details API error:", error)
    return NextResponse.json({ error: "Failed to fetch place details" }, { status: 500 })
  }
}

// Mock place details for development
function getMockPlaceDetails(placeId: string) {
  const mockDetails: Record<string, object> = {
    mock_1: {
      formatted_address: "123 Collins Street, Melbourne VIC 3000, Australia",
      geometry: { location: { lat: -37.8136, lng: 144.9631 } },
      address_components: [
        { long_name: "123", types: ["street_number"] },
        { long_name: "Collins Street", types: ["route"] },
        { long_name: "Melbourne", types: ["locality"] },
        { long_name: "Victoria", short_name: "VIC", types: ["administrative_area_level_1"] },
        { long_name: "3000", types: ["postal_code"] },
      ],
    },
    mock_2: {
      formatted_address: "456 Bourke Street, Melbourne VIC 3000, Australia",
      geometry: { location: { lat: -37.8142, lng: 144.9632 } },
      address_components: [
        { long_name: "456", types: ["street_number"] },
        { long_name: "Bourke Street", types: ["route"] },
        { long_name: "Melbourne", types: ["locality"] },
        { long_name: "Victoria", short_name: "VIC", types: ["administrative_area_level_1"] },
        { long_name: "3000", types: ["postal_code"] },
      ],
    },
  }

  return (
    mockDetails[placeId] || {
      formatted_address: "Mock Address, Melbourne VIC 3000, Australia",
      geometry: { location: { lat: -37.8136, lng: 144.9631 } },
      address_components: [
        { long_name: "Mock Address", types: ["route"] },
        { long_name: "Melbourne", types: ["locality"] },
        { long_name: "Victoria", short_name: "VIC", types: ["administrative_area_level_1"] },
        { long_name: "3000", types: ["postal_code"] },
      ],
    }
  )
}
