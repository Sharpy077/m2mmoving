/**
 * DISPATCH_MKT Agent
 * Autonomous job-to-provider matching engine for the M2M Marketplace
 *
 * Responsibilities:
 * - Processes job.posted events and matches jobs to the best available provider
 * - Instant assign (score ≥ 0.75) for standard jobs
 * - Opens bidding window for large/complex jobs
 * - Triggers payout after job completion + rating
 * - Escalates to BRIDGE if no match found
 */

import { BaseAgent } from '../base-agent'
import type { AgentIdentity, AgentInput, AgentOutput } from '../types'
import { createClient } from '@/lib/supabase/server'
import {
  scoreProvider,
  qualifiesForInstantAssign,
  determineMatchingMode,
} from '@/lib/marketplace/matching'
import type { ScoredProvider, JobMatchContext, JobType } from '@/lib/marketplace/types'

// How many hours before job.scheduled_date the bidding window expires
const BIDDING_WINDOW_HOURS = 48

export class DispatchAgent extends BaseAgent {
  constructor() {
    super({
      codename: 'DISPATCH_MKT',
      enabled: true,
      systemPrompt: `You are DISPATCH, the marketplace orchestration agent for M2M Moving.
Your role is to autonomously match commercial moving jobs to the best available provider.

You evaluate providers based on:
1. Service area coverage (does the provider cover the job's origin suburb?)
2. Move type capability (can the provider handle this job type?)
3. Rating (customer satisfaction score)
4. Capacity (available crews on the scheduled date)

For instant-mode jobs: auto-assign the highest-scoring qualified provider (score ≥ 0.75).
For bidding-mode jobs: open a 48-hour bidding window and notify the top 5 providers.
If no match found: escalate to platform admin via BRIDGE.`,
    })
  }

  protected getIdentity(): AgentIdentity {
    return {
      codename: 'DISPATCH_MKT',
      name: 'Dispatch',
      description: 'Autonomous marketplace job matching and assignment engine',
      version: '1.0.0',
      capabilities: [
        'job_matching',
        'provider_scoring',
        'instant_assignment',
        'bid_management',
        'payout_triggering',
        'escalation',
      ],
      status: 'idle',
    }
  }

  /** Expose identity for testing */
  public getPublicIdentity(): AgentIdentity {
    return this.identity
  }

  async process(input: AgentInput): Promise<AgentOutput> {
    if (input.type !== 'event' || !input.event) {
      return { success: false, error: 'DISPATCH only handles event inputs.' }
    }

    const { name, data } = input.event

    switch (name) {
      case 'job.posted':
        return this.handleJobPosted(data as JobPostedEventData)
      case 'job.completed':
        return this.handleJobCompleted(data as JobCompletedEventData)
      case 'bid.deadline_reached':
        return this.handleBidDeadlineReached(data as BidDeadlineEventData)
      default:
        return { success: false, error: `Unknown event: ${name}` }
    }
  }

  // ─────────────────────────────────────────────
  // Event: job.posted
  // ─────────────────────────────────────────────

