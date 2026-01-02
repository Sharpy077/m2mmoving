import { type NextRequest, NextResponse } from "next/server"

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY

interface DistanceRequest {
  originLat: number
  originLng: number
  destinationLat: number
  destinationLng: number
  originAddress?: string
  destinationAddress?: string
}

interface DistanceResponse {
  distanceKm: number
  distanceText: string
  durationMinutes: number
  durationText: string
  routePolyline?: string
  origin: string
  destination: string
  source?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: DistanceRequest = await request.json()
    const { originLat, originLng, destinationLat, destinationLng, originAddress, destinationAddress } = body

    // Validate coordinates
    if (!originLat || !originLng || !destinationLat || !destinationLng) {
      return NextResponse.json({ error: "Missing coordinates" }, { status: 400 })
    }

    if (!GOOGLE_API_KEY) {
      // Fallback to haversine calculation if no API key
      return NextResponse.json(
        calculateHaversineResponse(
          originLat,
          originLng,
          destinationLat,
          destinationLng,
          originAddress,
          destinationAddress,
          "haversine_no_key",
        ),
      )
    }

    const distanceMatrixUrl = new URL("https://maps.googleapis.com/maps/api/distancematrix/json")
    distanceMatrixUrl.searchParams.set("origins", `${originLat},${originLng}`)
    distanceMatrixUrl.searchParams.set("destinations", `${destinationLat},${destinationLng}`)
    distanceMatrixUrl.searchParams.set("mode", "driving")
    distanceMatrixUrl.searchParams.set("units", "metric")
    distanceMatrixUrl.searchParams.set("key", GOOGLE_API_KEY)

    const response = await fetch(distanceMatrixUrl.toString())

    if (!response.ok) {
      console.log("[v0] Distance Matrix API HTTP error:", response.status)
      return NextResponse.json(
        calculateHaversineResponse(
          originLat,
          originLng,
          destinationLat,
          destinationLng,
          originAddress,
          destinationAddress,
          "haversine_http_error",
        ),
      )
    }

    const data = await response.json()

    // Check for API-level errors
    if (data.status !== "OK") {
      console.log("[v0] Distance Matrix API status:", data.status, data.error_message)
      return NextResponse.json(
        calculateHaversineResponse(
          originLat,
          originLng,
          destinationLat,
          destinationLng,
          originAddress,
          destinationAddress,
          "haversine_api_error",
        ),
      )
    }

    // Check for element-level errors (e.g., no route found)
    const element = data.rows?.[0]?.elements?.[0]
    if (!element || element.status !== "OK") {
      console.log("[v0] Distance Matrix element status:", element?.status)
      return NextResponse.json(
        calculateHaversineResponse(
          originLat,
          originLng,
          destinationLat,
          destinationLng,
          originAddress,
          destinationAddress,
          "haversine_no_route",
        ),
      )
    }

    // Extract distance and duration from the response
    const distanceMeters = element.distance?.value || 0
    const distanceKm = distanceMeters / 1000
    const durationSeconds = element.duration?.value || 0
    const durationMinutes = Math.round(durationSeconds / 60)

    const result: DistanceResponse = {
      distanceKm: Math.round(distanceKm * 10) / 10,
      distanceText: element.distance?.text || formatDistance(distanceKm),
      durationMinutes,
      durationText: element.duration?.text || formatDuration(durationMinutes),
      origin: originAddress || data.origin_addresses?.[0] || `${originLat},${originLng}`,
      destination: destinationAddress || data.destination_addresses?.[0] || `${destinationLat},${destinationLng}`,
      source: "google_distance_matrix",
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] Distance calculation error:", error)
    return NextResponse.json({ error: "Failed to calculate distance" }, { status: 500 })
  }
}

function calculateHaversineResponse(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  originAddress?: string,
  destinationAddress?: string,
  source = "haversine",
): DistanceResponse {
  const distance = calculateHaversineDistance(lat1, lng1, lat2, lng2)
  const durationMinutes = Math.round((distance / 60) * 60) // Estimate 60km/h average

  return {
    distanceKm: Math.round(distance * 10) / 10,
    distanceText: formatDistance(distance),
    durationMinutes,
    durationText: formatDuration(durationMinutes),
    origin: originAddress || `${lat1},${lng1}`,
    destination: destinationAddress || `${lat2},${lng2}`,
    source,
  }
}

// Haversine formula for straight-line distance
function calculateHaversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c * 1.3 // Multiply by 1.3 to approximate road distance from straight-line
}

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`
  }
  return `${Math.round(km)} km`
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours} hr${hours > 1 ? "s" : ""}`
  }
  return `${hours} hr ${mins} min`
}
