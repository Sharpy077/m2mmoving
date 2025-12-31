-- =============================================================================
-- PHOENIX RETENTION AGENT TABLES
-- Customer journeys, NPS tracking, referrals, and loyalty programs
-- =============================================================================

-- Customer Journeys Table
CREATE TABLE IF NOT EXISTS customer_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  booking_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  stage TEXT NOT NULL DEFAULT 'post_move',
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 5,
  last_action_at TIMESTAMPTZ,
  next_action_at TIMESTAMPTZ,
  next_action_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Journey Actions Table
CREATE TABLE IF NOT EXISTS journey_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES customer_journeys(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  result JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NPS Scores Table
CREATE TABLE IF NOT EXISTS nps_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  booking_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  category TEXT NOT NULL,
  feedback TEXT,
  survey_type TEXT DEFAULT 'nps',
  channel TEXT DEFAULT 'email',
  follow_up_status TEXT DEFAULT 'none',
  follow_up_action TEXT,
  response_handled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Referrals Table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_customer_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  referrer_email TEXT NOT NULL,
  referrer_name TEXT,
  referral_code TEXT UNIQUE NOT NULL,
  program_type TEXT DEFAULT 'standard',
  referred_email TEXT,
  referred_name TEXT,
  referred_customer_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reward_type TEXT,
  reward_value NUMERIC(10,2),
  reward_issued_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Loyalty Rewards Table
CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  reward_type TEXT NOT NULL,
  reward_value NUMERIC(10,2) NOT NULL,
  reason TEXT NOT NULL,
  code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'issued',
  redeemed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Review Requests Table
CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  booking_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  clicked_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  review_url TEXT,
  incentive_offered TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Win-Back Campaigns Table
CREATE TABLE IF NOT EXISTS winback_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  offer_type TEXT,
  offer_value NUMERIC(10,2),
  target_segment TEXT,
  target_customer_ids UUID[],
  customers_targeted INTEGER DEFAULT 0,
  customers_converted INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_journeys_customer ON customer_journeys(customer_email);
CREATE INDEX IF NOT EXISTS idx_customer_journeys_status ON customer_journeys(status);
CREATE INDEX IF NOT EXISTS idx_journey_actions_scheduled ON journey_actions(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_nps_scores_customer ON nps_scores(customer_email);
CREATE INDEX IF NOT EXISTS idx_nps_scores_category ON nps_scores(category);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_email);
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_customer ON loyalty_rewards(customer_email);

-- RLS Policies
ALTER TABLE customer_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE winback_campaigns ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access to customer_journeys" ON customer_journeys FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to journey_actions" ON journey_actions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to nps_scores" ON nps_scores FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to referrals" ON referrals FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to loyalty_rewards" ON loyalty_rewards FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to review_requests" ON review_requests FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to winback_campaigns" ON winback_campaigns FOR ALL USING (auth.role() = 'service_role');

-- Authenticated read access
CREATE POLICY "Authenticated read customer_journeys" ON customer_journeys FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read journey_actions" ON journey_actions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read nps_scores" ON nps_scores FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read referrals" ON referrals FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read loyalty_rewards" ON loyalty_rewards FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read review_requests" ON review_requests FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read winback_campaigns" ON winback_campaigns FOR SELECT USING (auth.role() = 'authenticated');
