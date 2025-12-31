-- =============================================================================
-- M&M COMMERCIAL MOVING - REMAINING MIGRATIONS (008-009)
-- Tables 003-007 already exist in database
-- Run this file to create Oracle and Nexus agent tables
-- =============================================================================

-- =============================================================================
-- MIGRATION 008: ORACLE ANALYTICS TABLES
-- =============================================================================

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

-- RLS for Oracle tables
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

-- RLS for Nexus tables
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
SELECT 'Migrations 008-009 (Oracle Analytics + Nexus Operations) completed!' AS status;
