-- Create escalation tickets table for human handoff
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
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'resolved', 'closed')),
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
  session_id TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  final_stage TEXT,
  converted BOOLEAN DEFAULT FALSE,
  quote_amount NUMERIC,
  deposit_paid BOOLEAN DEFAULT FALSE,
  error_count INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  escalated BOOLEAN DEFAULT FALSE,
  escalation_reason TEXT,
  recovery_attempted BOOLEAN DEFAULT FALSE,
  recovery_successful BOOLEAN,
  user_agent TEXT,
  device_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create conversation stage history for funnel analysis
CREATE TABLE IF NOT EXISTS conversation_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exited_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  error_occurred BOOLEAN DEFAULT FALSE,
  user_messages_in_stage INTEGER DEFAULT 0
);

-- Create re-engagement messages log
CREATE TABLE IF NOT EXISTS reengagement_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('idle_warning', 'idle_final', 'recovery_offer', 'special_offer')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_responded BOOLEAN DEFAULT FALSE,
  responded_at TIMESTAMPTZ
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_escalation_tickets_status ON escalation_tickets(status);
CREATE INDEX IF NOT EXISTS idx_escalation_tickets_urgency ON escalation_tickets(urgency);
CREATE INDEX IF NOT EXISTS idx_escalation_tickets_created ON escalation_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_conv_id ON conversation_analytics(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_started ON conversation_analytics(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_converted ON conversation_analytics(converted);
CREATE INDEX IF NOT EXISTS idx_stage_history_conv_id ON conversation_stage_history(conversation_id);
CREATE INDEX IF NOT EXISTS idx_reengagement_conv_id ON reengagement_messages(conversation_id);

-- Enable RLS
ALTER TABLE escalation_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reengagement_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for escalation_tickets
CREATE POLICY "Allow service role full access to escalation_tickets"
  ON escalation_tickets FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated read escalation_tickets"
  ON escalation_tickets FOR SELECT
  TO authenticated
  USING (true);

-- RLS policies for conversation_analytics  
CREATE POLICY "Allow service role full access to conversation_analytics"
  ON conversation_analytics FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public insert conversation_analytics"
  ON conversation_analytics FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow authenticated read conversation_analytics"
  ON conversation_analytics FOR SELECT
  TO authenticated
  USING (true);

-- RLS policies for conversation_stage_history
CREATE POLICY "Allow service role full access to stage_history"
  ON conversation_stage_history FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public insert stage_history"
  ON conversation_stage_history FOR INSERT
  TO anon
  WITH CHECK (true);

-- RLS policies for reengagement_messages
CREATE POLICY "Allow service role full access to reengagement"
  ON reengagement_messages FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public insert reengagement"
  ON reengagement_messages FOR INSERT
  TO anon
  WITH CHECK (true);
