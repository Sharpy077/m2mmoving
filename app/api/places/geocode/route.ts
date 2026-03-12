import { type NextRequest, NextResponse } from "next/server"

// Rate limiting: Nominatim ToS requires max 1 request/second

const geocodeCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000 // 30 days
const MAX_CACHE_SIZE = 500

let lastNominatimRequest = 0
const NOMINATIM_MIN_INTERVAL = 1100 // 1.1 seconds to be safe

async function waitForRateLimit(): Promise<void> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastNominatimRequest
  if (timeSinceLastRequest < NOMINATIM_MIN_INTERVAL) {
    await new Promise((resolve) => setTimeout(resolve, NOMINATIM_MIN_INTERVAL - timeSinceLastRequest))
  }
  lastNominatimRequest = Date.now()
}

function getCacheKey(address: string): string {
  return address.toLowerCase().trim().replace(/\s+/g, " ")
}

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
      return NextResponse.json({ ...cached.data, cached: true })
    }

    // Try Nominatim geocoding
    try {
      await waitForRateLimit()

      const url = new URL("https://nominatim.openstreetmap.org/search")
      url.searchParams.set("q", address)
      url.searchParams.set("format", "json")
      url.searchParams.set("addressdetails", "1")
      url.searchParams.set("countrycodes", "au")
      url.searchParams.set("limit", "1")

      const response = await fetch(url.toString(), {
        headers: {
          "User-Agent": "M&M-Commercial-Moving/1.0 (https://m2mmoving.au; contact@m2mmoving.au)",
          Accept: "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()

        if (Array.isArray(data) && data.length > 0) {
          const result = {
            lat: Number.parseFloat(data[0].lat),
            lng: Number.parseFloat(data[0].lon),
            formattedAddress: data[0].display_name,
            source: "nominatim",
            accuracy: "high",
          }

          // Cache the result
          if (geocodeCache.size >= MAX_CACHE_SIZE) {
            const keysToRemove = Array.from(geocodeCache.keys()).slice(0, 50)
            keysToRemove.forEach((key) => geocodeCache.delete(key))
          }
          geocodeCache.set(cacheKey, { data: result, timestamp: Date.now() })

          return NextResponse.json(result)
        }
      }
    } catch (error) {
      console.error("[Nominatim] Geocode error:", error)
    }

    // Fallback to Australian coordinate estimation
    const estimatedCoords = estimateAustralianCoordinates(address)
    if (estimatedCoords) {
      const result = {
        lat: estimatedCoords.lat,
        lng: estimatedCoords.lng,
        formattedAddress: address,
        source: "estimated",
        accuracy: "low",
      }
      geocodeCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: "Address not found" }, { status: 404 })
  } catch (error) {
    console.error("[Geocode] Error:", error)
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 })
  }
}

function estimateAustralianCoordinates(address: string): { lat: number; lng: number } | null {
  const lowerAddress = address.toLowerCase()

  // Known Australian locations for fallback estimation
  const knownLocations: Record<string, { lat: number; lng: number }> = {
    // Victoria
    melbourne: { lat: -37.8136, lng: 144.9631 },
    geelong: { lat: -38.1499, lng: 144.3617 },
    ballarat: { lat: -37.5622, lng: 143.8503 },
    bendigo: { lat: -36.757, lng: 144.2794 },
    mildura: { lat: -34.1855, lng: 142.1625 },
    shepparton: { lat: -36.3833, lng: 145.4 },
    warrnambool: { lat: -38.3818, lng: 142.4831 },
    traralgon: { lat: -38.1953, lng: 146.5413 },
    nunawading: { lat: -37.8167, lng: 145.175 },
    "box hill": { lat: -37.8189, lng: 145.1231 },
    richmond: { lat: -37.8183, lng: 145.0119 },
    dandenong: { lat: -37.9875, lng: 145.2153 },
    frankston: { lat: -38.1425, lng: 145.1228 },

    // South Australia
    adelaide: { lat: -34.9285, lng: 138.6007 },
    "mount gambier": { lat: -37.8284, lng: 140.7804 },
    millicent: { lat: -37.5944, lng: 140.3503 },
    "port augusta": { lat: -32.4936, lng: 137.7831 },
    whyalla: { lat: -33.0258, lng: 137.5246 },

    // NSW
    sydney: { lat: -33.8688, lng: 151.2093 },
    newcastle: { lat: -32.9283, lng: 151.7817 },
    wollongong: { lat: -34.4278, lng: 150.8931 },
    albury: { lat: -36.0737, lng: 146.9135 },

    // Queensland
    brisbane: { lat: -27.4698, lng: 153.0251 },
    "gold coast": { lat: -28.0167, lng: 153.4 },
    cairns: { lat: -16.9186, lng: 145.7781 },
    townsville: { lat: -19.259, lng: 146.8169 },

    // WA
    perth: { lat: -31.9505, lng: 115.8605 },
    fremantle: { lat: -32.0569, lng: 115.7439 },

    // Tasmania
    hobart: { lat: -42.8821, lng: 147.3272 },
    launceston: { lat: -41.4332, lng: 147.1441 },

    // NT
    darwin: { lat: -12.4634, lng: 130.8456 },
    "alice springs": { lat: -23.698, lng: 133.8807 },

    // ACT
    canberra: { lat: -35.2809, lng: 149.13 },
  }

  // Check for known location names
  for (const [location, coords] of Object.entries(knownLocations)) {
    if (lowerAddress.includes(location)) {
      return coords
    }
  }

  // Extract postcode and estimate from that
  const postcodeMatch = address.match(/\b(\d{4})\b/)
  if (postcodeMatch) {
    const postcode = Number.parseInt(postcodeMatch[1], 10)
    return estimateFromPostcode(postcode)
  }

  // Default to Melbourne CBD
  return { lat: -37.8136, lng: 144.9631 }
}

function estimateFromPostcode(postcode: number): { lat: number; lng: number } {
  // Victorian postcodes (3000-3999)
  if (postcode >= 3000 && postcode <= 3999) {
    if (postcode <= 3207) return { lat: -37.81, lng: 144.96 }
    if (postcode <= 3400) return { lat: -37.9, lng: 145.2 }
    if (postcode <= 3600) return { lat: -36.8, lng: 144.3 }
    return { lat: -37.5, lng: 146.0 }
  }

  // SA postcodes (5000-5999)
  if (postcode >= 5000 && postcode <= 5999) {
    if (postcode >= 5280 && postcode <= 5320) return { lat: -37.7, lng: 140.6 } // Southeast SA
    return { lat: -34.93, lng: 138.6 }
  }

  // NSW postcodes (2000-2999)
  if (postcode >= 2000 && postcode <= 2999) {
    return { lat: -33.87, lng: 151.21 }
  }

  // QLD postcodes (4000-4999)
  if (postcode >= 4000 && postcode <= 4999) {
    return { lat: -27.47, lng: 153.03 }
  }

  // WA postcodes (6000-6999)
  if (postcode >= 6000 && postcode <= 6999) {
    return { lat: -31.95, lng: 115.86 }
  }

  // TAS postcodes (7000-7999)
  if (postcode >= 7000 && postcode <= 7999) {
    return { lat: -42.88, lng: 147.33 }
  }

  // NT postcodes (0800-0899)
  if (postcode >= 800 && postcode <= 899) {
    return { lat: -12.46, lng: 130.85 }
  }

  // ACT postcodes (2600-2639)
  if (postcode >= 2600 && postcode <= 2639) {
    return { lat: -35.28, lng: 149.13 }
  }

  // Default to Melbourne
  return { lat: -37.8136, lng: 144.9631 }
}
