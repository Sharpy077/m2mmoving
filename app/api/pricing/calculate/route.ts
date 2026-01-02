import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface PricingRequest {
  distanceKm: number
  squareMeters?: number
  floorLevels?: { origin: number; destination: number }
  hasStairs?: boolean
  stairsFlights?: number
  specialItems?: {
    piano?: boolean
    poolTable?: boolean
    heavyItems?: number
  }
  packingHours?: number
  moveDate?: string // ISO date string
  isWeekend?: boolean
  isPublicHoliday?: boolean
  isAfterHours?: boolean
}

interface PricingResponse {
  baseFee: number
  distanceFee: number
  sizeFee: number
  stairsFee: number
  specialItemsFee: number
  packingFee: number
  timeMultiplier: number
  subtotal: number
  total: number
  depositAmount: number
  breakdown: {
    label: string
    amount: number
    description?: string
  }[]
  config: {
    name: string
    baseDistanceKm: number
    perKmRate: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: PricingRequest = await request.json()
    const {
      distanceKm,
      squareMeters = 0,
      stairsFlights = 0,
      specialItems = {},
      packingHours = 0,
      isWeekend = false,
      isPublicHoliday = false,
      isAfterHours = false,
    } = body

    // Fetch active pricing config from database
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: configData, error } = await supabase
      .from("pricing_config")
      .select("*")
      .eq("is_active", true)
      .order("effective_from", { ascending: false })
      .limit(1)
      .single()

    if (error || !configData) {
      console.error("[v0] Error fetching pricing config:", error)
      // Use default pricing if no config found
      return calculateWithDefaults(body)
    }

    const config = configData

    // Calculate each component
    const breakdown: { label: string; amount: number; description?: string }[] = []

    // 1. Base fee
    const baseFee = Number(config.base_fee)
    breakdown.push({
      label: "Base Service Fee",
      amount: baseFee,
      description: `Includes first ${config.base_distance_km}km`,
    })

    // 2. Distance fee (only for distance beyond base)
    let distanceFee = 0
    const extraDistance = Math.max(0, distanceKm - Number(config.base_distance_km))
    if (extraDistance > 0) {
      const isLongDistance = distanceKm > Number(config.long_distance_threshold_km || 100)
      const rate = isLongDistance
        ? Number(config.per_km_rate_long_distance || config.per_km_rate)
        : Number(config.per_km_rate)
      distanceFee = extraDistance * rate
      breakdown.push({
        label: "Distance Fee",
        amount: distanceFee,
        description: `${Math.round(extraDistance)}km @ $${rate}/km`,
      })
    }

    // 3. Size-based fee
    let sizeFee = 0
    if (squareMeters > 0 && config.per_sqm_rate) {
      sizeFee = squareMeters * Number(config.per_sqm_rate)
      breakdown.push({
        label: "Size Fee",
        amount: sizeFee,
        description: `${squareMeters}sqm @ $${config.per_sqm_rate}/sqm`,
      })
    }

    // 4. Stairs fee
    let stairsFee = 0
    if (stairsFlights > 0 && config.stairs_per_flight) {
      stairsFee = stairsFlights * Number(config.stairs_per_flight)
      breakdown.push({
        label: "Stairs Fee",
        amount: stairsFee,
        description: `${stairsFlights} flight(s) @ $${config.stairs_per_flight}/flight`,
      })
    }

    // 5. Special items fee
    let specialItemsFee = 0
    if (specialItems.piano && config.piano_fee) {
      specialItemsFee += Number(config.piano_fee)
      breakdown.push({
        label: "Piano Moving",
        amount: Number(config.piano_fee),
      })
    }
    if (specialItems.poolTable && config.pool_table_fee) {
      specialItemsFee += Number(config.pool_table_fee)
      breakdown.push({
        label: "Pool Table Moving",
        amount: Number(config.pool_table_fee),
      })
    }
    if (specialItems.heavyItems && config.heavy_item_fee) {
      const heavyFee = specialItems.heavyItems * Number(config.heavy_item_fee)
      specialItemsFee += heavyFee
      breakdown.push({
        label: "Heavy Items",
        amount: heavyFee,
        description: `${specialItems.heavyItems} item(s) @ $${config.heavy_item_fee}/item`,
      })
    }

