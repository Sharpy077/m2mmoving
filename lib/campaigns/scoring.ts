/**
 * Lead Scoring System
 * Calculates a 0-100 score based on contact completeness, deal value, and engagement
 */

export interface LeadScoreInput {
  hasEmail: boolean
  hasPhone: boolean
  hasCompanyName: boolean
  moveType: string
  estimatedTotal: number
  engagementEvents: number
}

const MOVE_TYPE_WEIGHTS: Record<string, number> = {
  datacenter: 15,
  office: 10,
  "it-equipment": 5,
}

export function calculateLeadScore(input: LeadScoreInput): number {
  let score = 0

  // Contact completeness (max 30)
  if (input.hasEmail) score += 10
  if (input.hasPhone) score += 10
  if (input.hasCompanyName) score += 10

  // Move type (max 15)
  score += MOVE_TYPE_WEIGHTS[input.moveType] || 5

  // Deal value (max 30)
  if (input.estimatedTotal >= 50000) score += 30
  else if (input.estimatedTotal >= 20000) score += 25
  else if (input.estimatedTotal >= 10000) score += 20
  else if (input.estimatedTotal >= 5000) score += 15
  else if (input.estimatedTotal >= 2000) score += 10
  else score += 5

  // Engagement (max 25)
  score += Math.min(input.engagementEvents * 5, 25)

  return Math.min(Math.max(score, 0), 100)
}
