/**
 * Dynamic Pricing Engine (Prism Agent)
 * Adjusts prices based on demand, timing, and market conditions
 */

export interface PricingInput {
  basePrice: number
  demandLevel: "low" | "normal" | "high"
  isWeekend: boolean
  daysUntilMove: number
}

export interface PricingResult {
  adjustedPrice: number
  basePrice: number
  demandFactor: number
  weekendSurcharge: number
  urgencyPremium: number
  adjustmentReason: string
}

const DEMAND_FACTORS: Record<string, number> = {
  low: 0.90,
  normal: 1.00,
  high: 1.15,
}

const WEEKEND_SURCHARGE_RATE = 0.10 // 10% surcharge
const URGENCY_THRESHOLD_DAYS = 7
const URGENCY_PREMIUM_RATE = 0.15 // 15% premium for short notice

export function applyDynamicPricing(input: PricingInput): PricingResult {
  const { basePrice, demandLevel, isWeekend, daysUntilMove } = input

  const demandFactor = DEMAND_FACTORS[demandLevel] || 1.0
  const weekendSurcharge = isWeekend ? basePrice * WEEKEND_SURCHARGE_RATE : 0
  const urgencyPremium = daysUntilMove <= URGENCY_THRESHOLD_DAYS
    ? basePrice * URGENCY_PREMIUM_RATE * (1 - daysUntilMove / URGENCY_THRESHOLD_DAYS)
    : 0

  const adjustedPrice = Math.round(basePrice * demandFactor + weekendSurcharge + urgencyPremium)

  const reasons: string[] = []
  if (demandFactor !== 1.0) reasons.push(`${demandLevel} demand (${demandFactor}x)`)
  if (weekendSurcharge > 0) reasons.push(`weekend surcharge (+$${Math.round(weekendSurcharge)})`)
  if (urgencyPremium > 0) reasons.push(`short notice premium (+$${Math.round(urgencyPremium)})`)

  return {
    adjustedPrice,
    basePrice,
    demandFactor,
    weekendSurcharge: Math.round(weekendSurcharge),
    urgencyPremium: Math.round(urgencyPremium),
    adjustmentReason: reasons.length > 0 ? reasons.join(", ") : "Standard pricing",
  }
}
