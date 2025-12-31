/**
 * SQL Migration Runner
 *
 * This script runs all pending SQL migrations against the Supabase database.
 * Usage: npx ts-node scripts/run-migrations.ts
 *
 * Or run from v0 scripts folder directly.
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Migration definitions - add new migrations here
const migrations = [
  {
    name: "003_create_payments_table",
    sql: `
-- Payments table for tracking all Stripe transactions
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_checkout_session_id TEXT,
  stripe_customer_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'aud',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_type TEXT DEFAULT 'deposit',
  receipt_url TEXT,
  refund_id TEXT,
  refund_amount INTEGER,
  refund_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_lead_id ON payments(lead_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Admin full access to payments') THEN
    CREATE POLICY "Admin full access to payments" ON payments FOR ALL USING (true);
  END IF;
END $$;
    `,
  },
  {
    name: "004_create_support_tickets_table",
    sql: `
-- Support tickets table for Sentinel agent
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  ticket_number TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  category TEXT DEFAULT 'general',
  assigned_to UUID,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  follow_up_date TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket messages for conversation history
CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,
  sender_id TEXT,
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users table for role-based access
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  permissions JSONB DEFAULT '["read", "write"]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_lead_id ON support_tickets(lead_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'Admin full access to support_tickets') THEN
    CREATE POLICY "Admin full access to support_tickets" ON support_tickets FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ticket_messages' AND policyname = 'Admin full access to ticket_messages') THEN
    CREATE POLICY "Admin full access to ticket_messages" ON ticket_messages FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_users' AND policyname = 'Admin full access to admin_users') THEN
    CREATE POLICY "Admin full access to admin_users" ON admin_users FOR ALL USING (true);
  END IF;
END $$;
    `,
  },
  {
    name: "005_create_hunter_prospects_table",
    sql: `
-- Prospects table for Hunter agent lead generation
CREATE TABLE IF NOT EXISTS prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  industry TEXT,
  company_size TEXT,
  website TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postcode TEXT,
  contact_name TEXT,
  contact_title TEXT,
  source TEXT DEFAULT 'hunter_agent',
  lead_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'new',
  notes TEXT,
  tags JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  last_contacted_at TIMESTAMPTZ,
  converted_to_lead_id UUID REFERENCES leads(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outreach history for tracking communications
CREATE TABLE IF NOT EXISTS outreach_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  outreach_type TEXT NOT NULL,
  channel TEXT DEFAULT 'email',
  subject TEXT,
  content TEXT,
  status TEXT DEFAULT 'sent',
  response TEXT,
  responded_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intent signals for tracking prospect behavior
CREATE TABLE IF NOT EXISTS intent_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  signal_strength INTEGER DEFAULT 1,
  source TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email templates for outreach campaigns
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT DEFAULT 'outreach',
  variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_lead_score ON prospects(lead_score);
CREATE INDEX IF NOT EXISTS idx_prospects_industry ON prospects(industry);
CREATE INDEX IF NOT EXISTS idx_outreach_history_prospect_id ON outreach_history(prospect_id);
CREATE INDEX IF NOT EXISTS idx_intent_signals_prospect_id ON intent_signals(prospect_id);

ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prospects' AND policyname = 'Admin full access to prospects') THEN
    CREATE POLICY "Admin full access to prospects" ON prospects FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'outreach_history' AND policyname = 'Admin full access to outreach_history') THEN
    CREATE POLICY "Admin full access to outreach_history" ON outreach_history FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'intent_signals' AND policyname = 'Admin full access to intent_signals') THEN
    CREATE POLICY "Admin full access to intent_signals" ON intent_signals FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_templates' AND policyname = 'Admin full access to email_templates') THEN
    CREATE POLICY "Admin full access to email_templates" ON email_templates FOR ALL USING (true);
  END IF;
END $$;
    `,
  },
  {
    name: "006_create_phoenix_retention_tables",
    sql: `
-- Customer journeys for Phoenix agent retention tracking
CREATE TABLE IF NOT EXISTS customer_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  journey_type TEXT NOT NULL,
  stage TEXT DEFAULT 'started',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER DEFAULT 5,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journey actions for tracking individual touchpoints
CREATE TABLE IF NOT EXISTS journey_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID REFERENCES customer_journeys(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  scheduled_for TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  result JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NPS scores for customer satisfaction tracking
CREATE TABLE IF NOT EXISTS nps_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  feedback TEXT,
  category TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referrals for tracking customer referrals
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  referred_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  referral_code TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  reward_type TEXT,
  reward_amount INTEGER,
  reward_issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loyalty rewards for customer retention
CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL,
  points INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'bronze',
  benefits JSONB DEFAULT '[]',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Review requests for managing customer reviews
CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  review_url TEXT,
  rating INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Winback campaigns for re-engaging lost customers
CREATE TABLE IF NOT EXISTS winback_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  campaign_type TEXT NOT NULL,
  offer_type TEXT,
  offer_value INTEGER,
  status TEXT DEFAULT 'active',
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_journeys_lead_id ON customer_journeys(lead_id);
CREATE INDEX IF NOT EXISTS idx_journey_actions_journey_id ON journey_actions(journey_id);
CREATE INDEX IF NOT EXISTS idx_nps_scores_lead_id ON nps_scores(lead_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_lead_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_lead_id ON loyalty_rewards(lead_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_lead_id ON review_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_winback_campaigns_lead_id ON winback_campaigns(lead_id);

ALTER TABLE customer_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE winback_campaigns ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customer_journeys' AND policyname = 'Admin full access to customer_journeys') THEN
    CREATE POLICY "Admin full access to customer_journeys" ON customer_journeys FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'journey_actions' AND policyname = 'Admin full access to journey_actions') THEN
    CREATE POLICY "Admin full access to journey_actions" ON journey_actions FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nps_scores' AND policyname = 'Admin full access to nps_scores') THEN
    CREATE POLICY "Admin full access to nps_scores" ON nps_scores FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'referrals' AND policyname = 'Admin full access to referrals') THEN
    CREATE POLICY "Admin full access to referrals" ON referrals FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'loyalty_rewards' AND policyname = 'Admin full access to loyalty_rewards') THEN
    CREATE POLICY "Admin full access to loyalty_rewards" ON loyalty_rewards FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'review_requests' AND policyname = 'Admin full access to review_requests') THEN
    CREATE POLICY "Admin full access to review_requests" ON review_requests FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'winback_campaigns' AND policyname = 'Admin full access to winback_campaigns') THEN
    CREATE POLICY "Admin full access to winback_campaigns" ON winback_campaigns FOR ALL USING (true);
  END IF;
END $$;
    `,
  },
  {
    name: "007_create_bridge_escalation_tables",
    sql: `
-- Human agents for Bridge agent escalations
CREATE TABLE IF NOT EXISTS human_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'support',
  skills JSONB DEFAULT '[]',
  is_available BOOLEAN DEFAULT true,
  max_concurrent_escalations INTEGER DEFAULT 5,
  current_workload INTEGER DEFAULT 0,
  shift_start TIME,
  shift_end TIME,
  timezone TEXT DEFAULT 'Australia/Sydney',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Escalations for tracking handoffs to humans
CREATE TABLE IF NOT EXISTS escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE SET NULL,
  assigned_agent_id UUID REFERENCES human_agents(id) ON DELETE SET NULL,
  escalation_reason TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  context JSONB DEFAULT '{}',
  conversation_history JSONB DEFAULT '[]',
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  sla_deadline TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Callbacks for scheduling customer callbacks
CREATE TABLE IF NOT EXISTS callbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  escalation_id UUID REFERENCES escalations(id) ON DELETE SET NULL,
  assigned_agent_id UUID REFERENCES human_agents(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  attempt_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  outcome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent notifications for alerting human agents
CREATE TABLE IF NOT EXISTS agent_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES human_agents(id) ON DELETE CASCADE,
  escalation_id UUID REFERENCES escalations(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  channel TEXT DEFAULT 'email',
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Escalation history for audit trail
CREATE TABLE IF NOT EXISTS escalation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_id UUID REFERENCES escalations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SLA configuration for escalation handling
CREATE TABLE IF NOT EXISTS sla_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  priority TEXT UNIQUE NOT NULL,
  response_time_minutes INTEGER NOT NULL,
  resolution_time_minutes INTEGER NOT NULL,
  escalation_path JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default SLA configurations
INSERT INTO sla_config (priority, response_time_minutes, resolution_time_minutes, escalation_path) VALUES
  ('critical', 15, 60, '["senior_support", "manager"]'),
  ('high', 30, 120, '["support", "senior_support"]'),
  ('medium', 60, 240, '["support"]'),
  ('low', 120, 480, '["support"]')
ON CONFLICT (priority) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_human_agents_available ON human_agents(is_available);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON escalations(status);
CREATE INDEX IF NOT EXISTS idx_escalations_assigned ON escalations(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_callbacks_scheduled ON callbacks(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_callbacks_status ON callbacks(status);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_agent ON agent_notifications(agent_id);

ALTER TABLE human_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE callbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'human_agents' AND policyname = 'Admin full access to human_agents') THEN
    CREATE POLICY "Admin full access to human_agents" ON human_agents FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'escalations' AND policyname = 'Admin full access to escalations') THEN
    CREATE POLICY "Admin full access to escalations" ON escalations FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'callbacks' AND policyname = 'Admin full access to callbacks') THEN
    CREATE POLICY "Admin full access to callbacks" ON callbacks FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_notifications' AND policyname = 'Admin full access to agent_notifications') THEN
    CREATE POLICY "Admin full access to agent_notifications" ON agent_notifications FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'escalation_history' AND policyname = 'Admin full access to escalation_history') THEN
    CREATE POLICY "Admin full access to escalation_history" ON escalation_history FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sla_config' AND policyname = 'Admin full access to sla_config') THEN
    CREATE POLICY "Admin full access to sla_config" ON sla_config FOR ALL USING (true);
  END IF;
END $$;
    `,
  },
  {
    name: "008_create_oracle_analytics_tables",
    sql: `
-- Oracle Agent Analytics Tables
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
ALTER TABLE revenue_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE detected_anomalies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_snapshots' AND policyname = 'Admin full access to analytics_snapshots') THEN
    CREATE POLICY "Admin full access to analytics_snapshots" ON analytics_snapshots FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_insights' AND policyname = 'Admin full access to analytics_insights') THEN
    CREATE POLICY "Admin full access to analytics_insights" ON analytics_insights FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scheduled_reports' AND policyname = 'Admin full access to scheduled_reports') THEN
    CREATE POLICY "Admin full access to scheduled_reports" ON scheduled_reports FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'revenue_forecasts' AND policyname = 'Admin full access to revenue_forecasts') THEN
    CREATE POLICY "Admin full access to revenue_forecasts" ON revenue_forecasts FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'detected_anomalies' AND policyname = 'Admin full access to detected_anomalies') THEN
    CREATE POLICY "Admin full access to detected_anomalies" ON detected_anomalies FOR ALL USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_date ON analytics_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_priority ON analytics_insights(priority, status);
CREATE INDEX IF NOT EXISTS idx_detected_anomalies_severity ON detected_anomalies(severity, status);
    `,
  },
  {
    name: "009_create_nexus_operations_tables",
    sql: `
-- Nexus Agent Operations Tables
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  capacity_sqm INTEGER,
  registration TEXT,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
  internal_notes TEXT,
  customer_notes TEXT,
  completion_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capacity_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_date DATE NOT NULL UNIQUE,
  total_crew_hours INTEGER DEFAULT 40,
  booked_crew_hours INTEGER DEFAULT 0,
  trucks_available INTEGER DEFAULT 5,
  trucks_booked INTEGER DEFAULT 0,
  vans_available INTEGER DEFAULT 3,
  vans_booked INTEGER DEFAULT 0,
  is_blocked BOOLEAN DEFAULT false,
  block_reason TEXT,
  jobs_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacity_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE contingency_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicles' AND policyname = 'Admin full access to vehicles') THEN
    CREATE POLICY "Admin full access to vehicles" ON vehicles FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crews' AND policyname = 'Admin full access to crews') THEN
    CREATE POLICY "Admin full access to crews" ON crews FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scheduled_jobs' AND policyname = 'Admin full access to scheduled_jobs') THEN
    CREATE POLICY "Admin full access to scheduled_jobs" ON scheduled_jobs FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'capacity_slots' AND policyname = 'Admin full access to capacity_slots') THEN
    CREATE POLICY "Admin full access to capacity_slots" ON capacity_slots FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contingency_events' AND policyname = 'Admin full access to contingency_events') THEN
    CREATE POLICY "Admin full access to contingency_events" ON contingency_events FOR ALL USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_date ON scheduled_jobs(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status ON scheduled_jobs(status);
CREATE INDEX IF NOT EXISTS idx_capacity_slots_date ON capacity_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_contingency_events_status ON contingency_events(status);
CREATE INDEX IF NOT EXISTS idx_crews_status ON crews(status);
    `,
  },
]

async function runMigrations() {
  console.log("Starting database migrations...\n")

  for (const migration of migrations) {
    console.log(`Running migration: ${migration.name}`)

    try {
      const { error } = await supabase.rpc("exec_sql", { sql: migration.sql })

      if (error) {
        // Try direct query if RPC doesn't exist
        const { error: directError } = await supabase.from("_migrations").select("*").limit(1)

        // If we can't use RPC, we'll need to run SQL directly
        // This requires the postgres connection or SQL editor
        console.log(`  ⚠️  Migration ${migration.name} needs to be run manually in SQL Editor`)
        console.log(`     Error: ${error.message}`)
      } else {
        console.log(`  ✓ Migration ${migration.name} completed successfully`)
      }
    } catch (err) {
      console.log(`  ⚠️  Migration ${migration.name} needs manual execution`)
      console.log(`     ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  console.log("\nMigration process complete.")
  console.log("If any migrations failed, run them manually using the SQL files in /scripts/")
}

runMigrations()
