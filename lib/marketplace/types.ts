/**
 * Marketplace Types
 * Core type definitions for the multi-sided moving marketplace
 */

// ─────────────────────────────────────────────
// Enums / Union Types
// ─────────────────────────────────────────────

export type UserRole = 'customer' | 'provider_admin' | 'driver' | 'platform_admin'

export type ProviderVerificationStatus = 'pending' | 'verified' | 'suspended' | 'rejected'

export type MarketplaceJobStatus =
  | 'draft'
  | 'posted'
  | 'matching'
  | 'bidding'
  | 'assigned'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed'

export type MatchingMode = 'instant' | 'bidding'

export type JobType = 'office' | 'warehouse' | 'datacenter' | 'retail' | 'industrial' | 'it_equipment'

export type DriverRole = 'driver' | 'mover' | 'lead' | 'supervisor'

export type DriverStatus = 'active' | 'inactive' | 'on_job'

export type BidStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn'

export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'reversed'

export type JobPaymentStatus = 'unpaid' | 'held' | 'released' | 'refunded'

// ─────────────────────────────────────────────
// Core Entities
// ─────────────────────────────────────────────

export interface UserProfile {
  id: string
  role: UserRole
  provider_id?: string | null
  display_name: string
  avatar_url?: string | null
  phone?: string | null
  status: 'active' | 'inactive'
  onboarding_completed: boolean
  created_at?: string
  updated_at?: string
}

export interface Provider {
  id: string
  company_name: string
  abn?: string | null
  email: string
  phone?: string | null
  website?: string | null
  logo_url?: string | null
  description?: string | null
  service_areas: string[]
  move_types: JobType[]
  insurance_doc_url?: string | null
  insurance_expiry?: string | null
  stripe_account_id?: string | null
  stripe_onboarding_complete: boolean
  verification_status: ProviderVerificationStatus
  rating: number
  total_jobs: number
  completed_jobs: number
  commission_rate: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProviderInsert {
  company_name: string
  abn?: string
  email: string
  phone?: string
  website?: string
  logo_url?: string
  description?: string
  service_areas?: string[]
  move_types?: JobType[]
  insurance_doc_url?: string
  insurance_expiry?: string
  commission_rate?: number
}

export interface ProviderDriver {
  id: string
  provider_id: string
  auth_user_id?: string | null
  name: string
  email?: string | null
  phone: string
  role: DriverRole
  license_type?: string | null
  status: DriverStatus
  current_job_id?: string | null
  skills: string[]
  stripe_account_id?: string | null
  created_at: string
  updated_at: string
}

export interface ProviderDriverInsert {
  provider_id: string
  name: string
  phone: string
  email?: string
  role?: DriverRole
  license_type?: string
  skills?: string[]
}

export interface MarketplaceJob {
  id: string
  lead_id?: string | null
  customer_id?: string | null
  job_type: JobType
  status: MarketplaceJobStatus
  matching_mode: MatchingMode

  // Location
  origin_address?: string | null
  origin_suburb: string
  origin_state: string
  destination_address?: string | null
  destination_suburb: string
  destination_state: string
  distance_km?: number | null

  // Job details
  scheduled_date: string
  preferred_start_time?: string | null
  estimated_duration_hours?: number | null
  square_meters?: number | null
  floor_count: number
  has_elevator: boolean
  special_requirements?: string[] | null
  additional_services?: string[] | null

  // Pricing
  customer_price: number
  provider_payout?: number | null
  platform_fee?: number | null
  platform_fee_pct: number

  // Assignment
  assigned_provider_id?: string | null
  assigned_at?: string | null
  accepted_at?: string | null
  bid_deadline?: string | null

  // Tracking
  customer_rating?: number | null
  customer_review?: string | null
  provider_rating?: number | null
  provider_review?: string | null
  completion_photos?: string[] | null

  // Payment
  payment_status: JobPaymentStatus
  stripe_payment_intent_id?: string | null
  payout_released_at?: string | null

  created_at: string
  updated_at: string
}

export interface MarketplaceJobInsert {
  lead_id?: string
  customer_id?: string
  job_type: JobType
  matching_mode?: MatchingMode
  origin_suburb: string
  origin_state?: string
  destination_suburb: string
  destination_state?: string
  origin_address?: string
  destination_address?: string
  distance_km?: number
  scheduled_date: string
  preferred_start_time?: string
  estimated_duration_hours?: number
  square_meters?: number
  floor_count?: number
  has_elevator?: boolean
  special_requirements?: string[]
  additional_services?: string[]
  customer_price: number
  platform_fee_pct?: number
}

export interface JobBid {
  id: string
  job_id: string
  provider_id: string
  bid_amount: number
  provider_payout?: number | null
  message?: string | null
  estimated_duration_hours?: number | null
  crew_size?: number | null
  available_date?: string | null
  status: BidStatus
  created_at: string
  updated_at: string
}

export interface JobBidInsert {
  job_id: string
  provider_id: string
  bid_amount: number
  message?: string
  estimated_duration_hours?: number
  crew_size?: number
  available_date?: string
}

export interface MarketplacePayout {
  id: string
  job_id: string
  provider_id: string
  amount: number
  platform_fee: number
  stripe_transfer_id?: string | null
  stripe_payment_intent_id?: string | null
  status: PayoutStatus
  triggered_by: 'auto_completion' | 'manual_admin' | 'dispute_resolution'
  payout_method: string
  notes?: string | null
  created_at: string
  paid_at?: string | null
}

export interface ProviderAvailability {
  id: string
  provider_id: string
  slot_date: string
  available_crews: number
  booked_crews: number
  is_blocked: boolean
  block_reason?: string | null
  created_at: string
}

// ─────────────────────────────────────────────
// Computed / DTO Types
// ─────────────────────────────────────────────

export interface MarketplaceFees {
  customer_price: number
  platform_fee: number
  provider_payout: number
  commission_rate: number
}

export interface ProviderScore {
  provider_id: string
  score: number
  breakdown: {
    rating_score: number
    proximity_score: number
    capacity_score: number
    price_score: number
  }
}

export interface JobMatchContext {
  origin_suburb: string
  job_type: JobType
  customer_price: number
  scheduled_date?: string
}

export interface ScoredProvider {
  rating: number
  total_jobs: number
  completed_jobs: number
  service_areas: string[]
  move_types: string[]
}
