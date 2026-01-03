import { type NextRequest, NextResponse } from "next/server"

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY

const distanceCache = new Map<string, { data: DistanceResponse; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

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
  routeGeometry?: number[][]
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

    const cacheKey = `${originLat.toFixed(4)},${originLng.toFixed(4)}-${destinationLat.toFixed(4)},${destinationLng.toFixed(4)}`
    const cached = distanceCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data)
    }

    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destinationLng},${destinationLat}?overview=full&geometries=geojson`

      const osrmResponse = await fetch(osrmUrl, {
        headers: { "User-Agent": "M&M-Moving-Quote-System/1.0" },
      })

      if (osrmResponse.ok) {
        const osrmData = await osrmResponse.json()

        if (osrmData.code === "Ok" && osrmData.routes?.[0]) {
          const route = osrmData.routes[0]
          const distanceKm = route.distance / 1000
          const durationMinutes = Math.round(route.duration / 60)

          // Extract route geometry (array of [lng, lat] coordinates)
          const routeGeometry = route.geometry?.coordinates?.map((coord: number[]) => [coord[1], coord[0]]) || []

          const result: DistanceResponse = {
            distanceKm: Math.round(distanceKm * 10) / 10,
            distanceText: formatDistance(distanceKm),
            durationMinutes,
            durationText: formatDuration(durationMinutes),
            routeGeometry,
            origin: originAddress || `${originLat},${originLng}`,
            destination: destinationAddress || `${destinationLat},${destinationLng}`,
            source: "osrm",
          }

          // Cache the result
          distanceCache.set(cacheKey, { data: result, timestamp: Date.now() })

          return NextResponse.json(result)
        }
      }
    } catch (osrmError) {
      console.log("[v0] OSRM routing failed, trying Google:", osrmError)
    }

    if (GOOGLE_API_KEY) {
      try {
        const distanceMatrixUrl = new URL("https://maps.googleapis.com/maps/api/distancematrix/json")
        distanceMatrixUrl.searchParams.set("origins", `${originLat},${originLng}`)
        distanceMatrixUrl.searchParams.set("destinations", `${destinationLat},${destinationLng}`)
        distanceMatrixUrl.searchParams.set("mode", "driving")
        distanceMatrixUrl.searchParams.set("units", "metric")
        distanceMatrixUrl.searchParams.set("key", GOOGLE_API_KEY)

        const response = await fetch(distanceMatrixUrl.toString())

        if (response.ok) {
          const responseText = await response.text()

          if (responseText.trim().startsWith("{") || responseText.trim().startsWith("[")) {
            const data = JSON.parse(responseText)

            if (data.status === "OK") {
              const element = data.rows?.[0]?.elements?.[0]
              if (element && element.status === "OK") {
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
                  destination:
                    destinationAddress || data.destination_addresses?.[0] || `${destinationLat},${destinationLng}`,
                  source: "google_distance_matrix",
                }

                // Cache the result
                distanceCache.set(cacheKey, { data: result, timestamp: Date.now() })

                return NextResponse.json(result)
              }
            }
          }
        }
      } catch (googleError) {
        console.log("[v0] Google Distance Matrix failed:", googleError)
      }
    }

    const haversineDistance = calculateHaversineDistance(originLat, originLng, destinationLat, destinationLng)
    const estimatedDuration = Math.round((haversineDistance / 50) * 60) // ~50 km/h average

    const routeGeometry = generateCurvedRoute(originLat, originLng, destinationLat, destinationLng)

    const result: DistanceResponse = {
      distanceKm: Math.round(haversineDistance * 10) / 10,
      distanceText: formatDistance(haversineDistance),
      durationMinutes: estimatedDuration,
      durationText: formatDuration(estimatedDuration),
      routeGeometry,
      origin: originAddress || `${originLat},${originLng}`,
      destination: destinationAddress || `${destinationLat},${destinationLng}`,
      source: "calculated",
    }

    // Cache the result
    distanceCache.set(cacheKey, { data: result, timestamp: Date.now() })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] Distance calculation error:", error)
    return NextResponse.json({ error: "Failed to calculate distance" }, { status: 500 })
  }
}

function generateCurvedRoute(lat1: number, lng1: number, lat2: number, lng2: number): number[][] {
  const points: number[][] = []
  const numPoints = 20 // Number of intermediate points for smooth curve

  // Convert to radians
  const φ1 = (lat1 * Math.PI) / 180
  const λ1 = (lng1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const λ2 = (lng2 * Math.PI) / 180

  // Calculate angular distance
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.pow(Math.sin((φ2 - φ1) / 2), 2) + Math.cos(φ1) * Math.cos(φ2) * Math.pow(Math.sin((λ2 - λ1) / 2), 2),
      ),
    )

  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints

    // Great circle interpolation
    const A = Math.sin((1 - f) * d) / Math.sin(d)
    const B = Math.sin(f * d) / Math.sin(d)

    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2)
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2)
    const z = A * Math.sin(φ1) + B * Math.sin(φ2)

    const φ = Math.atan2(z, Math.sqrt(x * x + y * y))
    const λ = Math.atan2(y, x)

    // Convert back to degrees
    const lat = (φ * 180) / Math.PI
    const lng = (λ * 180) / Math.PI

    points.push([lat, lng])
  }

  return points
}

function calculateHaversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  // Apply road factor of 1.3 to approximate actual driving distance
  return R * c * 1.3
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
