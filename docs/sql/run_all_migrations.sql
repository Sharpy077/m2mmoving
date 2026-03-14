-- =============================================================================
-- M&M COMMERCIAL MOVING - COMBINED MIGRATIONS
-- Run this file to create all agent tables
-- =============================================================================

-- =============================================================================
-- MIGRATION 003: PAYMENTS TABLE
-- =============================================================================

-- Create payments table to track all payment transactions
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_checkout_session_id TEXT,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'aud',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_type TEXT DEFAULT 'deposit',
  customer_email TEXT,
  customer_name TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  receipt_url TEXT,
  failure_reason TEXT,
  refund_amount NUMERIC(10,2) DEFAULT 0,
  refund_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to payments" ON payments FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow authenticated read payments" ON payments FOR SELECT USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_payments_lead_id ON payments(lead_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payments_updated_at ON payments;
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payments_updated_at();

-- =============================================================================
-- MIGRATION 004: SUPPORT TICKETS (SENTINEL AGENT)
-- =============================================================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  category TEXT NOT NULL CHECK (category IN ('inquiry', 'booking', 'complaint', 'damage', 'refund', 'billing', 'other')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  booking_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  assigned_agent TEXT DEFAULT 'SENTINEL_CS',
  escalated_to TEXT,
  escalation_reason TEXT,
  resolution TEXT,
  resolution_type TEXT CHECK (resolution_type IN ('resolved', 'refunded', 'compensated', 'escalated', 'no_action', 'duplicate')),
  follow_up_date TIMESTAMPTZ,
  follow_up_channel TEXT CHECK (follow_up_channel IN ('email', 'phone', 'sms')),
  follow_up_notes TEXT,
  csat_score INTEGER CHECK (csat_score >= 1 AND csat_score <= 5),
  csat_feedback TEXT,
  compensation_type TEXT CHECK (compensation_type IN ('discount', 'refund', 'credit', 'service', 'none')),
  compensation_amount NUMERIC(10,2) DEFAULT 0,
  compensation_approved BOOLEAN DEFAULT FALSE,
  conversation_id TEXT,
  tags TEXT[],
  internal_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'agent', 'system')),
  sender_name TEXT,
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'agent', 'manager', 'admin')),
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_email ON support_tickets(customer_email);
CREATE INDEX IF NOT EXISTS idx_support_tickets_booking_id ON support_tickets(booking_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to support_tickets" ON support_tickets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Authenticated users can read support_tickets" ON support_tickets FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create support_tickets" ON support_tickets FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');
CREATE POLICY "Authenticated users can update support_tickets" ON support_tickets FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Service role full access to ticket_messages" ON ticket_messages FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Authenticated users can read ticket_messages" ON ticket_messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Anyone can create ticket_messages" ON ticket_messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role full access to admin_users" ON admin_users FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Users can read own admin record" ON admin_users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can read all admin_users" ON admin_users FOR SELECT USING (
  EXISTS (SELECT 1 FROM admin_users au WHERE au.id = auth.uid() AND au.role IN ('admin', 'manager'))
);

CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('ticket_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_ticket_number ON support_tickets;
CREATE TRIGGER set_ticket_number BEFORE INSERT ON support_tickets FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

CREATE OR REPLACE FUNCTION update_support_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_support_tickets_timestamp ON support_tickets;
CREATE TRIGGER update_support_tickets_timestamp BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_support_ticket_timestamp();

-- =============================================================================
-- MIGRATION 005: HUNTER PROSPECTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  abn TEXT,
  website TEXT,
  industry TEXT,
  employee_count TEXT,
  estimated_revenue TEXT,
  headquarters TEXT,
  linkedin_url TEXT,
  contact_name TEXT,
  contact_title TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_linkedin TEXT,
  source TEXT NOT NULL,
  source_detail TEXT,
  source_listing_id TEXT,
  score INTEGER DEFAULT 0,
  score_breakdown JSONB DEFAULT '{}',
  qualified BOOLEAN DEFAULT FALSE,
  qualification_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'enriched', 'qualified', 'contacted', 'engaged', 'meeting_scheduled', 'proposal_sent', 'converted', 'lost', 'nurture')),
  signals JSONB DEFAULT '[]',
  enriched_data JSONB DEFAULT '{}',
  enriched_at TIMESTAMP WITH TIME ZONE,
  decision_makers JSONB DEFAULT '[]',
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  next_follow_up_date TIMESTAMP WITH TIME ZONE,
  follow_up_action TEXT,
  follow_up_notes TEXT,
  current_sequence TEXT,
  current_sequence_step INTEGER DEFAULT 0,
  sequence_started_at TIMESTAMP WITH TIME ZONE,
  converted_lead_id UUID REFERENCES leads(id),
  conversion_date TIMESTAMP WITH TIME ZONE,
  lost_reason TEXT,
  assigned_agent TEXT DEFAULT 'HUNTER_LG',
  internal_notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outreach_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'linkedin', 'call', 'sms')),
  outreach_type TEXT NOT NULL,
  template_id TEXT,
  sequence_name TEXT,
  sequence_step INTEGER,
  subject TEXT,
  message_content TEXT,
  personalization_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'sent' CHECK (status IN ('scheduled', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed', 'cancelled')),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,
  response_content TEXT,
  response_sentiment TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  external_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS intent_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('commercial_lease_listing', 'lease_expiration', 'hiring_surge', 'funding_announcement', 'office_renovation', 'expansion_news', 'competitor_mention', 'linkedin_job_post', 'website_visit', 'content_download')),
  confidence INTEGER DEFAULT 70 CHECK (confidence >= 0 AND confidence <= 100),
  timing TEXT CHECK (timing IN ('immediate', 'near_term', 'future', 'unknown')),
  source TEXT NOT NULL,
  source_url TEXT,
  company_name TEXT,
  company_data JSONB DEFAULT '{}',
  details JSONB DEFAULT '{}',
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  required_fields TEXT[] DEFAULT '{}',
  optional_fields TEXT[] DEFAULT '{}',
  send_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO email_templates (id, name, category, subject, body, required_fields) VALUES
('initial_outreach', 'Initial Outreach', 'initial', 'Quick question about {companyName}''s upcoming move', E'Hi {firstName},\n\nI noticed {companyName} might be relocating soon - congratulations on the growth!\n\nAt M&M Commercial Moving, we specialize in making business relocations seamless. Our tech-powered approach means zero downtime and real-time tracking of every piece of equipment.\n\nWould it be helpful if I sent over a quick guide on "5 Things Most Companies Forget When Moving Offices"?\n\nBest,\nHunter\nM&M Commercial Moving', ARRAY['firstName', 'companyName']),
('follow_up_1', 'Follow Up 1 - Case Study', 'follow_up', 'Re: {companyName}''s office move', E'Hi {firstName},\n\nJust following up on my last note. I know office moves can be stressful - we recently helped TechCorp relocate 150 employees over a single weekend with zero business interruption.\n\nWould a 15-minute call be useful to discuss your timeline?\n\nBest,\nHunter', ARRAY['firstName', 'companyName']),
('follow_up_2', 'Follow Up 2 - Pain Points', 'follow_up', 'The hidden costs of office moves', E'Hi {firstName},\n\nDid you know the average office move costs companies 3-5 days of productivity? Our clients typically see zero downtime.\n\nHappy to share how we achieved this for {industry} companies like yours.\n\nBest,\nHunter', ARRAY['firstName', 'industry']),
('closing_loop', 'Closing the Loop', 'closing', 'Closing the loop on M&M', E'Hi {firstName},\n\nI''ve reached out a few times about helping {companyName} with your upcoming move. I don''t want to be a pest, so this will be my last note.\n\nIf timing isn''t right now, no worries at all. Feel free to reach out whenever you''re ready - I''m here to help.\n\nWishing you all the best,\nHunter', ARRAY['firstName', 'companyName'])
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_score ON prospects(score DESC);
CREATE INDEX IF NOT EXISTS idx_prospects_source ON prospects(source);
CREATE INDEX IF NOT EXISTS idx_prospects_next_follow_up ON prospects(next_follow_up_date);
CREATE INDEX IF NOT EXISTS idx_prospects_company_name ON prospects(company_name);
CREATE INDEX IF NOT EXISTS idx_prospects_contact_email ON prospects(contact_email);
CREATE INDEX IF NOT EXISTS idx_outreach_prospect_id ON outreach_history(prospect_id);
CREATE INDEX IF NOT EXISTS idx_outreach_status ON outreach_history(status);
CREATE INDEX IF NOT EXISTS idx_outreach_sent_at ON outreach_history(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_channel ON outreach_history(channel);
CREATE INDEX IF NOT EXISTS idx_signals_prospect_id ON intent_signals(prospect_id);
CREATE INDEX IF NOT EXISTS idx_signals_type ON intent_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_signals_processed ON intent_signals(processed);
CREATE INDEX IF NOT EXISTS idx_signals_detected_at ON intent_signals(detected_at DESC);

ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read prospects" ON prospects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access to prospects" ON prospects FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can insert prospects" ON prospects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update prospects" ON prospects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read outreach_history" ON outreach_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access to outreach_history" ON outreach_history FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can insert outreach_history" ON outreach_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read intent_signals" ON intent_signals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access to intent_signals" ON intent_signals FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can insert intent_signals" ON intent_signals FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can read email_templates" ON email_templates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Service role full access to email_templates" ON email_templates FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_prospects_updated_at ON prospects;
CREATE TRIGGER update_prospects_updated_at BEFORE UPDATE ON prospects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_outreach_history_updated_at ON outreach_history;
CREATE TRIGGER update_outreach_history_updated_at BEFORE UPDATE ON outreach_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- MIGRATION 006: PHOENIX RETENTION
-- =============================================================================

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

CREATE INDEX IF NOT EXISTS idx_customer_journeys_customer ON customer_journeys(customer_email);
CREATE INDEX IF NOT EXISTS idx_customer_journeys_status ON customer_journeys(status);
CREATE INDEX IF NOT EXISTS idx_journey_actions_scheduled ON journey_actions(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_nps_scores_customer ON nps_scores(customer_email);
CREATE INDEX IF NOT EXISTS idx_nps_scores_category ON nps_scores(category);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_email);
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_customer ON loyalty_rewards(customer_email);

ALTER TABLE customer_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE winback_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to customer_journeys" ON customer_journeys FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to journey_actions" ON journey_actions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to nps_scores" ON nps_scores FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to referrals" ON referrals FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to loyalty_rewards" ON loyalty_rewards FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to review_requests" ON review_requests FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to winback_campaigns" ON winback_campaigns FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated read customer_journeys" ON customer_journeys FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read journey_actions" ON journey_actions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read nps_scores" ON nps_scores FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read referrals" ON referrals FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read loyalty_rewards" ON loyalty_rewards FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read review_requests" ON review_requests FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read winback_campaigns" ON winback_campaigns FOR SELECT USING (auth.role() = 'authenticated');

-- =============================================================================
-- MIGRATION 007: BRIDGE ESCALATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS human_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL,
  skills TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'offline',
  max_concurrent INTEGER DEFAULT 3,
  current_load INTEGER DEFAULT 0,
  shift_start TIME,
  shift_end TIME,
  working_days INTEGER[] DEFAULT '{1,2,3,4,5}',
  slack_user_id TEXT,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  from_agent TEXT NOT NULL,
  reason TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  customer_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  customer_email TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  conversation_id TEXT,
  conversation_summary TEXT,
  context JSONB DEFAULT '{}',
  assigned_to UUID REFERENCES human_agents(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution TEXT,
  outcome TEXT,
  time_to_assign_ms INTEGER,
  time_to_respond_ms INTEGER,
  time_to_resolve_ms INTEGER,
  sla_breached BOOLEAN DEFAULT FALSE,
  escalated_further BOOLEAN DEFAULT FALSE,
  escalated_to TEXT,
  tags TEXT[] DEFAULT '{}',
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS callbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  customer_email TEXT,
  customer_name TEXT,
  phone TEXT NOT NULL,
  preferred_time TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  reason TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'scheduled',
  assigned_to UUID REFERENCES human_agents(id) ON DELETE SET NULL,
  attempted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  outcome TEXT,
  notes TEXT,
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_callback_id UUID,
  related_escalation_id UUID REFERENCES escalations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES human_agents(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'slack',
  urgency TEXT DEFAULT 'normal',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_escalation_id UUID REFERENCES escalations(id) ON DELETE SET NULL,
  related_callback_id UUID REFERENCES callbacks(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escalation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_id UUID NOT NULL REFERENCES escalations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  old_assignee UUID REFERENCES human_agents(id),
  new_assignee UUID REFERENCES human_agents(id),
  performed_by TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sla_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  priority TEXT UNIQUE NOT NULL,
  first_response_minutes INTEGER NOT NULL,
  resolution_minutes INTEGER NOT NULL,
  escalation_minutes INTEGER NOT NULL,
  business_hours_only BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO sla_config (priority, first_response_minutes, resolution_minutes, escalation_minutes) VALUES
  ('urgent', 15, 60, 30),
  ('high', 30, 120, 60),
  ('medium', 60, 240, 120),
  ('low', 120, 480, 240)
ON CONFLICT (priority) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_human_agents_status ON human_agents(status);
CREATE INDEX IF NOT EXISTS idx_human_agents_skills ON human_agents USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON escalations(status);
CREATE INDEX IF NOT EXISTS idx_escalations_priority ON escalations(priority);
CREATE INDEX IF NOT EXISTS idx_escalations_assigned ON escalations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_callbacks_status ON callbacks(status);
CREATE INDEX IF NOT EXISTS idx_callbacks_scheduled ON callbacks(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_agent ON agent_notifications(agent_id);
CREATE INDEX IF NOT EXISTS idx_escalation_history_escalation ON escalation_history(escalation_id);

ALTER TABLE human_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE callbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to human_agents" ON human_agents FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to escalations" ON escalations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to callbacks" ON callbacks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to agent_notifications" ON agent_notifications FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to escalation_history" ON escalation_history FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to sla_config" ON sla_config FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated read human_agents" ON human_agents FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read escalations" ON escalations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read callbacks" ON callbacks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read agent_notifications" ON agent_notifications FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read escalation_history" ON escalation_history FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read sla_config" ON sla_config FOR SELECT USING (auth.role() = 'authenticated');

INSERT INTO human_agents (name, email, role, skills, status) VALUES
  ('Sarah Kim', 'sarah@mandmmoving.com.au', 'sales_lead', ARRAY['sales', 'negotiation', 'enterprise'], 'available'),
  ('Mike Thompson', 'mike@mandmmoving.com.au', 'operations_lead', ARRAY['operations', 'scheduling', 'logistics'], 'available'),
  ('Emma Roberts', 'emma@mandmmoving.com.au', 'support_lead', ARRAY['support', 'complaints', 'retention'], 'available'),
  ('James Lee', 'james@mandmmoving.com.au', 'manager', ARRAY['sales', 'support', 'operations', 'escalation'], 'available')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- MIGRATION 008: ORACLE ANALYTICS TABLES
-- =============================================================================

-- Adding Oracle agent analytics tables
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'daily',
  leads_total INTEGER DEFAULT 0,
  leads_new INTEGER DEFAULT 0,
  leads_qualified INTEGER DEFAULT 0,
  leads_converted INTEGER DEFAULT 0,
  lead_conversion_rate NUMERIC(5,2),
  revenue_pipeline NUMERIC(12,2) DEFAULT 0,
  revenue_closed NUMERIC(12,2) DEFAULT 0,
  revenue_forecast NUMERIC(12,2) DEFAULT 0,
  revenue_growth_percent NUMERIC(5,2),
  channel_metrics JSONB DEFAULT '{}',
  agent_metrics JSONB DEFAULT '{}',
  pipeline_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(snapshot_date, period_type)
);

CREATE TABLE IF NOT EXISTS analytics_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  related_metrics JSONB DEFAULT '{}',
  recommendations JSONB DEFAULT '[]',
  status TEXT DEFAULT 'new',
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMPTZ,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'summary',
  frequency TEXT NOT NULL,
  day_of_week INTEGER,
  day_of_month INTEGER,
  send_time TIME DEFAULT '08:00',
  recipients JSONB DEFAULT '[]',
  include_sections JSONB DEFAULT '["metrics", "insights", "pipeline"]',
  comparison_period TEXT DEFAULT 'previous',
  is_active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  next_send_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_report_id UUID REFERENCES scheduled_reports(id),
  report_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  content JSONB NOT NULL,
  recipients_sent JSONB DEFAULT '[]',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS revenue_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_date DATE NOT NULL,
  horizon TEXT NOT NULL,
  scenario TEXT NOT NULL DEFAULT 'base',
  period_forecasts JSONB NOT NULL,
  total_forecast NUMERIC(12,2) NOT NULL,
  confidence_percent INTEGER,
  assumptions JSONB DEFAULT '[]',
  actual_revenue NUMERIC(12,2),
  accuracy_percent NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS detected_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  expected_value NUMERIC NOT NULL,
  deviation_percent NUMERIC(5,2) NOT NULL,
  severity TEXT NOT NULL,
  anomaly_type TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  status TEXT DEFAULT 'open',
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE detected_anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to analytics_snapshots" ON analytics_snapshots FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to analytics_insights" ON analytics_insights FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to scheduled_reports" ON scheduled_reports FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to report_history" ON report_history FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to revenue_forecasts" ON revenue_forecasts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to detected_anomalies" ON detected_anomalies FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated read analytics_snapshots" ON analytics_snapshots FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read analytics_insights" ON analytics_insights FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read scheduled_reports" ON scheduled_reports FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read report_history" ON report_history FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read revenue_forecasts" ON revenue_forecasts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read detected_anomalies" ON detected_anomalies FOR SELECT USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_date ON analytics_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_priority ON analytics_insights(priority, status);
CREATE INDEX IF NOT EXISTS idx_detected_anomalies_severity ON detected_anomalies(severity, status);
CREATE INDEX IF NOT EXISTS idx_revenue_forecasts_date ON revenue_forecasts(forecast_date DESC);

-- =============================================================================
-- MIGRATION 009: NEXUS OPERATIONS TABLES
-- =============================================================================

-- Adding Nexus agent operations tables
CREATE TABLE IF NOT EXISTS crews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  members JSONB DEFAULT '[]',
  crew_lead_id UUID,
  crew_lead_name TEXT,
  skills JSONB DEFAULT '[]',
  max_sqm INTEGER DEFAULT 100,
  vehicle_certified JSONB DEFAULT '[]',
  status TEXT DEFAULT 'available',
  current_job_id UUID,
  working_days JSONB DEFAULT '[1,2,3,4,5]',
  shift_start TIME DEFAULT '07:00',
  shift_end TIME DEFAULT '17:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  job_type TEXT NOT NULL,
  origin_address TEXT NOT NULL,
  origin_suburb TEXT,
  destination_address TEXT NOT NULL,
  destination_suburb TEXT,
  estimated_sqm INTEGER,
  special_requirements JSONB DEFAULT '[]',
  scheduled_date DATE NOT NULL,
  start_time TIME DEFAULT '08:00',
  estimated_duration_hours NUMERIC(4,1) DEFAULT 4,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  assigned_crew_id UUID REFERENCES crews(id),
  assigned_vehicle_id UUID REFERENCES vehicles(id),
  priority TEXT DEFAULT 'standard',
  status TEXT DEFAULT 'scheduled',
  confirmation_sent BOOLEAN DEFAULT false,
  reminder_sent BOOLEAN DEFAULT false,
  crew_departed_at TIMESTAMPTZ,
  crew_arrived_at TIMESTAMPTZ,
  loading_started_at TIMESTAMPTZ,
  loading_completed_at TIMESTAMPTZ,
  unloading_started_at TIMESTAMPTZ,
  unloading_completed_at TIMESTAMPTZ,
  internal_notes TEXT,
  customer_notes TEXT,
  completion_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS route_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  optimization_date DATE NOT NULL,
  crew_id UUID REFERENCES crews(id),
  stops JSONB NOT NULL,
  total_distance_km NUMERIC(6,1),
  total_duration_minutes INTEGER,
  distance_saved_km NUMERIC(6,1),
  time_saved_minutes INTEGER,
  traffic_data_used BOOLEAN DEFAULT false,
  optimization_algorithm TEXT DEFAULT 'greedy',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES scheduled_jobs(id),
  update_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  delivery_status TEXT DEFAULT 'pending',
  eta_time TIMESTAMPTZ,
  eta_window_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contingency_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES scheduled_jobs(id),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT,
  delay_minutes INTEGER,
  jobs_affected JSONB DEFAULT '[]',
  resolution_action TEXT,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capacity_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_date DATE NOT NULL,
  total_crew_hours INTEGER DEFAULT 40,
  booked_crew_hours INTEGER DEFAULT 0,
  available_crew_hours INTEGER GENERATED ALWAYS AS (total_crew_hours - booked_crew_hours) STORED,
  trucks_available INTEGER DEFAULT 5,
  trucks_booked INTEGER DEFAULT 0,
  vans_available INTEGER DEFAULT 3,
  vans_booked INTEGER DEFAULT 0,
  is_blocked BOOLEAN DEFAULT false,
  block_reason TEXT,
  jobs_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(slot_date)
);

ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contingency_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacity_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to crews" ON crews FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to scheduled_jobs" ON scheduled_jobs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to route_optimizations" ON route_optimizations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to customer_updates" ON customer_updates FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to contingency_events" ON contingency_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to capacity_slots" ON capacity_slots FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated read crews" ON crews FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read scheduled_jobs" ON scheduled_jobs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read route_optimizations" ON route_optimizations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read customer_updates" ON customer_updates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read contingency_events" ON contingency_events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read capacity_slots" ON capacity_slots FOR SELECT USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_date ON scheduled_jobs(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status ON scheduled_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_crew ON scheduled_jobs(assigned_crew_id);
CREATE INDEX IF NOT EXISTS idx_capacity_slots_date ON capacity_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_contingency_events_status ON contingency_events(status);
CREATE INDEX IF NOT EXISTS idx_crews_status ON crews(status);

-- Insert default crews
INSERT INTO crews (name, skills, status) VALUES
  ('Alpha Team', '["heavy_lifting", "office", "warehouse"]', 'available'),
  ('Bravo Team', '["piano", "antiques", "fragile"]', 'available'),
  ('Charlie Team', '["office", "retail", "standard"]', 'available')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
SELECT 'All migrations (003-009) completed successfully!' AS status;