    // 6. Packing fee
    let packingFee = 0
    if (packingHours > 0 && config.packing_per_hour) {
      packingFee = packingHours * Number(config.packing_per_hour)
      breakdown.push({
        label: "Packing Service",
        amount: packingFee,
        description: `${packingHours} hour(s) @ $${config.packing_per_hour}/hr`,
      })
    }

    // 7. Calculate subtotal before multipliers
    const subtotal = baseFee + distanceFee + sizeFee + stairsFee + specialItemsFee + packingFee

    // 8. Time-based multiplier
    let timeMultiplier = 1.0
    let multiplierLabel = ""
    if (isPublicHoliday && config.public_holiday_multiplier) {
      timeMultiplier = Number(config.public_holiday_multiplier)
      multiplierLabel = "Public Holiday"
    } else if (isWeekend && config.weekend_multiplier) {
      timeMultiplier = Number(config.weekend_multiplier)
      multiplierLabel = "Weekend"
    } else if (isAfterHours && config.after_hours_multiplier) {
      timeMultiplier = Number(config.after_hours_multiplier)
      multiplierLabel = "After Hours"
    }

    if (timeMultiplier > 1.0) {
      breakdown.push({
        label: `${multiplierLabel} Rate`,
        amount: subtotal * (timeMultiplier - 1),
        description: `${Math.round((timeMultiplier - 1) * 100)}% surcharge`,
      })
    }

    // 9. Calculate total
    let total = subtotal * timeMultiplier

    // 10. Apply minimum charge
    const minimumCharge = Number(config.minimum_charge)
    if (total < minimumCharge) {
      total = minimumCharge
      breakdown.push({
        label: "Minimum Charge Applied",
        amount: minimumCharge - subtotal * timeMultiplier,
        description: `Minimum charge: $${minimumCharge}`,
      })
    }

    // 11. Calculate deposit
    const depositAmount = Math.round(total * (Number(config.deposit_percentage) / 100) * 100) / 100

    const response: PricingResponse = {
      baseFee,
      distanceFee,
      sizeFee,
      stairsFee,
      specialItemsFee,
      packingFee,
      timeMultiplier,
      subtotal,
      total: Math.round(total * 100) / 100,
      depositAmount,
      breakdown,
      config: {
        name: config.name,
        baseDistanceKm: Number(config.base_distance_km),
        perKmRate: Number(config.per_km_rate),
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] Pricing calculation error:", error)
    return NextResponse.json({ error: "Failed to calculate pricing" }, { status: 500 })
  }
}

// Fallback function with default values
function calculateWithDefaults(body: PricingRequest) {
  const { distanceKm, squareMeters = 0, stairsFlights = 0, isWeekend = false } = body

  const baseFee = 150
  const baseDistanceKm = 20
  const perKmRate = 3.5
  const minimumCharge = 250

  const extraDistance = Math.max(0, distanceKm - baseDistanceKm)
  const distanceFee = extraDistance * perKmRate
  const sizeFee = squareMeters * 5
  const stairsFee = stairsFlights * 50

  const subtotal = baseFee + distanceFee + sizeFee + stairsFee
  const timeMultiplier = isWeekend ? 1.15 : 1.0
  let total = subtotal * timeMultiplier

  if (total < minimumCharge) {
    total = minimumCharge
  }

  const depositAmount = Math.round(total * 0.2 * 100) / 100

  return NextResponse.json({
    baseFee,
    distanceFee,
    sizeFee,
    stairsFee,
    specialItemsFee: 0,
    packingFee: 0,
    timeMultiplier,
    subtotal,
    total: Math.round(total * 100) / 100,
    depositAmount,
    breakdown: [
      { label: "Base Service Fee", amount: baseFee, description: `Includes first ${baseDistanceKm}km` },
      ...(distanceFee > 0
        ? [
            {
              label: "Distance Fee",
              amount: distanceFee,
              description: `${Math.round(extraDistance)}km @ $${perKmRate}/km`,
            },
          ]
        : []),
      ...(sizeFee > 0 ? [{ label: "Size Fee", amount: sizeFee }] : []),
      ...(stairsFee > 0 ? [{ label: "Stairs Fee", amount: stairsFee }] : []),
    ],
    config: {
      name: "default",
      baseDistanceKm,
      perKmRate,
    },
  })
}
