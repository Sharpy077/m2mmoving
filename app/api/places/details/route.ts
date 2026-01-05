import { type NextRequest, NextResponse } from "next/server"
import { checkApiSecurity } from "@/lib/api-security"

// Google Places Details API (New) proxy with Nominatim fallback
export async function GET(request: NextRequest) {
  const security = await checkApiSecurity(request, {
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    validateOrigin: true,
  })

  if (!security.allowed) {
    return security.response
  }

  const searchParams = request.nextUrl.searchParams
  const placeId = searchParams.get("placeId")
  const nominatimData = searchParams.get("nominatimData")

  if (!placeId) {
    return NextResponse.json({ error: "Place ID is required" }, { status: 400 })
  }

  // Handle Nominatim place IDs (all our IDs are now Nominatim)
  if (placeId.startsWith("nominatim_")) {
    // If nominatimData was passed from autocomplete, use it directly (no extra API call needed)
    if (nominatimData) {
      try {
        const data = JSON.parse(nominatimData)
        return NextResponse.json({
          result: {
            formatted_address: data.displayName || data.description || "",
            geometry: {
              location: {
                lat: data.lat,
                lng: data.lng,
              },
            },
            address_components: buildAddressComponents(data.address || {}),
          },
          status: "OK",
        })
      } catch (e) {
        console.error("[Nominatim] Failed to parse nominatimData:", e)
      }
    }

    // Fallback: fetch details from Nominatim using the OSM ID
    const osmId = placeId.replace("nominatim_", "")
    try {
      await waitForRateLimit()

      const url = new URL("https://nominatim.openstreetmap.org/details")
      url.searchParams.set("place_id", osmId)
      url.searchParams.set("format", "json")
      url.searchParams.set("addressdetails", "1")

      const response = await fetch(url.toString(), {
        headers: {
          "User-Agent": "M&M-Commercial-Moving/1.0 (https://m2mmoving.au; contact@m2mmoving.au)",
          Accept: "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        return NextResponse.json({
          result: {
            formatted_address: data.localname || data.names?.name || "",
            geometry: {
              location: {
                lat: Number.parseFloat(data.centroid?.coordinates?.[1] || data.lat || 0),
                lng: Number.parseFloat(data.centroid?.coordinates?.[0] || data.lon || 0),
              },
            },
            address_components: buildAddressComponents(data.address || {}),
          },
          status: "OK",
        })
      }
    } catch (error) {
      console.error("[Nominatim] Details fetch error:", error)
    }

    return NextResponse.json({ error: "Failed to fetch place details", status: "NOMINATIM_ERROR" }, { status: 500 })
  }

  // Non-Nominatim place IDs are not supported anymore
  return NextResponse.json(
    { error: "Invalid place ID format. Only Nominatim IDs are supported.", status: "INVALID_ID" },
    { status: 400 },
  )
}

function buildAddressComponents(address: Record<string, string>) {
  const components: Array<{ long_name: string; short_name: string; types: string[] }> = []

  if (address.house_number) {
    components.push({ long_name: address.house_number, short_name: address.house_number, types: ["street_number"] })
  }
  if (address.road) {
    components.push({ long_name: address.road, short_name: address.road, types: ["route"] })
  }
  if (address.suburb) {
    components.push({ long_name: address.suburb, short_name: address.suburb, types: ["locality", "political"] })
  }
  if (address.city || address.town || address.village) {
    const city = address.city || address.town || address.village
    components.push({ long_name: city, short_name: city, types: ["administrative_area_level_2", "political"] })
  }
  if (address.state) {
    const stateAbbr = getAustralianStateAbbr(address.state)
    components.push({
      long_name: address.state,
      short_name: stateAbbr,
      types: ["administrative_area_level_1", "political"],
    })
  }
  if (address.postcode) {
    components.push({ long_name: address.postcode, short_name: address.postcode, types: ["postal_code"] })
  }
  if (address.country) {
    components.push({
      long_name: address.country,
      short_name: address.country_code?.toUpperCase() || "AU",
      types: ["country", "political"],
    })
  }

  return components
}

function getAustralianStateAbbr(state: string): string {
  const stateMap: Record<string, string> = {
    Victoria: "VIC",
    "New South Wales": "NSW",
    Queensland: "QLD",
    "South Australia": "SA",
    "Western Australia": "WA",
    Tasmania: "TAS",
    "Northern Territory": "NT",
    "Australian Capital Territory": "ACT",
  }
  return stateMap[state] || state
}

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
