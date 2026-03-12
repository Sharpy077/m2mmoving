-- =============================================================================
-- BRIDGE HUMAN HANDOFF AGENT TABLES
-- Escalations, callbacks, and human agent management
-- =============================================================================

-- Human Agents Table
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

-- Escalations Table (extends existing escalation_tickets)
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

-- Callbacks Table
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

-- Agent Notifications Table
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

-- Escalation History Table (for tracking all updates)
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

-- SLA Configuration Table
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

-- Insert default SLA config
INSERT INTO sla_config (priority, first_response_minutes, resolution_minutes, escalation_minutes) VALUES
  ('urgent', 15, 60, 30),
  ('high', 30, 120, 60),
  ('medium', 60, 240, 120),
  ('low', 120, 480, 240)
ON CONFLICT (priority) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_human_agents_status ON human_agents(status);
CREATE INDEX IF NOT EXISTS idx_human_agents_skills ON human_agents USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON escalations(status);
CREATE INDEX IF NOT EXISTS idx_escalations_priority ON escalations(priority);
CREATE INDEX IF NOT EXISTS idx_escalations_assigned ON escalations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_callbacks_status ON callbacks(status);
CREATE INDEX IF NOT EXISTS idx_callbacks_scheduled ON callbacks(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_agent ON agent_notifications(agent_id);
CREATE INDEX IF NOT EXISTS idx_escalation_history_escalation ON escalation_history(escalation_id);

-- RLS Policies
ALTER TABLE human_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE callbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_config ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access to human_agents" ON human_agents FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to escalations" ON escalations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to callbacks" ON callbacks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to agent_notifications" ON agent_notifications FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to escalation_history" ON escalation_history FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to sla_config" ON sla_config FOR ALL USING (auth.role() = 'service_role');

-- Authenticated read access
CREATE POLICY "Authenticated read human_agents" ON human_agents FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read escalations" ON escalations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read callbacks" ON callbacks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read agent_notifications" ON agent_notifications FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read escalation_history" ON escalation_history FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read sla_config" ON sla_config FOR SELECT USING (auth.role() = 'authenticated');

-- Insert default human agents for initial setup
INSERT INTO human_agents (name, email, role, skills, status) VALUES
  ('Sarah Kim', 'sarah@mandmmoving.com.au', 'sales_lead', ARRAY['sales', 'negotiation', 'enterprise'], 'available'),
  ('Mike Thompson', 'mike@mandmmoving.com.au', 'operations_lead', ARRAY['operations', 'scheduling', 'logistics'], 'available'),
  ('Emma Roberts', 'emma@mandmmoving.com.au', 'support_lead', ARRAY['support', 'complaints', 'retention'], 'available'),
  ('James Lee', 'james@mandmmoving.com.au', 'manager', ARRAY['sales', 'support', 'operations', 'escalation'], 'available')
ON CONFLICT DO NOTHING;
