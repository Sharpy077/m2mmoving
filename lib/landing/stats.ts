export interface MarketingStat {
  value: string
  label: string
  highlight: boolean
}

const FIRST_RELOCATION_DATE = new Date("2025-08-26")
const SECOND_RELOCATION_DATE = new Date("2025-11-12")

export function calculateRelocations(now: Date = new Date()): number {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    return 1
  }

  if (now < FIRST_RELOCATION_DATE) {
    return 0
  }

  if (now < SECOND_RELOCATION_DATE) {
    return 1
  }

  return 2
}

export function buildMarketingStats(relocations: number): MarketingStat[] {
  const safeRelocations = Math.max(relocations, 0)
  return [
    { value: safeRelocations.toString(), label: "Relocations Complete", highlight: false },
    { value: "$0", label: "Damage Claims", highlight: true },
    { value: "48hrs", label: "Avg. Project Time", highlight: false },
    { value: "100%", label: "Client Satisfaction", highlight: true },
  ]
}
