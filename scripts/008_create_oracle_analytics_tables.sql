-- ============================================================================
-- ORACLE AGENT ANALYTICS TABLES
-- Business intelligence, metrics, forecasting, and reporting
-- ============================================================================

-- Analytics snapshots for historical tracking
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'daily', -- daily, weekly, monthly
  
  -- Lead metrics
  leads_total INTEGER DEFAULT 0,
  leads_new INTEGER DEFAULT 0,
  leads_qualified INTEGER DEFAULT 0,
  leads_converted INTEGER DEFAULT 0,
  lead_conversion_rate NUMERIC(5,2),
  
  -- Revenue metrics
  revenue_pipeline NUMERIC(12,2) DEFAULT 0,
  revenue_closed NUMERIC(12,2) DEFAULT 0,
  revenue_forecast NUMERIC(12,2) DEFAULT 0,
  revenue_growth_percent NUMERIC(5,2),
  
  -- Channel metrics (JSONB for flexibility)
  channel_metrics JSONB DEFAULT '{}',
  
  -- Agent metrics
  agent_metrics JSONB DEFAULT '{}',
  
  -- Pipeline metrics
  pipeline_metrics JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(snapshot_date, period_type)
);

-- Generated insights storage
CREATE TABLE IF NOT EXISTS analytics_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type TEXT NOT NULL, -- trend, anomaly, recommendation, alert
  category TEXT NOT NULL, -- revenue, leads, conversion, efficiency
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Metrics that triggered the insight
  related_metrics JSONB DEFAULT '{}',
  
  -- Recommended actions
  recommendations JSONB DEFAULT '[]',
  
  -- Status tracking
  status TEXT DEFAULT 'new', -- new, acknowledged, acted_upon, dismissed
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMPTZ,
  
  -- Validity
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled reports
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  report_type TEXT NOT NULL, -- executive, marketing, sales, operations
  format TEXT NOT NULL DEFAULT 'summary', -- summary, detailed
  
  -- Schedule (cron-like)
  frequency TEXT NOT NULL, -- daily, weekly, monthly
  day_of_week INTEGER, -- 0-6 for weekly
  day_of_month INTEGER, -- 1-31 for monthly
  send_time TIME DEFAULT '08:00',
  
  -- Recipients
  recipients JSONB DEFAULT '[]', -- [{email, name}]
  
  -- Config
  include_sections JSONB DEFAULT '["metrics", "insights", "pipeline"]',
  comparison_period TEXT DEFAULT 'previous',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  next_send_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report history
CREATE TABLE IF NOT EXISTS report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_report_id UUID REFERENCES scheduled_reports(id),
  
  report_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Report content
  content JSONB NOT NULL,
  
  -- Delivery
  recipients_sent JSONB DEFAULT '[]',
  sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Forecasts
CREATE TABLE IF NOT EXISTS revenue_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_date DATE NOT NULL,
  horizon TEXT NOT NULL, -- month, quarter, year
  scenario TEXT NOT NULL DEFAULT 'base', -- conservative, base, optimistic
  
  -- Forecast values
  period_forecasts JSONB NOT NULL, -- [{period, projected, low, high}]
  total_forecast NUMERIC(12,2) NOT NULL,
  confidence_percent INTEGER,
  
  -- Assumptions
  assumptions JSONB DEFAULT '[]',
  
  -- Actuals (filled in later)
  actual_revenue NUMERIC(12,2),
  accuracy_percent NUMERIC(5,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Anomaly detections
CREATE TABLE IF NOT EXISTS detected_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  expected_value NUMERIC NOT NULL,
  deviation_percent NUMERIC(5,2) NOT NULL,
  
  severity TEXT NOT NULL, -- low, medium, high, critical
  anomaly_type TEXT NOT NULL, -- spike, drop, trend_change
  
  -- Context
  context JSONB DEFAULT '{}',
  
  -- Resolution
  status TEXT DEFAULT 'open', -- open, investigating, resolved, false_positive
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE detected_anomalies ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access to analytics_snapshots" ON analytics_snapshots FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to analytics_insights" ON analytics_insights FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to scheduled_reports" ON scheduled_reports FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to report_history" ON report_history FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to revenue_forecasts" ON revenue_forecasts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to detected_anomalies" ON detected_anomalies FOR ALL USING (auth.role() = 'service_role');

-- Authenticated read access
CREATE POLICY "Authenticated read analytics_snapshots" ON analytics_snapshots FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read analytics_insights" ON analytics_insights FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read scheduled_reports" ON scheduled_reports FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read report_history" ON report_history FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read revenue_forecasts" ON revenue_forecasts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read detected_anomalies" ON detected_anomalies FOR SELECT USING (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_date ON analytics_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_priority ON analytics_insights(priority, status);
CREATE INDEX IF NOT EXISTS idx_detected_anomalies_severity ON detected_anomalies(severity, status);
CREATE INDEX IF NOT EXISTS idx_revenue_forecasts_date ON revenue_forecasts(forecast_date DESC);
