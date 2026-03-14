export interface CommissionTier {
  label: string
  rate: number
  min_jobs: number
  max_jobs: number | null
}

const TIERS: CommissionTier[] = [
  { label: 'Standard', rate: 0.15, min_jobs: 0, max_jobs: 10 },
  { label: 'Growth', rate: 0.12, min_jobs: 11, max_jobs: 25 },
  { label: 'Pro', rate: 0.10, min_jobs: 26, max_jobs: null },
]

export function getCommissionTier(jobsPerMonth: number): CommissionTier {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (jobsPerMonth >= TIERS[i].min_jobs) {
      return TIERS[i]
    }
  }
  return TIERS[0]
}

export interface PayoutRecord {
  provider_payout: number
  status: string
}

export interface EarningsSummary {
  total_released: number
  total_pending: number
  total_earned: number
  jobs_completed: number
  jobs_pending_payment: number
}

export function calculateProviderEarnings(payouts: PayoutRecord[]): EarningsSummary {
  let total_released = 0
  let total_pending = 0
  let jobs_completed = 0
  let jobs_pending_payment = 0

  for (const p of payouts) {
    if (p.status === 'released') {
      total_released += p.provider_payout
      jobs_completed++
    } else if (p.status === 'pending') {
      total_pending += p.provider_payout
      jobs_pending_payment++
    }
  }

  return {
    total_released: Math.round(total_released * 100) / 100,
    total_pending: Math.round(total_pending * 100) / 100,
    total_earned: Math.round((total_released + total_pending) * 100) / 100,
    jobs_completed,
    jobs_pending_payment,
  }
}

export interface SimulationInput {
  jobs_per_month: number
  avg_job_value: number
}

export interface SimulationResult {
  gross_revenue: number
  commission_rate: number
  platform_fee: number
  take_home: number
  tier: CommissionTier
}

export function calculateEarningsSimulation(input: SimulationInput): SimulationResult {
  const { jobs_per_month, avg_job_value } = input
  const tier = getCommissionTier(jobs_per_month)
  const gross_revenue = Math.round(jobs_per_month * avg_job_value * 100) / 100
  const platform_fee = Math.round(gross_revenue * tier.rate * 100) / 100
  const take_home = Math.round((gross_revenue - platform_fee) * 100) / 100

  return {
    gross_revenue,
    commission_rate: tier.rate,
    platform_fee,
    take_home,
    tier,
  }
}
