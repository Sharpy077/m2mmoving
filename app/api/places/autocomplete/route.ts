import { type NextRequest, NextResponse } from "next/server"
import { checkApiSecurity } from "@/lib/api-security"

// Rate limiting: Nominatim ToS requires max 1 request/second
// We implement server-side rate limiting + aggressive caching

const autocompleteCache = new Map<string, { data: unknown; timestamp: number }>()
const AUTOCOMPLETE_CACHE_TTL = 30 * 24 * 60 * 60 * 1000 // 30 days
const MAX_AUTOCOMPLETE_CACHE = 500

// Rate limiter for Nominatim (1 request per second globally)
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

async function fetchFromNominatim(input: string): Promise<{ predictions: any[]; status: string }> {
  try {
    // Respect rate limit
    await waitForRateLimit()

    const url = new URL("https://nominatim.openstreetmap.org/search")
    url.searchParams.set("q", input)
    url.searchParams.set("format", "json")
    url.searchParams.set("addressdetails", "1")
    url.searchParams.set("countrycodes", "au")
    url.searchParams.set("limit", "5")

    const response = await fetch(url.toString(), {
      headers: {
        // Nominatim ToS requires valid User-Agent with contact info
        "User-Agent": "M&M-Commercial-Moving/1.0 (https://m2mmoving.au; contact@m2mmoving.au)",
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      console.error("[Nominatim] API error:", response.status)
      return { predictions: [], status: "NOMINATIM_ERROR" }
    }

    const data = await response.json()

    if (!Array.isArray(data) || data.length === 0) {
      return { predictions: [], status: "ZERO_RESULTS" }
    }

    const predictions = data.map((place: any) => {
      const mainText =
        place.address?.road || place.address?.suburb || place.address?.city || place.display_name.split(",")[0] || ""

      const secondaryParts = []
      if (place.address?.suburb && place.address?.suburb !== mainText) secondaryParts.push(place.address.suburb)
      if (place.address?.city && place.address?.city !== mainText) secondaryParts.push(place.address.city)
      if (place.address?.state) secondaryParts.push(place.address.state)
      if (place.address?.postcode) secondaryParts.push(place.address.postcode)

      return {
        description: place.display_name,
        place_id: `nominatim_${place.place_id}`,
        structured_formatting: {
          main_text: mainText,
          secondary_text: secondaryParts.join(", "),
        },
        // Embed coordinates directly to avoid second API call
        _nominatim: {
          lat: Number.parseFloat(place.lat),
          lng: Number.parseFloat(place.lon),
          address: place.address,
          displayName: place.display_name,
        },
      }
    })

    return { predictions, status: "OK" }
  } catch (error) {
    console.error("[Nominatim] Fetch error:", error)
    return { predictions: [], status: "NOMINATIM_ERROR" }
  }
}

export async function GET(request: NextRequest) {
  // Rate limit per client: 60 requests per minute (more lenient than Nominatim's 1/sec because we cache)
  const security = await checkApiSecurity(request, {
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    validateOrigin: true,
  })

  if (!security.allowed) {
    return security.response
  }

  const searchParams = request.nextUrl.searchParams
  const input = searchParams.get("input")

  if (!input) {
    return NextResponse.json({ error: "Input is required" }, { status: 400 })
  }

  // Normalize cache key
  const cacheKey = input.toLowerCase().trim().replace(/\s+/g, " ")

  // Check cache first (this is how we avoid excessive Nominatim calls)
  const cached = autocompleteCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < AUTOCOMPLETE_CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  // Fetch from Nominatim
  const result = await fetchFromNominatim(input)

  // Cache successful results
  if (result.predictions.length > 0) {
    // Prune cache if too large
    if (autocompleteCache.size >= MAX_AUTOCOMPLETE_CACHE) {
      const keysToRemove = Array.from(autocompleteCache.keys()).slice(0, 50)
      keysToRemove.forEach((key) => autocompleteCache.delete(key))
    }
    autocompleteCache.set(cacheKey, { data: result, timestamp: Date.now() })
  }

  return NextResponse.json(result)
}
