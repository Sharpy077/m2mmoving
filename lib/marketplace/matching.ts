/**
 * Marketplace Matching Logic
 * Determines how jobs are matched to providers and scores provider eligibility
 */

import type { JobType, MatchingMode, ScoredProvider, JobMatchContext } from './types'

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

/** Job types that always require open bidding regardless of size */
const ALWAYS_BIDDING_TYPES: JobType[] = ['datacenter', 'industrial']

/** Square meter threshold above which jobs switch to bidding mode */
const BIDDING_SQM_THRESHOLD = 200

/** Minimum score (0-1) required for instant auto-assignment */
export const INSTANT_ASSIGN_THRESHOLD = 0.75

// ─────────────────────────────────────────────
// Matching Mode Determination
// ─────────────────────────────────────────────

/**
 * Determines whether a job should use instant-assign or open bidding.
 * Rules (in priority order):
 *   1. datacenter / industrial → always bidding
 *   2. square_meters >= BIDDING_SQM_THRESHOLD → bidding
 *   3. Otherwise → instant
 */
export function determineMatchingMode(job: {
  job_type: JobType | string
  square_meters?: number | null
}): MatchingMode {
  if (ALWAYS_BIDDING_TYPES.includes(job.job_type as JobType)) {
    return 'bidding'
  }

  if (job.square_meters != null && job.square_meters >= BIDDING_SQM_THRESHOLD) {
    return 'bidding'
  }

  return 'instant'
}

// ─────────────────────────────────────────────
// Provider Scoring
// ─────────────────────────────────────────────

/**
 * Scores a provider's suitability for a given job (0 = ineligible, 0-1 = score).
 *
 * Scoring weights:
 *   - Rating (0-5 scale)                       → 40%
 *   - Service area match (in-area vs out-area) → 30%
 *   - Capacity (completed/total ratio)          → 20%
 *   - Price competitiveness (placeholder)       → 10%
 *
 * Returns 0 if the provider does not cover the job_type.
 */
export function scoreProvider(
  provider: ScoredProvider,
  job: JobMatchContext
): number {
  // Hard filter: provider must support the job type
  if (!provider.move_types.includes(job.job_type)) {
    return 0
  }

  // Rating score (normalise 0-5 to 0-1)
  const ratingScore = Math.min(provider.rating / 5, 1)

  // Service area proximity (binary: covers suburb = 1, doesn't = 0.2)
  const inServiceArea = provider.service_areas.some((area) =>
    area.toLowerCase().includes(job.origin_suburb.toLowerCase()) ||
    job.origin_suburb.toLowerCase().includes(area.toLowerCase())
  )
  const proximityScore = inServiceArea ? 1 : 0.2

  // Capacity / reliability score (completed / total jobs ratio, floor at 0.5 for new providers)
  const capacityScore =
    provider.total_jobs === 0
      ? 0.8 // New provider — give benefit of the doubt
      : Math.min(provider.completed_jobs / provider.total_jobs, 1)

  // Price competitiveness (neutral 0.5 until bidding data available)
  const priceScore = 0.5

  const score =
    ratingScore * 0.4 +
    proximityScore * 0.3 +
    capacityScore * 0.2 +
    priceScore * 0.1

  return Math.round(score * 1000) / 1000 // round to 3dp
}

/**
 * Returns whether a provider's score qualifies for instant auto-assignment.
 */
export function qualifiesForInstantAssign(score: number): boolean {
  return score >= INSTANT_ASSIGN_THRESHOLD
}
