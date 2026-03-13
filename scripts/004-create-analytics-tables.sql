-- Create conversation analytics table
CREATE TABLE IF NOT EXISTS conversation_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
  completion_status TEXT DEFAULT 'in_progress',
  conversion_funnel JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create escalation tickets table
CREATE TABLE IF NOT EXISTS escalation_tickets (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  urgency TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  customer_data JSONB,
  conversation_summary TEXT,
  error_count INTEGER DEFAULT 0,
  stage TEXT,
  assigned_agent TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_conversation_id ON conversation_analytics(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_start_time ON conversation_analytics(start_time);
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_completion_status ON conversation_analytics(completion_status);
CREATE INDEX IF NOT EXISTS idx_escalation_tickets_status ON escalation_tickets(status);
CREATE INDEX IF NOT EXISTS idx_escalation_tickets_urgency ON escalation_tickets(urgency);
CREATE INDEX IF NOT EXISTS idx_escalation_tickets_created_at ON escalation_tickets(created_at);

-- Enable RLS
ALTER TABLE conversation_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_tickets ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access
CREATE POLICY "Service role can manage conversation_analytics" ON conversation_analytics
  FOR ALL USING (true);

CREATE POLICY "Service role can manage escalation_tickets" ON escalation_tickets
  FOR ALL USING (true);
