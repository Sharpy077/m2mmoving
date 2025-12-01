-- =============================================================================
-- AI SALESFORCE DATABASE SCHEMA
-- Supabase/PostgreSQL schema for agent state and memory
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- AGENT CONVERSATIONS
-- Stores conversation history with agents
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_codename VARCHAR(50) NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'chat', -- chat, email, phone, sms
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, closed, archived
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversations_agent ON agent_conversations(agent_codename);
CREATE INDEX idx_conversations_customer ON agent_conversations(customer_id);
CREATE INDEX idx_conversations_lead ON agent_conversations(lead_id);
CREATE INDEX idx_conversations_status ON agent_conversations(status);

-- =============================================================================
-- AGENT MESSAGES
-- Individual messages within conversations
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- user, assistant, system, tool
  content TEXT NOT NULL,
  agent_codename VARCHAR(50),
  tool_name VARCHAR(100),
  tool_result JSONB,
  metadata JSONB DEFAULT '{}',
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON agent_messages(conversation_id);
CREATE INDEX idx_messages_created ON agent_messages(created_at);

-- =============================================================================
-- AGENT HANDOFFS
-- Tracks handoffs between agents
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_handoffs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_agent VARCHAR(50) NOT NULL,
  to_agent VARCHAR(50) NOT NULL,
  conversation_id UUID REFERENCES agent_conversations(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, accepted, completed, rejected
  context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_handoffs_from ON agent_handoffs(from_agent);
CREATE INDEX idx_handoffs_to ON agent_handoffs(to_agent);
CREATE INDEX idx_handoffs_status ON agent_handoffs(status);

-- =============================================================================
-- AGENT ESCALATIONS
-- Human escalation requests
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_escalations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_agent VARCHAR(50) NOT NULL,
  reason VARCHAR(100) NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  conversation_id UUID REFERENCES agent_conversations(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  ticket_id UUID,
  summary TEXT NOT NULL,
  suggested_action TEXT,
  context JSONB DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, assigned, in_progress, resolved
  assigned_to VARCHAR(255),
  resolution TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_escalations_agent ON agent_escalations(from_agent);
CREATE INDEX idx_escalations_status ON agent_escalations(status);
CREATE INDEX idx_escalations_priority ON agent_escalations(priority);

-- =============================================================================
-- AGENT INSIGHTS
-- AI-generated insights and recommendations
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_codename VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL, -- opportunity, alert, recommendation
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  actionable BOOLEAN DEFAULT true,
  suggested_action TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, acknowledged, actioned, dismissed
  actioned_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actioned_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_insights_agent ON agent_insights(agent_codename);
CREATE INDEX idx_insights_type ON agent_insights(type);
CREATE INDEX idx_insights_status ON agent_insights(status);
CREATE INDEX idx_insights_priority ON agent_insights(priority);

-- =============================================================================
-- AGENT LOGS
-- Activity and debug logging
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_codename VARCHAR(50) NOT NULL,
  level VARCHAR(10) NOT NULL, -- debug, info, warn, error
  action VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  conversation_id UUID REFERENCES agent_conversations(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  duration_ms INTEGER,
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_logs_agent ON agent_logs(agent_codename);
CREATE INDEX idx_logs_level ON agent_logs(level);
CREATE INDEX idx_logs_action ON agent_logs(action);
CREATE INDEX idx_logs_created ON agent_logs(created_at);

-- Partition logs by month for performance
-- (In production, implement table partitioning)

-- =============================================================================
-- AGENT METRICS
-- Performance metrics per agent
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_codename VARCHAR(50) NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  interactions INTEGER DEFAULT 0,
  successful_interactions INTEGER DEFAULT 0,
  failed_interactions INTEGER DEFAULT 0,
  escalations INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  total_tokens_used INTEGER DEFAULT 0,
  total_cost_cents INTEGER DEFAULT 0,
  customer_satisfaction NUMERIC(3,2),
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_metrics_agent_period ON agent_metrics(agent_codename, period_start);
CREATE INDEX idx_metrics_period ON agent_metrics(period_start, period_end);

-- =============================================================================
-- PROSPECTS (for HUNTER)
-- Prospecting and lead generation data
-- =============================================================================

CREATE TABLE IF NOT EXISTS prospects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name VARCHAR(255) NOT NULL,
  abn VARCHAR(20),
  website VARCHAR(255),
  industry VARCHAR(100),
  employee_count VARCHAR(50),
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_linkedin VARCHAR(255),
  source VARCHAR(100) NOT NULL,
  source_detail TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'new', -- new, enriched, qualified, contacted, engaged, converted, lost
  score INTEGER DEFAULT 0,
  enriched_data JSONB DEFAULT '{}',
  outreach_history JSONB DEFAULT '[]',
  notes TEXT,
  converted_to_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_prospects_company ON prospects(company_name);
CREATE INDEX idx_prospects_status ON prospects(status);
CREATE INDEX idx_prospects_score ON prospects(score DESC);
CREATE INDEX idx_prospects_source ON prospects(source);

-- =============================================================================
-- INTENT SIGNALS (for HUNTER)
-- Detected intent signals for prospects
-- =============================================================================

CREATE TABLE IF NOT EXISTS intent_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  signal_type VARCHAR(100) NOT NULL,
  confidence INTEGER NOT NULL, -- 0-100
  source VARCHAR(255) NOT NULL,
  timing VARCHAR(50) NOT NULL, -- immediate, near_term, future
  details JSONB DEFAULT '{}',
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_signals_prospect ON intent_signals(prospect_id);
CREATE INDEX idx_signals_type ON intent_signals(signal_type);
CREATE INDEX idx_signals_processed ON intent_signals(processed);

-- =============================================================================
-- CONTENT (for AURORA)
-- Marketing content library
-- =============================================================================

CREATE TABLE IF NOT EXISTS marketing_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL, -- blog, social, email, ad, landing_page
  platform VARCHAR(50), -- linkedin, facebook, instagram, email, website
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  keywords JSONB DEFAULT '[]',
  hashtags JSONB DEFAULT '[]',
  image_url VARCHAR(500),
  image_prompt TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, scheduled, published, archived
  scheduled_for TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  campaign_id UUID,
  metrics JSONB DEFAULT '{}',
  created_by VARCHAR(50) DEFAULT 'AURORA_MKT',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_content_type ON marketing_content(type);
CREATE INDEX idx_content_platform ON marketing_content(platform);
CREATE INDEX idx_content_status ON marketing_content(status);
CREATE INDEX idx_content_scheduled ON marketing_content(scheduled_for);

-- =============================================================================
-- CAMPAIGNS (for AURORA)
-- Marketing campaigns
-- =============================================================================

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- awareness, lead_gen, conversion, retention
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, active, paused, completed
  channels JSONB DEFAULT '[]',
  target_audience JSONB DEFAULT '[]',
  budget INTEGER, -- in cents
  spent INTEGER DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  metrics JSONB DEFAULT '{}',
  created_by VARCHAR(50) DEFAULT 'AURORA_MKT',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_campaigns_status ON marketing_campaigns(status);
CREATE INDEX idx_campaigns_type ON marketing_campaigns(type);

-- =============================================================================
-- SUPPORT TICKETS (for SENTINEL)
-- Customer support tickets
-- =============================================================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  booking_id UUID,
  conversation_id UUID REFERENCES agent_conversations(id) ON DELETE SET NULL,
  category VARCHAR(50) NOT NULL, -- inquiry, booking, complaint, damage, refund, other
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  status VARCHAR(50) NOT NULL DEFAULT 'open', -- open, pending, in_progress, resolved, closed
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  assigned_agent VARCHAR(50) DEFAULT 'SENTINEL_CS',
  escalated_to VARCHAR(255),
  resolution TEXT,
  satisfaction_rating INTEGER, -- 1-5
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_tickets_customer ON support_tickets(customer_id);
CREATE INDEX idx_tickets_status ON support_tickets(status);
CREATE INDEX idx_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_tickets_category ON support_tickets(category);

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_conversations_timestamp
  BEFORE UPDATE ON agent_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_prospects_timestamp
  BEFORE UPDATE ON prospects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_content_timestamp
  BEFORE UPDATE ON marketing_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_campaigns_timestamp
  BEFORE UPDATE ON marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tickets_timestamp
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Enable RLS for multi-tenant security
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Policies for service role (full access)
CREATE POLICY "Service role full access" ON agent_conversations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON agent_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON agent_handoffs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON agent_escalations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON agent_insights
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON agent_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON agent_metrics
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON prospects
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON intent_signals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON marketing_content
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON marketing_campaigns
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON support_tickets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Agent performance summary view
CREATE OR REPLACE VIEW agent_performance_summary AS
SELECT 
  agent_codename,
  COUNT(*) as total_conversations,
  COUNT(DISTINCT customer_id) as unique_customers,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60) as avg_conversation_minutes
FROM agent_conversations
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY agent_codename;

-- Active escalations view
CREATE OR REPLACE VIEW active_escalations AS
SELECT 
  e.*,
  c.company_name as customer_company,
  l.contact_name as lead_name
FROM agent_escalations e
LEFT JOIN customers c ON e.customer_id = c.id
LEFT JOIN leads l ON e.lead_id = l.id
WHERE e.status IN ('pending', 'assigned', 'in_progress')
ORDER BY 
  CASE e.priority 
    WHEN 'urgent' THEN 1 
    WHEN 'high' THEN 2 
    WHEN 'medium' THEN 3 
    ELSE 4 
  END,
  e.created_at;

-- Pipeline prospects view
CREATE OR REPLACE VIEW pipeline_prospects AS
SELECT 
  p.*,
  COUNT(DISTINCT is.id) as signal_count,
  MAX(is.confidence) as max_signal_confidence
FROM prospects p
LEFT JOIN intent_signals is ON is.prospect_id = p.id
WHERE p.status NOT IN ('converted', 'lost')
GROUP BY p.id
ORDER BY p.score DESC, p.updated_at DESC;
