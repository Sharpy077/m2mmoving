-- ============================================================
-- Migration: Marketplace Row-Level Security Policies
-- Multi-tenant access control for all marketplace tables
-- Date: 2026-03-13
-- ============================================================

-- ─────────────────────────────────────────────
-- Helper: Get current user's role
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid()
$$;

-- ─────────────────────────────────────────────
-- Helper: Get current user's provider_id
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_my_provider_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT provider_id FROM user_profiles WHERE id = auth.uid()
$$;

-- ─────────────────────────────────────────────
-- Enable RLS on all new tables
-- ─────────────────────────────────────────────

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- user_profiles policies
-- ─────────────────────────────────────────────

-- Users can read their own profile
CREATE POLICY "user_profiles_select_own"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

-- Platform admins can read all profiles
CREATE POLICY "user_profiles_select_platform_admin"
  ON user_profiles FOR SELECT
  USING (get_my_role() = 'platform_admin');

-- Users can update their own profile (not role — role changes done by admin only)
CREATE POLICY "user_profiles_update_own"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM user_profiles WHERE id = auth.uid()));

-- Platform admins can update any profile (including role changes)
CREATE POLICY "user_profiles_update_platform_admin"
  ON user_profiles FOR UPDATE
  USING (get_my_role() = 'platform_admin');

-- Profiles are inserted on sign-up via trigger (no direct insert needed)
CREATE POLICY "user_profiles_insert_own"
  ON user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ─────────────────────────────────────────────
-- providers policies
-- ─────────────────────────────────────────────

-- Anyone can view verified, active providers (public marketplace browsing)
CREATE POLICY "providers_select_public"
  ON providers FOR SELECT
  USING (is_active = true AND verification_status = 'verified');

-- Provider admins can view their own provider record (even pending/suspended)
CREATE POLICY "providers_select_own"
  ON providers FOR SELECT
  USING (id = get_my_provider_id());

-- Platform admins can view all providers
CREATE POLICY "providers_select_platform_admin"
  ON providers FOR SELECT
  USING (get_my_role() = 'platform_admin');

-- Provider admins can update their own provider (cannot change verification_status or commission_rate)
CREATE POLICY "providers_update_own"
  ON providers FOR UPDATE
  USING (id = get_my_provider_id())
  WITH CHECK (
    id = get_my_provider_id()
    AND verification_status = (SELECT verification_status FROM providers WHERE id = get_my_provider_id())
    AND commission_rate = (SELECT commission_rate FROM providers WHERE id = get_my_provider_id())
    AND is_platform_default = (SELECT is_platform_default FROM providers WHERE id = get_my_provider_id())
  );

-- Platform admins can update any provider
CREATE POLICY "providers_update_platform_admin"
  ON providers FOR UPDATE
  USING (get_my_role() = 'platform_admin');

-- Anyone (authenticated) can create a provider registration (goes to pending verification)
CREATE POLICY "providers_insert_authenticated"
  ON providers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND verification_status = 'pending');

-- ─────────────────────────────────────────────
-- provider_drivers policies
-- ─────────────────────────────────────────────

-- Provider admins can manage their own drivers
CREATE POLICY "provider_drivers_all_own"
  ON provider_drivers FOR ALL
  USING (provider_id = get_my_provider_id())
  WITH CHECK (provider_id = get_my_provider_id());

-- Platform admins can view all drivers
CREATE POLICY "provider_drivers_select_platform_admin"
  ON provider_drivers FOR SELECT
  USING (get_my_role() = 'platform_admin');

-- Drivers can read their own record (linked via auth_user_id)
CREATE POLICY "provider_drivers_select_self"
  ON provider_drivers FOR SELECT
  USING (auth_user_id = auth.uid());

-- Drivers can update their own status
CREATE POLICY "provider_drivers_update_self"
  ON provider_drivers FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- ─────────────────────────────────────────────
-- marketplace_jobs policies
-- ─────────────────────────────────────────────

-- Customers can view their own jobs
CREATE POLICY "marketplace_jobs_select_customer_own"
  ON marketplace_jobs FOR SELECT
  USING (customer_id = auth.uid());

