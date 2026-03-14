/**
 * Marketplace Zod Schemas
 * Validation schemas for all marketplace entities
 */

import { z } from 'zod'

// ─────────────────────────────────────────────
// Shared constants
// ─────────────────────────────────────────────

const JOB_TYPES = ['office', 'warehouse', 'datacenter', 'retail', 'industrial', 'it_equipment'] as const
const DRIVER_ROLES = ['driver', 'mover', 'lead', 'supervisor'] as const
const USER_ROLES = ['customer', 'provider_admin', 'driver', 'platform_admin'] as const
const MATCHING_MODES = ['instant', 'bidding'] as const
const MARKETPLACE_JOB_STATUSES = [
  'draft', 'posted', 'matching', 'bidding', 'assigned', 'confirmed',
  'in_progress', 'completed', 'cancelled', 'disputed'
] as const
const PROVIDER_VERIFICATION_STATUSES = ['pending', 'verified', 'suspended', 'rejected'] as const
const BID_STATUSES = ['pending', 'accepted', 'rejected', 'withdrawn'] as const

// ─────────────────────────────────────────────
// UserProfile Schema
// ─────────────────────────────────────────────

export const userProfileSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
  role: z.enum(USER_ROLES, { errorMap: () => ({ message: `Role must be one of: ${USER_ROLES.join(', ')}` }) }),
  provider_id: z.string().optional().nullable(),
  display_name: z.string().min(1, 'Display name is required'),
  avatar_url: z.string().url().optional().nullable(),
  phone: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
  onboarding_completed: z.boolean().default(false),
})

export type UserProfileInput = z.infer<typeof userProfileSchema>

// ─────────────────────────────────────────────
// Provider Schema
// ─────────────────────────────────────────────

export const providerSchema = z.object({
  company_name: z.string().min(2, 'Company name must be at least 2 characters'),
  abn: z.string().optional().nullable(),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional().nullable(),
  website: z.string().url().optional().nullable(),
  logo_url: z.string().url().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  service_areas: z.array(z.string()).default([]),
  move_types: z.array(z.enum(JOB_TYPES), {
    errorMap: () => ({ message: `Move types must be one of: ${JOB_TYPES.join(', ')}` }),
  }).default([]),
  insurance_doc_url: z.string().url().optional().nullable(),
  insurance_expiry: z.string().optional().nullable(),
  commission_rate: z.number().min(0, 'Commission rate cannot be negative').max(1, 'Commission rate cannot exceed 100%').default(0.15),
  is_new_entrant: z.boolean().optional(),
  is_active: z.boolean().default(true),
})

export type ProviderInput = z.infer<typeof providerSchema>

// ─────────────────────────────────────────────
// ProviderDriver Schema
// ─────────────────────────────────────────────

export const providerDriverSchema = z.object({
  provider_id: z.string().min(1, 'Provider ID is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(8, 'Phone number is required'),
  role: z.enum(DRIVER_ROLES, {
    errorMap: () => ({ message: `Role must be one of: ${DRIVER_ROLES.join(', ')}` }),
  }).default('mover'),
  license_type: z.string().optional().nullable(),
  skills: z.array(z.string()).default([]),
  status: z.enum(['active', 'inactive', 'on_job']).default('active'),
})

export type ProviderDriverInput = z.infer<typeof providerDriverSchema>

// ─────────────────────────────────────────────
// MarketplaceJob Schema
// ─────────────────────────────────────────────

export const marketplaceJobSchema = z.object({
  lead_id: z.string().optional().nullable(),
  customer_id: z.string().optional().nullable(),
  job_type: z.enum(JOB_TYPES, {
    errorMap: () => ({ message: `Job type must be one of: ${JOB_TYPES.join(', ')}` }),
  }),
  status: z.enum(MARKETPLACE_JOB_STATUSES).default('draft'),
  matching_mode: z.enum(MATCHING_MODES).default('instant'),

  // Location
  origin_address: z.string().optional().nullable(),
  origin_suburb: z.string().min(1, 'Origin suburb is required'),
  origin_state: z.string().default('VIC'),
  destination_address: z.string().optional().nullable(),
  destination_suburb: z.string().min(1, 'Destination suburb is required'),
  destination_state: z.string().default('VIC'),
  distance_km: z.number().positive().optional().nullable(),

  // Job details
  scheduled_date: z.string().min(1, 'Scheduled date is required'),
  preferred_start_time: z.string().optional().nullable(),
  estimated_duration_hours: z.number().positive().optional().nullable(),
  square_meters: z.number().positive().optional().nullable(),
  floor_count: z.number().int().positive().default(1),
  has_elevator: z.boolean().default(true),
  special_requirements: z.array(z.string()).optional().nullable(),
  additional_services: z.array(z.string()).optional().nullable(),

  // Pricing
  customer_price: z.number().positive('Customer price must be positive'),
  provider_payout: z.number().positive().optional().nullable(),
  platform_fee: z.number().nonnegative().optional().nullable(),
  platform_fee_pct: z.number().min(0).max(1).default(0.15),

  // Assignment
  assigned_provider_id: z.string().optional().nullable(),
  assigned_at: z.string().optional().nullable(),
  accepted_at: z.string().optional().nullable(),
  bid_deadline: z.string().optional().nullable(),
})

export type MarketplaceJobInput = z.infer<typeof marketplaceJobSchema>

// ─────────────────────────────────────────────
// JobBid Schema
// ─────────────────────────────────────────────

export const jobBidSchema = z.object({
  job_id: z.string().min(1, 'Job ID is required'),
  provider_id: z.string().min(1, 'Provider ID is required'),
  bid_amount: z.number().positive('Bid amount must be greater than 0'),
  message: z.string().max(1000).optional().nullable(),
  estimated_duration_hours: z.number().positive().optional().nullable(),
  crew_size: z.number().int().positive().optional().nullable(),
  available_date: z.string().optional().nullable(),
})

export type JobBidInput = z.infer<typeof jobBidSchema>

// ─────────────────────────────────────────────
// MarketplacePayout Schema
// ─────────────────────────────────────────────

export const marketplacePayoutSchema = z.object({
  job_id: z.string().min(1, 'Job ID is required'),
  provider_id: z.string().min(1, 'Provider ID is required'),
  amount: z.number().positive('Payout amount must be positive'),
  platform_fee: z.number().nonnegative(),
  stripe_transfer_id: z.string().optional().nullable(),
  stripe_payment_intent_id: z.string().optional().nullable(),
  status: z.enum(['pending', 'processing', 'paid', 'failed', 'reversed']).default('pending'),
  triggered_by: z.enum(['auto_completion', 'manual_admin', 'dispute_resolution']),
  payout_method: z.string().default('stripe_connect'),
  notes: z.string().optional().nullable(),
})

export type MarketplacePayoutInput = z.infer<typeof marketplacePayoutSchema>

// ─────────────────────────────────────────────
// ProviderAvailability Schema
// ─────────────────────────────────────────────

export const providerAvailabilitySchema = z.object({
  provider_id: z.string().min(1, 'Provider ID is required'),
  slot_date: z.string().min(1, 'Slot date is required'),
  available_crews: z.number().int().nonnegative().default(1),
  booked_crews: z.number().int().nonnegative().default(0),
  is_blocked: z.boolean().default(false),
  block_reason: z.string().optional().nullable(),
})

export type ProviderAvailabilityInput = z.infer<typeof providerAvailabilitySchema>
