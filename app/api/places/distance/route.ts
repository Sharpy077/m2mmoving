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
      const distance = calculateHaversineDistance(originLat, originLng, destinationLat, destinationLng)
      const durationMinutes = Math.round((distance / 50) * 60) // Estimate 50km/h average

      return NextResponse.json({
        distanceKm: Math.round(distance * 10) / 10,
        distanceText: `${Math.round(distance)} km`,
        durationMinutes,
        durationText: formatDuration(durationMinutes),
        origin: originAddress || `${originLat},${originLng}`,
        destination: destinationAddress || `${destinationLat},${destinationLng}`,
        source: "haversine",
      })
    }

    // Use Google Routes API (newer than Distance Matrix)
    const routesUrl = "https://routes.googleapis.com/directions/v2:computeRoutes"

    const routesResponse = await fetch(routesUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY,
        "X-Goog-FieldMask":
          "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.startLocation,routes.legs.endLocation",
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: originLat,
              longitude: originLng,
            },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: destinationLat,
              longitude: destinationLng,
            },
          },
        },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        computeAlternativeRoutes: false,
        languageCode: "en-AU",
        units: "METRIC",
      }),
    })

    if (!routesResponse.ok) {
      const errorText = await routesResponse.text()
      console.error("[v0] Google Routes API error:", errorText)

      // Fallback to haversine
      const distance = calculateHaversineDistance(originLat, originLng, destinationLat, destinationLng)
      const durationMinutes = Math.round((distance / 50) * 60)

      return NextResponse.json({
        distanceKm: Math.round(distance * 10) / 10,
        distanceText: `${Math.round(distance)} km`,
        durationMinutes,
        durationText: formatDuration(durationMinutes),
        origin: originAddress || `${originLat},${originLng}`,
        destination: destinationAddress || `${destinationLat},${destinationLng}`,
        source: "haversine_fallback",
      })
    }

    const routesData = await routesResponse.json()

    if (!routesData.routes || routesData.routes.length === 0) {
      // Fallback to haversine
      const distance = calculateHaversineDistance(originLat, originLng, destinationLat, destinationLng)
      const durationMinutes = Math.round((distance / 50) * 60)

      return NextResponse.json({
        distanceKm: Math.round(distance * 10) / 10,
        distanceText: `${Math.round(distance)} km`,
        durationMinutes,
        durationText: formatDuration(durationMinutes),
        origin: originAddress || `${originLat},${originLng}`,
        destination: destinationAddress || `${destinationLat},${destinationLng}`,
        source: "haversine_no_route",
      })
    }

    const route = routesData.routes[0]
    const distanceMeters = route.distanceMeters || 0
    const distanceKm = distanceMeters / 1000

    // Parse duration (format: "1234s")
    const durationStr = route.duration || "0s"
    const durationSeconds = Number.parseInt(durationStr.replace("s", ""), 10) || 0
    const durationMinutes = Math.round(durationSeconds / 60)

    const response: DistanceResponse = {
      distanceKm: Math.round(distanceKm * 10) / 10,
      distanceText: formatDistance(distanceKm),
      durationMinutes,
      durationText: formatDuration(durationMinutes),
      routePolyline: route.polyline?.encodedPolyline,
      origin: originAddress || `${originLat},${originLng}`,
      destination: destinationAddress || `${destinationLat},${destinationLng}`,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] Distance calculation error:", error)
    return NextResponse.json({ error: "Failed to calculate distance" }, { status: 500 })
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
