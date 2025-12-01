-- =============================================================================
-- AI AGENTS DATABASE SCHEMA
-- Migration: Create core agent tables for M&M Commercial Moving AI Salesforce
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector"; -- For embeddings/RAG

-- =============================================================================
-- AGENT CONVERSATIONS TABLE
-- Stores conversation history and context for each agent interaction
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  customer_id UUID,
  booking_id UUID,
  
  -- Conversation metadata
  agent_codename TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'web', -- web, phone, sms, email
  status TEXT NOT NULL DEFAULT 'active', -- active, ended, escalated, transferred
  
  -- Conversation data
  conversation_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  shared_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Metrics
  messages_count INTEGER DEFAULT 0,
  response_time_avg_ms INTEGER,
  sentiment_score DECIMAL(3,2), -- -1.00 to 1.00
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for agent_conversations
CREATE INDEX idx_conversations_agent ON agent_conversations(agent_codename);
CREATE INDEX idx_conversations_lead ON agent_conversations(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX idx_conversations_customer ON agent_conversations(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_conversations_status ON agent_conversations(status);
CREATE INDEX idx_conversations_started ON agent_conversations(started_at DESC);
CREATE INDEX idx_conversations_channel ON agent_conversations(channel);

-- =============================================================================
-- AGENT MESSAGES TABLE
-- Individual messages within conversations for detailed analysis
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  
  -- Message data
  role TEXT NOT NULL, -- user, assistant, system, tool
  content TEXT NOT NULL,
  agent_codename TEXT,
  
  -- Tool calls
  tool_calls JSONB,
  tool_results JSONB,
  
  -- Analysis
  sentiment DECIMAL(3,2),
  intent TEXT,
  entities JSONB,
  
  -- Metrics
  response_time_ms INTEGER,
  tokens_used INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for agent_messages
CREATE INDEX idx_messages_conversation ON agent_messages(conversation_id);
CREATE INDEX idx_messages_created ON agent_messages(created_at DESC);
CREATE INDEX idx_messages_role ON agent_messages(role);

-- =============================================================================
-- AGENT KNOWLEDGE BASE TABLE
-- Stores agent-specific knowledge and embeddings for RAG
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_knowledge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Classification
  agent_codename TEXT, -- NULL = shared knowledge
  knowledge_type TEXT NOT NULL, -- faq, product, policy, procedure, competitor
  category TEXT,
  
  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  
  -- Vector embedding for semantic search
  embedding VECTOR(1536), -- OpenAI text-embedding-3-small dimension
  
  -- Metadata
  source TEXT,
  source_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for agent_knowledge
CREATE INDEX idx_knowledge_agent ON agent_knowledge(agent_codename);
CREATE INDEX idx_knowledge_type ON agent_knowledge(knowledge_type);
CREATE INDEX idx_knowledge_category ON agent_knowledge(category);
CREATE INDEX idx_knowledge_active ON agent_knowledge(is_active) WHERE is_active = TRUE;

-- Vector similarity search index (requires pgvector)
CREATE INDEX idx_knowledge_embedding ON agent_knowledge 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- =============================================================================
-- AGENT ESCALATIONS TABLE
-- Tracks escalations from AI agents to human agents
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_escalations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  conversation_id UUID REFERENCES agent_conversations(id) ON DELETE SET NULL,
  from_agent TEXT NOT NULL,
  to_agent TEXT, -- NULL = human
  assigned_to TEXT, -- human agent ID
  
  -- Escalation details
  reason TEXT NOT NULL, -- negative_sentiment, high_value_deal, compliance_issue, etc
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
  summary TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, assigned, in_progress, resolved, cancelled
  
  -- Resolution
  resolution TEXT,
  resolution_notes TEXT,
  resolved_by TEXT,
  
  -- Metrics
  time_to_assign_ms INTEGER,
  time_to_resolve_ms INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for agent_escalations
CREATE INDEX idx_escalations_status ON agent_escalations(status);
CREATE INDEX idx_escalations_priority ON agent_escalations(priority);
CREATE INDEX idx_escalations_from_agent ON agent_escalations(from_agent);
CREATE INDEX idx_escalations_assigned ON agent_escalations(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_escalations_created ON agent_escalations(created_at DESC);

-- =============================================================================
-- AGENT METRICS TABLE
-- Aggregated metrics for agent performance tracking
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Grouping
  agent_codename TEXT NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  period_type TEXT NOT NULL, -- hourly, daily, weekly, monthly
  
  -- Volume metrics
  conversations_total INTEGER DEFAULT 0,
  conversations_completed INTEGER DEFAULT 0,
  conversations_escalated INTEGER DEFAULT 0,
  messages_total INTEGER DEFAULT 0,
  
  -- Quality metrics
  avg_response_time_ms INTEGER,
  avg_conversation_duration_ms INTEGER,
  success_rate DECIMAL(5,2),
  escalation_rate DECIMAL(5,2),
  
  -- Sentiment metrics
  avg_sentiment DECIMAL(3,2),
  positive_conversations INTEGER DEFAULT 0,
  negative_conversations INTEGER DEFAULT 0,
  
  -- Business metrics
  quotes_generated INTEGER DEFAULT 0,
  leads_qualified INTEGER DEFAULT 0,
  bookings_created INTEGER DEFAULT 0,
  revenue_influenced DECIMAL(12,2) DEFAULT 0,
  
  -- Resource metrics
  tokens_used INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for agent_metrics
CREATE UNIQUE INDEX idx_metrics_unique ON agent_metrics(agent_codename, period_start, period_type);
CREATE INDEX idx_metrics_agent ON agent_metrics(agent_codename);
CREATE INDEX idx_metrics_period ON agent_metrics(period_start DESC);
CREATE INDEX idx_metrics_type ON agent_metrics(period_type);

-- =============================================================================
-- AGENT AUDIT LOG TABLE
-- Security and compliance audit trail
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Actor
  agent_codename TEXT,
  user_id UUID,
  
  -- Action
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  
  -- Details
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  
  -- Outcome
  outcome TEXT NOT NULL, -- success, failure, denied
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for audit log
CREATE INDEX idx_audit_agent ON agent_audit_log(agent_codename);
CREATE INDEX idx_audit_action ON agent_audit_log(action);
CREATE INDEX idx_audit_resource ON agent_audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_created ON agent_audit_log(created_at DESC);
CREATE INDEX idx_audit_outcome ON agent_audit_log(outcome);

-- Partition by month for performance (optional, depends on volume)
-- CREATE INDEX idx_audit_created_month ON agent_audit_log(date_trunc('month', created_at));

-- =============================================================================
-- AGENT QA AUDITS TABLE
-- Quality assurance audit records
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_qa_audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  conversation_id UUID REFERENCES agent_conversations(id) ON DELETE SET NULL,
  agent_codename TEXT NOT NULL,
  
  -- Scores (0-100)
  accuracy_score INTEGER,
  tone_score INTEGER,
  compliance_score INTEGER,
  completeness_score INTEGER,
  empathy_score INTEGER,
  overall_score INTEGER NOT NULL,
  
  -- Details
  issues JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  
  -- Auditor
  audited_by TEXT NOT NULL DEFAULT 'GUARDIAN_QA',
  manual_review BOOLEAN DEFAULT FALSE,
  reviewed_by TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for QA audits
CREATE INDEX idx_qa_agent ON agent_qa_audits(agent_codename);
CREATE INDEX idx_qa_score ON agent_qa_audits(overall_score);
CREATE INDEX idx_qa_created ON agent_qa_audits(created_at DESC);
CREATE INDEX idx_qa_needs_review ON agent_qa_audits(manual_review, reviewed_at) 
  WHERE manual_review = TRUE AND reviewed_at IS NULL;

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON agent_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_updated_at
  BEFORE UPDATE ON agent_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escalations_updated_at
  BEFORE UPDATE ON agent_escalations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment message count on conversation
CREATE OR REPLACE FUNCTION increment_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE agent_conversations 
  SET messages_count = messages_count + 1
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_conversation_messages
  AFTER INSERT ON agent_messages
  FOR EACH ROW EXECUTE FUNCTION increment_message_count();

-- Function for semantic search in knowledge base
CREATE OR REPLACE FUNCTION search_agent_knowledge(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_agent TEXT DEFAULT NULL,
  filter_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  agent_codename TEXT,
  knowledge_type TEXT,
  title TEXT,
  content TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    k.id,
    k.agent_codename,
    k.knowledge_type,
    k.title,
    k.content,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM agent_knowledge k
  WHERE 
    k.is_active = TRUE
    AND (filter_agent IS NULL OR k.agent_codename = filter_agent OR k.agent_codename IS NULL)
    AND (filter_type IS NULL OR k.knowledge_type = filter_type)
    AND 1 - (k.embedding <=> query_embedding) > match_threshold
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_audit_log ENABLE ROW LEVEL SECURITY;

-- Policies for service role (backend) - full access
CREATE POLICY "Service role has full access to conversations"
  ON agent_conversations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to messages"
  ON agent_messages FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to escalations"
  ON agent_escalations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to audit log"
  ON agent_audit_log FOR ALL
  USING (auth.role() = 'service_role');

-- Policies for authenticated users (customers) - limited access
CREATE POLICY "Customers can view their own conversations"
  ON agent_conversations FOR SELECT
  USING (
    auth.role() = 'authenticated' 
    AND customer_id = auth.uid()
  );

CREATE POLICY "Customers can view messages in their conversations"
  ON agent_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent_conversations c
      WHERE c.id = agent_messages.conversation_id
      AND c.customer_id = auth.uid()
    )
  );

-- =============================================================================
-- INITIAL DATA
-- =============================================================================

-- Insert shared knowledge base entries
INSERT INTO agent_knowledge (knowledge_type, category, title, content, source)
VALUES 
  ('faq', 'general', 'Service Areas', 'M&M Commercial Moving operates throughout Melbourne metropolitan area, including CBD, inner suburbs, and outer suburbs up to 50km from city center.', 'website'),
  ('faq', 'pricing', 'Quote Process', 'We provide free quotes within 24 hours. Our pricing is based on move size (sqm), distance, and any additional services required.', 'website'),
  ('policy', 'booking', 'Deposit Policy', 'A 50% deposit is required to confirm all bookings. The remaining balance is due upon completion of the move.', 'internal'),
  ('policy', 'cancellation', 'Cancellation Policy', 'Cancellations made more than 7 days before the move receive a full refund. Within 7 days, a 50% cancellation fee applies.', 'internal'),
  ('procedure', 'support', 'Escalation Procedure', 'For urgent issues, escalate immediately to human support. For complex pricing or custom requirements, transfer to sales team.', 'internal')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE agent_conversations IS 'Stores AI agent conversation sessions with customers';
COMMENT ON TABLE agent_messages IS 'Individual messages within agent conversations';
COMMENT ON TABLE agent_knowledge IS 'Knowledge base for agent RAG (retrieval augmented generation)';
COMMENT ON TABLE agent_escalations IS 'Escalation tickets from AI to human agents';
COMMENT ON TABLE agent_metrics IS 'Aggregated performance metrics per agent per period';
COMMENT ON TABLE agent_audit_log IS 'Security and compliance audit trail';
COMMENT ON TABLE agent_qa_audits IS 'Quality assurance audit records for conversations';