-- Customers can create jobs (status starts as draft/posted)
CREATE POLICY "marketplace_jobs_insert_customer"
  ON marketplace_jobs FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND status IN ('draft', 'posted')
    AND (customer_id = auth.uid() OR customer_id IS NULL)
  );

-- Customers can update their own draft jobs
CREATE POLICY "marketplace_jobs_update_customer_draft"
  ON marketplace_jobs FOR UPDATE
  USING (customer_id = auth.uid() AND status = 'draft')
  WITH CHECK (customer_id = auth.uid());

-- Providers can view posted/bidding/assigned jobs in their service areas
-- (Simplified: providers see all posted jobs; DISPATCH agent handles filtering)
CREATE POLICY "marketplace_jobs_select_provider_posted"
  ON marketplace_jobs FOR SELECT
  USING (
    get_my_role() IN ('provider_admin', 'driver')
    AND status IN ('posted', 'matching', 'bidding', 'assigned', 'confirmed', 'in_progress', 'completed')
  );

-- Providers can view jobs assigned to them
CREATE POLICY "marketplace_jobs_select_provider_assigned"
  ON marketplace_jobs FOR SELECT
  USING (
    assigned_provider_id = get_my_provider_id()
    AND get_my_role() = 'provider_admin'
  );

-- Providers can update status on jobs assigned to them (accept, start, complete)
CREATE POLICY "marketplace_jobs_update_provider_assigned"
  ON marketplace_jobs FOR UPDATE
  USING (
    assigned_provider_id = get_my_provider_id()
    AND get_my_role() = 'provider_admin'
  )
  WITH CHECK (assigned_provider_id = get_my_provider_id());

-- Platform admins can view and update all jobs
CREATE POLICY "marketplace_jobs_all_platform_admin"
  ON marketplace_jobs FOR ALL
  USING (get_my_role() = 'platform_admin');

-- ─────────────────────────────────────────────
-- job_bids policies
-- ─────────────────────────────────────────────

-- Providers can create and manage their own bids
CREATE POLICY "job_bids_all_own_provider"
  ON job_bids FOR ALL
  USING (provider_id = get_my_provider_id())
  WITH CHECK (provider_id = get_my_provider_id());

-- Customers can view bids on their jobs
CREATE POLICY "job_bids_select_customer_own_jobs"
  ON job_bids FOR SELECT
  USING (
    job_id IN (
      SELECT id FROM marketplace_jobs WHERE customer_id = auth.uid()
    )
  );

-- Platform admins can view all bids
CREATE POLICY "job_bids_select_platform_admin"
  ON job_bids FOR SELECT
  USING (get_my_role() = 'platform_admin');

-- ─────────────────────────────────────────────
-- marketplace_payouts policies
-- ─────────────────────────────────────────────

-- Providers can view their own payouts
CREATE POLICY "marketplace_payouts_select_own_provider"
  ON marketplace_payouts FOR SELECT
  USING (provider_id = get_my_provider_id());

-- Platform admins can manage all payouts
CREATE POLICY "marketplace_payouts_all_platform_admin"
  ON marketplace_payouts FOR ALL
  USING (get_my_role() = 'platform_admin');

-- ─────────────────────────────────────────────
-- provider_availability policies
-- ─────────────────────────────────────────────

-- Anyone can view availability (for booking flow)
CREATE POLICY "provider_availability_select_public"
  ON provider_availability FOR SELECT
  USING (true);

-- Providers can manage their own availability
CREATE POLICY "provider_availability_all_own_provider"
  ON provider_availability FOR ALL
  USING (provider_id = get_my_provider_id())
  WITH CHECK (provider_id = get_my_provider_id());

-- Platform admins can manage all availability
CREATE POLICY "provider_availability_all_platform_admin"
  ON provider_availability FOR ALL
  USING (get_my_role() = 'platform_admin');

-- ─────────────────────────────────────────────
-- Trigger: Auto-create user_profile on auth.users insert
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_profiles (id, role, display_name, status, onboarding_completed)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    'active',
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
