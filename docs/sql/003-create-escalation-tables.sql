-- Create escalation tickets table for human handoff tracking
CREATE TABLE IF NOT EXISTS escalation_tickets (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'multiple_errors',
    'customer_request', 
    'payment_issue',
    'complex_requirements',
    'extended_idle',
    'negative_sentiment',
    'technical_failure'
  )),
  urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'resolved')),
  customer_data JSONB,
  conversation_summary TEXT,
  error_count INTEGER DEFAULT 0,
  stage TEXT,
  assigned_agent TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Create conversation analytics table
CREATE TABLE IF NOT EXISTS conversation_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_ms INTEGER,
  message_count INTEGER DEFAULT 0,
  user_message_count INTEGER DEFAULT 0,
  assistant_message_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  stage_progression TEXT[] DEFAULT '{}',
  completion_status TEXT CHECK (completion_status IN ('in_progress', 'completed', 'abandoned', 'escalated')),
  -- Conversion funnel
  started_conversation BOOLEAN DEFAULT true,
  business_identified BOOLEAN DEFAULT false,
  service_selected BOOLEAN DEFAULT false,
  quote_generated BOOLEAN DEFAULT false,
  date_selected BOOLEAN DEFAULT false,
  contact_collected BOOLEAN DEFAULT false,
  payment_initiated BOOLEAN DEFAULT false,
  payment_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create session recovery table for server-side persistence
CREATE TABLE IF NOT EXISTS conversation_sessions (
  conversation_id TEXT PRIMARY KEY,
  context JSONB NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 2,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_escalation_status ON escalation_tickets(status);
CREATE INDEX IF NOT EXISTS idx_escalation_urgency ON escalation_tickets(urgency);
CREATE INDEX IF NOT EXISTS idx_escalation_created ON escalation_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_conversation ON conversation_analytics(conversation_id);
CREATE INDEX IF NOT EXISTS idx_analytics_status ON conversation_analytics(completion_status);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON conversation_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON conversation_sessions(expires_at);

-- Trigger to update updated_at on escalation tickets
CREATE OR REPLACE FUNCTION update_escalation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS escalation_updated_at ON escalation_tickets;
CREATE TRIGGER escalation_updated_at
  BEFORE UPDATE ON escalation_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_escalation_updated_at();

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM conversation_sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE escalation_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access to escalation_tickets" ON escalation_tickets
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to conversation_analytics" ON conversation_analytics
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to conversation_sessions" ON conversation_sessions
  FOR ALL USING (true) WITH CHECK (true);
