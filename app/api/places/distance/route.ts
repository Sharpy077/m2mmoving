import { type NextRequest, NextResponse } from "next/server"

// OSRM is free and doesn't require rate limiting for reasonable usage

const distanceCache = new Map<string, { data: DistanceResponse; timestamp: number }>()
const CACHE_TTL = 365 * 24 * 60 * 60 * 1000 // 365 days (coordinates don't change)
const MAX_CACHE_SIZE = 1000

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
  cached?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body: DistanceRequest = await request.json()
    const { originLat, originLng, destinationLat, destinationLng, originAddress, destinationAddress } = body

    if (!originLat || !originLng || !destinationLat || !destinationLng) {
      return NextResponse.json({ error: "Missing coordinates" }, { status: 400 })
    }

    // Cache key with 3 decimal places (~111m precision)
    const cacheKey = `${originLat.toFixed(3)},${originLng.toFixed(3)}-${destinationLat.toFixed(3)},${destinationLng.toFixed(3)}`

    const cached = distanceCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ ...cached.data, cached: true })
    }

    let result: DistanceResponse | null = null

    // Try OSRM first (free, accurate road routing, no API key needed)
    try {
      const osrmResult = await fetchOSRMRoute(originLat, originLng, destinationLat, destinationLng)
      if (osrmResult) {
        result = {
          ...osrmResult,
          origin: originAddress || `${originLat},${originLng}`,
          destination: destinationAddress || `${destinationLat},${destinationLng}`,
          source: "osrm",
        }
      }
    } catch (e) {
      console.log("[OSRM] Failed, using haversine fallback:", e)
    }

    // Fallback to haversine calculation
    if (!result) {
      result = calculateHaversineResult(
        originLat,
        originLng,
        destinationLat,
        destinationLng,
        originAddress,
        destinationAddress,
      )
    }

    // Cache the result
    if (distanceCache.size >= MAX_CACHE_SIZE) {
      const keysToRemove = Array.from(distanceCache.keys()).slice(0, 100)
      keysToRemove.forEach((key) => distanceCache.delete(key))
    }
    distanceCache.set(cacheKey, { data: result, timestamp: Date.now() })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[Distance] Calculation error:", error)
    return NextResponse.json({ error: "Failed to calculate distance" }, { status: 500 })
  }
}

async function fetchOSRMRoute(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): Promise<Omit<DistanceResponse, "origin" | "destination" | "source"> | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "M&M-Commercial-Moving/1.0",
      },
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      return null
    }

    const route = data.routes[0]
    const distanceKm = route.distance / 1000
    const durationMinutes = Math.round(route.duration / 60)

    // Convert GeoJSON [lng, lat] to [lat, lng] for Leaflet
    const routeGeometry = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]])

    return {
      distanceKm: Math.round(distanceKm * 10) / 10,
      distanceText: formatDistance(distanceKm),
      durationMinutes,
      durationText: formatDuration(durationMinutes),
      routeGeometry,
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.log("[OSRM] Request timed out")
    }
    return null
  }
}

function calculateHaversineResult(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  originAddress?: string,
  destinationAddress?: string,
): DistanceResponse {
  const straightLineKm = calculateHaversineDistance(lat1, lng1, lat2, lng2)

  // Apply road factor based on distance (roads aren't straight lines)
  // Short urban routes have more turns, long highway routes are more direct
  let roadFactor: number
  let avgSpeedKmh: number

  if (straightLineKm < 20) {
    roadFactor = 1.4 // Urban - many turns
    avgSpeedKmh = 35 // Traffic, lights
  } else if (straightLineKm < 100) {
    roadFactor = 1.35 // Suburban mix
    avgSpeedKmh = 50
  } else {
    roadFactor = 1.25 // Highway - more direct
    avgSpeedKmh = 80
  }

  const roadDistanceKm = straightLineKm * roadFactor
  const durationMinutes = Math.round((roadDistanceKm / avgSpeedKmh) * 60)
  const routeGeometry = generateCurvedRoute(lat1, lng1, lat2, lng2)

  return {
    distanceKm: Math.round(roadDistanceKm * 10) / 10,
    distanceText: formatDistance(roadDistanceKm),
    durationMinutes,
    durationText: formatDuration(durationMinutes),
    routeGeometry,
    origin: originAddress || `${lat1},${lng1}`,
    destination: destinationAddress || `${lat2},${lng2}`,
    source: "calculated",
  }
}

function calculateHaversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Returns straight-line distance in km
}

function generateCurvedRoute(lat1: number, lng1: number, lat2: number, lng2: number): number[][] {
  const points: number[][] = []
  const numPoints = 20

  const φ1 = (lat1 * Math.PI) / 180
  const λ1 = (lng1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const λ2 = (lng2 * Math.PI) / 180

  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.pow(Math.sin((φ2 - φ1) / 2), 2) + Math.cos(φ1) * Math.cos(φ2) * Math.pow(Math.sin((λ2 - λ1) / 2), 2),
      ),
    )

  if (d < 0.0001) {
    return [
      [lat1, lng1],
      [lat2, lng2],
    ]
  }

  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints
    const A = Math.sin((1 - f) * d) / Math.sin(d)
    const B = Math.sin(f * d) / Math.sin(d)

    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2)
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2)
    const z = A * Math.sin(φ1) + B * Math.sin(φ2)

    const φ = Math.atan2(z, Math.sqrt(x * x + y * y))
    const λ = Math.atan2(y, x)

    points.push([(φ * 180) / Math.PI, (λ * 180) / Math.PI])
  }

  return points
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${Math.round(km)} km`
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours} hr${hours > 1 ? "s" : ""}`
  return `${hours} hr ${mins} min`
}
