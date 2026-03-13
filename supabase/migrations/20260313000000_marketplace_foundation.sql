-- ============================================================
-- Migration: Marketplace Foundation
-- Transforms M&M Moving into a multi-sided marketplace
-- Date: 2026-03-13
-- ============================================================

-- ─────────────────────────────────────────────
-- user_profiles: Role management for all users
-- Extends Supabase Auth with marketplace roles
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('customer', 'provider_admin', 'driver', 'platform_admin')) DEFAULT 'customer',
  provider_id UUID, -- FK added after providers table created
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- providers: Moving companies registered on the platform
-- M&M itself is the first provider (seed data)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  abn TEXT UNIQUE,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  website TEXT,
  logo_url TEXT,
  description TEXT,
  service_areas TEXT[] NOT NULL DEFAULT '{}',
  move_types TEXT[] NOT NULL DEFAULT '{}',
  insurance_doc_url TEXT,
  insurance_expiry DATE,
  stripe_account_id TEXT UNIQUE,
  stripe_onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'suspended', 'rejected')),
  rating DECIMAL(3,2) NOT NULL DEFAULT 5.00 CHECK (rating >= 0 AND rating <= 5),
  total_jobs INTEGER NOT NULL DEFAULT 0,
  completed_jobs INTEGER NOT NULL DEFAULT 0,
  commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.1500 CHECK (commission_rate >= 0 AND commission_rate <= 1),
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- M&M internal flag: the platform operator's own moving company
  is_platform_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from user_profiles to providers (now that providers table exists)
ALTER TABLE user_profiles
  ADD CONSTRAINT fk_user_profiles_provider
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────
-- provider_drivers: Crew members belonging to a provider
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS provider_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'mover'
    CHECK (role IN ('driver', 'mover', 'lead', 'supervisor')),
  license_type TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'on_job')),
  current_job_id UUID, -- FK added after marketplace_jobs table created
  skills TEXT[] NOT NULL DEFAULT '{}',
  stripe_account_id TEXT, -- future: direct driver payouts
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- marketplace_jobs: Jobs posted to the platform
-- Extends the leads concept into a multi-provider marketplace
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS marketplace_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  customer_id UUID, -- references customers(id) — added via FK after table confirmed
  job_type TEXT NOT NULL
    CHECK (job_type IN ('office', 'warehouse', 'datacenter', 'retail', 'industrial', 'it_equipment')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'posted', 'matching', 'bidding', 'assigned', 'confirmed',
                      'in_progress', 'completed', 'cancelled', 'disputed')),
  matching_mode TEXT NOT NULL DEFAULT 'instant'
    CHECK (matching_mode IN ('instant', 'bidding')),

  -- Location
  origin_address TEXT,
  origin_suburb TEXT NOT NULL,
  origin_state TEXT NOT NULL DEFAULT 'VIC',
  destination_address TEXT,
  destination_suburb TEXT NOT NULL,
  destination_state TEXT NOT NULL DEFAULT 'VIC',
  distance_km DECIMAL(8,2),

  -- Job details
  scheduled_date DATE NOT NULL,
  preferred_start_time TIME,
  estimated_duration_hours DECIMAL(4,1),
  square_meters DECIMAL(8,2),
  floor_count INTEGER NOT NULL DEFAULT 1,
  has_elevator BOOLEAN NOT NULL DEFAULT true,
  special_requirements TEXT[],
  additional_services TEXT[],

  -- Pricing (set by PRISM agent)
  customer_price DECIMAL(10,2) NOT NULL CHECK (customer_price > 0),
  provider_payout DECIMAL(10,2),
  platform_fee DECIMAL(10,2),
  platform_fee_pct DECIMAL(5,4) NOT NULL DEFAULT 0.1500 CHECK (platform_fee_pct >= 0 AND platform_fee_pct <= 1),

  -- Assignment
  assigned_provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  bid_deadline TIMESTAMPTZ,

  -- Post-completion tracking
  customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
  customer_review TEXT,
  provider_rating INTEGER CHECK (provider_rating >= 1 AND provider_rating <= 5),
  provider_review TEXT,
  completion_photos TEXT[],

  -- Payment / escrow
  payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'held', 'released', 'refunded')),
  stripe_payment_intent_id TEXT,
  payout_released_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from provider_drivers.current_job_id to marketplace_jobs
