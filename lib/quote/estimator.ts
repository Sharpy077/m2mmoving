import { additionalServices, moveTypes } from "./config"

export interface EstimateInput {
  moveTypeId: string
  squareMeters: number
  distanceKm?: number | string | null
  selectedServices?: string[]
}

export interface EstimateBreakdownItem {
  label: string
  amount: number
}

export interface EstimateResult {
  total: number
  deposit: number
  effectiveSquareMeters: number
  breakdown: EstimateBreakdownItem[]
}

export function sanitizeDistance(value?: number | string | null): number {
  if (value === undefined || value === null) {
    return 0
  }

  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : value
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0
  }

  // Cap extremely large values to prevent overflow and unrealistic quotes
  return Math.min(parsed, 1000)
}

export function calculateQuoteEstimate(params: EstimateInput): EstimateResult | null {
  const { moveTypeId, squareMeters, distanceKm, selectedServices = [] } = params
  const moveType = moveTypes.find((type) => type.id === moveTypeId)

  if (!moveType || !Number.isFinite(squareMeters) || squareMeters <= 0) {
    return null
  }

  const effectiveSquareMeters = Math.max(squareMeters, moveType.minSqm)
  const distance = sanitizeDistance(distanceKm)

  let total = moveType.baseRate + moveType.perSqm * effectiveSquareMeters
  const breakdown: EstimateBreakdownItem[] = [
    { label: `${moveType.name} base`, amount: moveType.baseRate },
    { label: `Space (${effectiveSquareMeters} sqm @ $${moveType.perSqm}/sqm)`, amount: moveType.perSqm * effectiveSquareMeters },
  ]

  if (distance > 0) {
    const distanceCost = distance * 8
    total += distanceCost
    breakdown.push({ label: `Distance (${distance}km @ $8/km)`, amount: distanceCost })
  }

  selectedServices.forEach((serviceId) => {
    const service = additionalServices.find((option) => option.id === serviceId)
    if (service) {
      total += service.price
      breakdown.push({ label: service.name, amount: service.price })
    }
  })

  const roundedTotal = Math.round(total)
  const deposit = Math.round(roundedTotal * 0.5)

  return {
    total: roundedTotal,
    deposit,
    effectiveSquareMeters,
    breakdown,
  }
}
