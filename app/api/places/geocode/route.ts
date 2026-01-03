import { type NextRequest, NextResponse } from "next/server"

// Cache for geocoding results - 30 days TTL
const geocodeCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000

function getCacheKey(address: string): string {
  return address.toLowerCase().trim().replace(/\s+/g, " ")
}

// Melbourne metro area approximate center for biasing
const MELBOURNE_CENTER = { lat: -37.8136, lng: 144.9631 }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address } = body

    if (!address || typeof address !== "string") {
      return NextResponse.json({ error: "Address is required" }, { status: 400 })
    }

    const cacheKey = getCacheKey(address)

    // Check cache first
    const cached = geocodeCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ ...cached.data, source: "cache" })
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY

    if (!apiKey) {
      // Fallback: estimate coordinates based on Australian postcode
      const estimatedCoords = estimateAustralianCoordinates(address)
      if (estimatedCoords) {
        const result = {
          lat: estimatedCoords.lat,
          lng: estimatedCoords.lng,
          formattedAddress: address,
          source: "estimated",
        }
        geocodeCache.set(cacheKey, { data: result, timestamp: Date.now() })
        return NextResponse.json(result)
      }
      return NextResponse.json({ error: "Geocoding unavailable" }, { status: 503 })
    }

    // Try Google Geocoding API
    const geocodeUrl = new URL("https://maps.googleapis.com/maps/api/geocode/json")
    geocodeUrl.searchParams.set("address", address)
    geocodeUrl.searchParams.set("key", apiKey)
    geocodeUrl.searchParams.set("region", "au")
    geocodeUrl.searchParams.set("components", "country:AU")

    const response = await fetch(geocodeUrl.toString())

    if (!response.ok) {
      // Fallback to estimation
      const estimatedCoords = estimateAustralianCoordinates(address)
      if (estimatedCoords) {
        const result = {
          lat: estimatedCoords.lat,
          lng: estimatedCoords.lng,
          formattedAddress: address,
          source: "estimated",
        }
        geocodeCache.set(cacheKey, { data: result, timestamp: Date.now() })
        return NextResponse.json(result)
      }
      return NextResponse.json({ error: "Geocoding failed" }, { status: 500 })
    }

    const data = await response.json()

    if (data.status === "OK" && data.results && data.results.length > 0) {
      const result = {
        lat: data.results[0].geometry.location.lat,
        lng: data.results[0].geometry.location.lng,
        formattedAddress: data.results[0].formatted_address,
        source: "google",
      }
      geocodeCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return NextResponse.json(result)
    }

    // Fallback to estimation if Google returns no results
    const estimatedCoords = estimateAustralianCoordinates(address)
    if (estimatedCoords) {
      const result = {
        lat: estimatedCoords.lat,
        lng: estimatedCoords.lng,
        formattedAddress: address,
        source: "estimated",
      }
      geocodeCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: "Address not found" }, { status: 404 })
  } catch (error) {
    console.error("Geocoding error:", error)
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 })
  }
}

// Estimate coordinates based on Australian postcodes
function estimateAustralianCoordinates(address: string): { lat: number; lng: number } | null {
  // Extract postcode from address
  const postcodeMatch = address.match(/\b(\d{4})\b/)
  if (!postcodeMatch) {
    // Default to Melbourne CBD if no postcode found
    return { lat: -37.8136, lng: 144.9631 }
  }

  const postcode = Number.parseInt(postcodeMatch[1], 10)

  // Victorian postcodes (3000-3999)
  if (postcode >= 3000 && postcode <= 3999) {
    // Melbourne CBD and inner suburbs (3000-3207)
    if (postcode >= 3000 && postcode <= 3207) {
      return { lat: -37.81 + (postcode - 3000) * 0.001, lng: 144.96 + (postcode - 3000) * 0.0005 }
    }
    // Eastern suburbs (3100-3199)
    if (postcode >= 3100 && postcode <= 3199) {
      return { lat: -37.82 + (postcode - 3100) * 0.002, lng: 145.1 + (postcode - 3100) * 0.002 }
    }
    // South eastern suburbs (3150-3220)
    if (postcode >= 3150 && postcode <= 3220) {
      return { lat: -37.9 + (postcode - 3150) * 0.002, lng: 145.15 + (postcode - 3150) * 0.002 }
    }
    // Northern suburbs (3040-3099)
    if (postcode >= 3040 && postcode <= 3099) {
      return { lat: -37.7 - (postcode - 3040) * 0.002, lng: 144.95 + (postcode - 3040) * 0.001 }
    }
    // Western suburbs (3000-3039)
    if (postcode >= 3010 && postcode <= 3039) {
      return { lat: -37.8, lng: 144.85 - (postcode - 3010) * 0.002 }
    }
    // Regional Victoria (3200-3999)
    if (postcode >= 3200 && postcode <= 3400) {
      // Gippsland direction
      return { lat: -38.0 - (postcode - 3200) * 0.003, lng: 145.5 + (postcode - 3200) * 0.01 }
    }
    if (postcode >= 3400 && postcode <= 3599) {
      // North/Northwest Victoria
      return { lat: -36.5 + (postcode - 3400) * 0.002, lng: 144.0 + (postcode - 3400) * 0.005 }
    }
    if (postcode >= 3600 && postcode <= 3799) {
      // Northeast Victoria
      return { lat: -36.5, lng: 146.0 + (postcode - 3600) * 0.005 }
    }
    if (postcode >= 3800 && postcode <= 3999) {
      // Far east Gippsland
      return { lat: -37.5, lng: 147.0 + (postcode - 3800) * 0.005 }
    }
    // Default Victorian location
    return { lat: -37.5, lng: 145.0 }
  }

  // South Australian postcodes (5000-5999)
  if (postcode >= 5000 && postcode <= 5999) {
    // Adelaide area
    if (postcode >= 5000 && postcode <= 5200) {
      return { lat: -34.93 + (postcode - 5000) * 0.001, lng: 138.6 + (postcode - 5000) * 0.001 }
    }
    return { lat: -34.9, lng: 138.6 }
  }

  // NSW postcodes (2000-2999)
  if (postcode >= 2000 && postcode <= 2999) {
    // Sydney area
    if (postcode >= 2000 && postcode <= 2200) {
      return { lat: -33.87 + (postcode - 2000) * 0.001, lng: 151.21 + (postcode - 2000) * 0.001 }
    }
    return { lat: -33.87, lng: 151.21 }
  }

  // Queensland postcodes (4000-4999)
  if (postcode >= 4000 && postcode <= 4999) {
    // Brisbane area
    if (postcode >= 4000 && postcode <= 4200) {
      return { lat: -27.47 + (postcode - 4000) * 0.001, lng: 153.03 + (postcode - 4000) * 0.001 }
    }
    return { lat: -27.47, lng: 153.03 }
  }

  // Default to Melbourne if postcode not recognized
  return { lat: -37.8136, lng: 144.9631 }
}