ALTER TABLE provider_drivers
  ADD CONSTRAINT fk_driver_current_job
  FOREIGN KEY (current_job_id) REFERENCES marketplace_jobs(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────
-- job_bids: Provider bids on marketplace jobs (bidding mode)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES marketplace_jobs(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  bid_amount DECIMAL(10,2) NOT NULL CHECK (bid_amount > 0),
  provider_payout DECIMAL(10,2), -- computed: bid_amount * (1 - commission_rate)
  message TEXT,
  estimated_duration_hours DECIMAL(4,1),
  crew_size INTEGER,
  available_date DATE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, provider_id)
);

-- ─────────────────────────────────────────────
-- marketplace_payouts: Stripe Connect transfer tracking
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS marketplace_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES marketplace_jobs(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  platform_fee DECIMAL(10,2) NOT NULL CHECK (platform_fee >= 0),
  stripe_transfer_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'reversed')),
  triggered_by TEXT NOT NULL
    CHECK (triggered_by IN ('auto_completion', 'manual_admin', 'dispute_resolution')),
  payout_method TEXT NOT NULL DEFAULT 'stripe_connect',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- ─────────────────────────────────────────────
-- provider_availability: Provider capacity calendar
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS provider_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  available_crews INTEGER NOT NULL DEFAULT 1 CHECK (available_crews >= 0),
  booked_crews INTEGER NOT NULL DEFAULT 0 CHECK (booked_crews >= 0),
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  block_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, slot_date)
);

-- ─────────────────────────────────────────────
-- Indexes for performance
-- ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_marketplace_jobs_status ON marketplace_jobs(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_jobs_scheduled_date ON marketplace_jobs(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_marketplace_jobs_job_type ON marketplace_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_marketplace_jobs_assigned_provider ON marketplace_jobs(assigned_provider_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_jobs_customer ON marketplace_jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_jobs_lead ON marketplace_jobs(lead_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_jobs_payment_status ON marketplace_jobs(payment_status);

CREATE INDEX IF NOT EXISTS idx_job_bids_job ON job_bids(job_id);
CREATE INDEX IF NOT EXISTS idx_job_bids_provider ON job_bids(provider_id);
CREATE INDEX IF NOT EXISTS idx_job_bids_status ON job_bids(status);

CREATE INDEX IF NOT EXISTS idx_provider_drivers_provider ON provider_drivers(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_drivers_status ON provider_drivers(status);

CREATE INDEX IF NOT EXISTS idx_marketplace_payouts_job ON marketplace_payouts(job_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_payouts_provider ON marketplace_payouts(provider_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_payouts_status ON marketplace_payouts(status);

CREATE INDEX IF NOT EXISTS idx_provider_availability_provider_date ON provider_availability(provider_id, slot_date);

CREATE INDEX IF NOT EXISTS idx_providers_verification ON providers(verification_status);
CREATE INDEX IF NOT EXISTS idx_providers_active ON providers(is_active);

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_provider ON user_profiles(provider_id);

-- ─────────────────────────────────────────────
-- Updated_at triggers
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_providers_updated_at
  BEFORE UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provider_drivers_updated_at
  BEFORE UPDATE ON provider_drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_jobs_updated_at
  BEFORE UPDATE ON marketplace_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_bids_updated_at
  BEFORE UPDATE ON job_bids
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────
-- Seed: M&M Moving as the platform default provider
-- ─────────────────────────────────────────────

INSERT INTO providers (
  company_name,
  email,
  phone,
  service_areas,
  move_types,
  verification_status,
  rating,
  is_active,
  is_platform_default,
  commission_rate,
  description
) VALUES (
  'M&M Commercial Moving',
  'ops@m2mmoving.com.au',
  '1300 MMM OPS',
  ARRAY['Melbourne CBD', 'Southbank', 'Docklands', 'St Kilda', 'Richmond', 'Fitzroy',
        'Collingwood', 'South Yarra', 'Toorak', 'Hawthorn', 'Box Hill', 'Clayton'],
  ARRAY['office', 'warehouse', 'datacenter', 'retail', 'industrial', 'it_equipment'],
  'verified',
  5.00,
  true,
  true,
  0.00, -- Platform default provider: 0% commission (M&M keeps all revenue)
  'M&M Commercial Moving — the founding and guaranteed fallback provider on the M&M Marketplace.'
) ON CONFLICT (email) DO NOTHING;