  private async handleJobPosted(data: JobPostedEventData): Promise<AgentOutput> {
    const { job_id, job_type, origin_suburb, square_meters, customer_price, scheduled_date, matching_mode } = data

    // Confirm matching mode
    const mode = matching_mode ?? determineMatchingMode({ job_type, square_meters })

    if (mode === 'bidding') {
      return this.openBiddingWindow(job_id, scheduled_date)
    }

    // Instant matching: find and score eligible providers
    const providers = await this.findEligibleProviders({ job_type, origin_suburb })
    if (providers.length === 0) {
      await this.updateJobStatus(job_id, 'matching')
      return {
        success: true,
        data: { job_id, status: 'no_providers_found', action: 'escalated' },
        escalation: {
          reason: `No eligible providers found for job ${job_id} (${job_type}, ${origin_suburb})`,
          priority: 'high',
        },
      }
    }

    const jobContext: JobMatchContext = { origin_suburb, job_type: job_type as JobType, customer_price }
    const scored = providers
      .map((p) => ({
        provider: p,
        score: scoreProvider(p as ScoredProvider, jobContext),
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)

    const best = scored[0]
    if (!best || !qualifiesForInstantAssign(best.score)) {
      // Score too low — open bidding instead
      return this.openBiddingWindow(job_id, scheduled_date)
    }

    // Auto-assign
    const assigned = await this.assignJob(job_id, best.provider.id as string)
    return {
      success: true,
      data: {
        job_id,
        status: 'assigned',
        assigned_provider_id: best.provider.id,
        score: best.score,
        assigned,
      },
    }
  }

  // ─────────────────────────────────────────────
  // Event: job.completed
  // ─────────────────────────────────────────────

  private async handleJobCompleted(data: JobCompletedEventData): Promise<AgentOutput> {
    const { job_id } = data
    // Signal that payout can be triggered (actual Stripe transfer done by webhook)
    await this.updateJobStatus(job_id, 'completed')
    return {
      success: true,
      data: { job_id, action: 'payout_queued' },
    }
  }

  // ─────────────────────────────────────────────
  // Event: bid.deadline_reached
  // ─────────────────────────────────────────────

  private async handleBidDeadlineReached(data: BidDeadlineEventData): Promise<AgentOutput> {
    const { job_id } = data
    const supabase = await createClient()

    // Get all pending bids for this job, ordered by bid_amount ascending (cheapest first)
    const { data: bids, error } = await supabase
      .from('job_bids')
      .select('*, providers:provider_id(*)')
      .eq('job_id', job_id)
      .eq('status', 'pending')
      .order('bid_amount', { ascending: true })

    if (error || !bids || bids.length === 0) {
      return {
        success: false,
        error: `No bids found for job ${job_id} at deadline.`,
        escalation: { reason: `Job ${job_id} has no bids at deadline`, priority: 'high' },
      }
    }

    // Auto-select the lowest bid from a verified provider
    const winner = bids.find((b: Record<string, unknown>) => {
      const provider = b.providers as Record<string, unknown> | null
      return provider?.verification_status === 'verified'
    }) ?? bids[0]

    await this.assignJob(job_id, winner.provider_id as string)

    return {
      success: true,
      data: { job_id, assigned_provider_id: winner.provider_id, winning_bid: winner.bid_amount },
    }
  }

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────

  private async findEligibleProviders(criteria: { job_type: string; origin_suburb: string }) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('providers')
      .select('id, company_name, rating, total_jobs, completed_jobs, service_areas, move_types, verification_status, commission_rate')
      .eq('is_active', true)
      .eq('verification_status', 'verified')
      .order('rating', { ascending: false })

    if (error || !data) return []

    // Filter by move type (can't do array contains in RLS-safe way without RPC, so filter in JS)
    return data.filter(
      (p) =>
        p.move_types?.includes(criteria.job_type) &&
        (p.service_areas?.some((area: string) =>
          area.toLowerCase().includes(criteria.origin_suburb.toLowerCase()) ||
          criteria.origin_suburb.toLowerCase().includes(area.toLowerCase())
        ) ?? false)
    )
  }

  private async assignJob(jobId: string, providerId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('marketplace_jobs')
      .update({
        status: 'assigned',
        assigned_provider_id: providerId,
        assigned_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .select()
      .single()

    if (error) throw new Error(`Failed to assign job ${jobId}: ${error.message}`)
    return data
  }

  private async openBiddingWindow(jobId: string, scheduledDate: string): Promise<AgentOutput> {
    const bidDeadline = new Date(scheduledDate)
    bidDeadline.setHours(bidDeadline.getHours() - BIDDING_WINDOW_HOURS)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('marketplace_jobs')
      .update({
        status: 'bidding',
        bid_deadline: bidDeadline.toISOString(),
      })
      .eq('id', jobId)
      .select()
      .single()

    if (error) {
      return { success: false, error: `Failed to open bidding for job ${jobId}` }
    }

    return {
      success: true,
      data: {
        job_id: jobId,
        status: 'bidding',
        bid_deadline: bidDeadline.toISOString(),
        action: 'bidding_window_opened',
      },
    }
  }

  private async updateJobStatus(jobId: string, status: string) {
    const supabase = await createClient()
    await supabase
      .from('marketplace_jobs')
      .update({ status })
      .eq('id', jobId)
  }
}

// ─────────────────────────────────────────────
// Event data types
// ─────────────────────────────────────────────

interface JobPostedEventData {
  job_id: string
  job_type: string
  origin_suburb: string
  square_meters?: number
  customer_price: number
  scheduled_date: string
  matching_mode?: 'instant' | 'bidding'
}

interface JobCompletedEventData {
  job_id: string
  provider_id: string
}

interface BidDeadlineEventData {
  job_id: string
}
