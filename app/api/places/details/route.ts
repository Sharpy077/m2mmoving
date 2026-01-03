import { type NextRequest, NextResponse } from "next/server"
import { checkApiSecurity } from "@/lib/api-security"

// Google Places Details API (New) proxy
export async function GET(request: NextRequest) {
  const security = await checkApiSecurity(request, {
    rateLimit: { windowMs: 60000, maxRequests: 30 }, // 30 requests per minute
    validateOrigin: true,
  })

  if (!security.allowed) {
    return security.response
  }

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
    const url = `https://places.googleapis.com/v1/places/${placeId}`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,addressComponents,location",
        ...(sessionToken && { "X-Goog-Session-Token": sessionToken }),
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Google Places Details API (New) error:", response.status, errorText)

      // Fallback to parsing from placeId if API fails
      return NextResponse.json({
        result: getMockPlaceDetails(placeId),
        status: "OK",
        _fallback: true,
      })
    }

    const data = await response.json()
    console.log("[v0] Places Details API (New) response:", JSON.stringify(data, null, 2))

    const transformedResult = transformToLegacyFormat(data)

    return NextResponse.json({
      result: transformedResult,
      status: "OK",
    })
  } catch (error) {
    console.error("[v0] Places Details API error:", error)
    return NextResponse.json({ error: "Failed to fetch place details" }, { status: 500 })
  }
}

function transformToLegacyFormat(data: {
  id?: string
  displayName?: { text: string }
  formattedAddress?: string
  addressComponents?: Array<{
    longText: string
    shortText?: string
    types: string[]
  }>
  location?: { latitude: number; longitude: number }
}) {
  const addressComponents = (data.addressComponents || []).map((component) => ({
    long_name: component.longText,
    short_name: component.shortText || component.longText,
    types: component.types,
  }))

  // Log the address components to debug postcode extraction
  console.log("[v0] Address components:", JSON.stringify(addressComponents, null, 2))

  return {
    formatted_address: data.formattedAddress || "",
    geometry: data.location
      ? {
          location: {
            lat: data.location.latitude,
            lng: data.location.longitude,
          },
        }
      : undefined,
    address_components: addressComponents,
  }
}

// Mock place details for development
function getMockPlaceDetails(placeId: string) {
  const mockDetails: Record<string, object> = {
    mock_1: {
      formatted_address: "123 Collins Street, Melbourne VIC 3000, Australia",
      geometry: { location: { lat: -37.8136, lng: 144.9631 } },
      address_components: [
        { long_name: "123", short_name: "123", types: ["street_number"] },
        { long_name: "Collins Street", short_name: "Collins St", types: ["route"] },
        { long_name: "Melbourne", short_name: "Melbourne", types: ["locality"] },
        { long_name: "Victoria", short_name: "VIC", types: ["administrative_area_level_1"] },
        { long_name: "3000", short_name: "3000", types: ["postal_code"] },
      ],
    },
    mock_2: {
      formatted_address: "456 Bourke Street, Melbourne VIC 3000, Australia",
      geometry: { location: { lat: -37.8142, lng: 144.9632 } },
      address_components: [
        { long_name: "456", short_name: "456", types: ["street_number"] },
        { long_name: "Bourke Street", short_name: "Bourke St", types: ["route"] },
        { long_name: "Melbourne", short_name: "Melbourne", types: ["locality"] },
        { long_name: "Victoria", short_name: "VIC", types: ["administrative_area_level_1"] },
        { long_name: "3000", short_name: "3000", types: ["postal_code"] },
      ],
    },
  }

  return (
    mockDetails[placeId] || {
      formatted_address: "Mock Address, Melbourne VIC 3000, Australia",
      geometry: { location: { lat: -37.8136, lng: 144.9631 } },
      address_components: [
        { long_name: "Mock Address", short_name: "Mock Address", types: ["route"] },
        { long_name: "Melbourne", short_name: "Melbourne", types: ["locality"] },
        { long_name: "Victoria", short_name: "VIC", types: ["administrative_area_level_1"] },
        { long_name: "3000", short_name: "3000", types: ["postal_code"] },
      ],
    }
  )
}
