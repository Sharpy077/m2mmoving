-- =============================================================================
-- AI AGENTS DATABASE FUNCTIONS
-- Migration: Create helper functions for agent operations
-- =============================================================================

-- =============================================================================
-- FUNCTION: CREATE NEW CONVERSATION
-- =============================================================================

CREATE OR REPLACE FUNCTION create_agent_conversation(
  p_agent_codename TEXT,
  p_channel TEXT DEFAULT 'web',
  p_lead_id UUID DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  INSERT INTO agent_conversations (
    agent_codename,
    channel,
    lead_id,
    customer_id,
    metadata,
    status
  ) VALUES (
    p_agent_codename,
    p_channel,
    p_lead_id,
    p_customer_id,
    p_metadata,
    'active'
  ) RETURNING id INTO v_conversation_id;
  
  -- Log the creation
  INSERT INTO agent_audit_log (agent_codename, action, resource_type, resource_id, outcome)
  VALUES (p_agent_codename, 'create_conversation', 'conversation', v_conversation_id::TEXT, 'success');
  
  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_agent_conversation IS 'Creates a new agent conversation with audit logging';

-- =============================================================================
-- FUNCTION: ADD MESSAGE TO CONVERSATION
-- =============================================================================

CREATE OR REPLACE FUNCTION add_conversation_message(
  p_conversation_id UUID,
  p_role TEXT,
  p_content TEXT,
  p_agent_codename TEXT DEFAULT NULL,
  p_tool_calls JSONB DEFAULT NULL,
  p_tool_results JSONB DEFAULT NULL,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_tokens_used INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
  v_conversation_history JSONB;
BEGIN
  -- Insert the message
  INSERT INTO agent_messages (
    conversation_id,
    role,
    content,
    agent_codename,
    tool_calls,
    tool_results,
    response_time_ms,
    tokens_used
  ) VALUES (
    p_conversation_id,
    p_role,
    p_content,
    p_agent_codename,
    p_tool_calls,
    p_tool_results,
    p_response_time_ms,
    p_tokens_used
  ) RETURNING id INTO v_message_id;
  
  -- Update conversation history JSON
  SELECT conversation_history INTO v_conversation_history
  FROM agent_conversations WHERE id = p_conversation_id;
  
  v_conversation_history := v_conversation_history || jsonb_build_object(
    'id', v_message_id,
    'role', p_role,
    'content', p_content,
    'timestamp', NOW()
  );
  
  UPDATE agent_conversations 
  SET conversation_history = v_conversation_history
  WHERE id = p_conversation_id;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION add_conversation_message IS 'Adds a message to a conversation and updates history';

-- =============================================================================
-- FUNCTION: END CONVERSATION
-- =============================================================================

CREATE OR REPLACE FUNCTION end_conversation(
  p_conversation_id UUID,
  p_status TEXT DEFAULT 'ended',
  p_sentiment_score DECIMAL DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_agent_codename TEXT;
  v_avg_response_time INTEGER;
BEGIN
  -- Calculate average response time for assistant messages
  SELECT AVG(response_time_ms)::INTEGER INTO v_avg_response_time
  FROM agent_messages
  WHERE conversation_id = p_conversation_id
    AND role = 'assistant'
    AND response_time_ms IS NOT NULL;
  
  -- Update conversation
  UPDATE agent_conversations
  SET 
    status = p_status,
    ended_at = NOW(),
    sentiment_score = COALESCE(p_sentiment_score, sentiment_score),
    response_time_avg_ms = v_avg_response_time
  WHERE id = p_conversation_id
  RETURNING agent_codename INTO v_agent_codename;
  
  -- Log the end
  INSERT INTO agent_audit_log (agent_codename, action, resource_type, resource_id, details, outcome)
  VALUES (
    v_agent_codename, 
    'end_conversation', 
    'conversation', 
    p_conversation_id::TEXT,
    jsonb_build_object('status', p_status, 'sentiment', p_sentiment_score),
    'success'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION end_conversation IS 'Ends a conversation and calculates final metrics';

-- =============================================================================
-- FUNCTION: CREATE ESCALATION
-- =============================================================================

CREATE OR REPLACE FUNCTION create_escalation(
  p_from_agent TEXT,
  p_reason TEXT,
  p_priority TEXT DEFAULT 'medium',
  p_conversation_id UUID DEFAULT NULL,
  p_summary TEXT DEFAULT NULL,
  p_context JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_escalation_id UUID;
BEGIN
  INSERT INTO agent_escalations (
    from_agent,
    reason,
    priority,
    conversation_id,
    summary,
    context,
    status
  ) VALUES (
    p_from_agent,
    p_reason,
    p_priority,
    p_conversation_id,
    p_summary,
    p_context,
    'pending'
  ) RETURNING id INTO v_escalation_id;
  
  -- Update conversation status if linked
  IF p_conversation_id IS NOT NULL THEN
    UPDATE agent_conversations
    SET status = 'escalated'
    WHERE id = p_conversation_id;
  END IF;
  
  -- Log the escalation
  INSERT INTO agent_audit_log (agent_codename, action, resource_type, resource_id, details, outcome)
  VALUES (
    p_from_agent, 
    'create_escalation', 
    'escalation', 
    v_escalation_id::TEXT,
    jsonb_build_object('reason', p_reason, 'priority', p_priority),
    'success'
  );
  
  RETURN v_escalation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_escalation IS 'Creates an escalation ticket from an agent';

-- =============================================================================
-- FUNCTION: ASSIGN ESCALATION
-- =============================================================================

CREATE OR REPLACE FUNCTION assign_escalation(
  p_escalation_id UUID,
  p_assigned_to TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_time_to_assign INTEGER;
BEGIN
  -- Calculate time to assign
  SELECT EXTRACT(EPOCH FROM (NOW() - created_at))::INTEGER * 1000
  INTO v_time_to_assign
  FROM agent_escalations
  WHERE id = p_escalation_id;
  
  UPDATE agent_escalations
  SET 
    assigned_to = p_assigned_to,
    assigned_at = NOW(),
    status = 'assigned',
    time_to_assign_ms = v_time_to_assign
  WHERE id = p_escalation_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION assign_escalation IS 'Assigns an escalation to a human agent';

-- =============================================================================
-- FUNCTION: RESOLVE ESCALATION
-- =============================================================================

CREATE OR REPLACE FUNCTION resolve_escalation(
  p_escalation_id UUID,
  p_resolution TEXT,
  p_resolved_by TEXT,
  p_resolution_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_time_to_resolve INTEGER;
BEGIN
  -- Calculate time to resolve
  SELECT EXTRACT(EPOCH FROM (NOW() - created_at))::INTEGER * 1000
  INTO v_time_to_resolve
  FROM agent_escalations
  WHERE id = p_escalation_id;
  
  UPDATE agent_escalations
  SET 
    resolution = p_resolution,
    resolved_by = p_resolved_by,
    resolution_notes = p_resolution_notes,
    resolved_at = NOW(),
    status = 'resolved',
    time_to_resolve_ms = v_time_to_resolve
  WHERE id = p_escalation_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION resolve_escalation IS 'Resolves an escalation ticket';

-- =============================================================================
-- FUNCTION: RECORD QA AUDIT
-- =============================================================================

CREATE OR REPLACE FUNCTION record_qa_audit(
  p_conversation_id UUID,
  p_agent_codename TEXT,
  p_accuracy_score INTEGER,
  p_tone_score INTEGER,
  p_compliance_score INTEGER,
  p_completeness_score INTEGER,
  p_empathy_score INTEGER,
  p_issues JSONB DEFAULT '[]'::jsonb,
  p_recommendations JSONB DEFAULT '[]'::jsonb,
  p_notes TEXT DEFAULT NULL,
  p_audited_by TEXT DEFAULT 'GUARDIAN_QA'
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
  v_overall_score INTEGER;
BEGIN
  -- Calculate overall score (weighted average)
  v_overall_score := ROUND(
    (p_accuracy_score * 0.25 +
     p_tone_score * 0.20 +
     p_compliance_score * 0.25 +
     p_completeness_score * 0.20 +
     p_empathy_score * 0.10)
  );
  
  INSERT INTO agent_qa_audits (
    conversation_id,
    agent_codename,
    accuracy_score,
    tone_score,
    compliance_score,
    completeness_score,
    empathy_score,
    overall_score,
    issues,
    recommendations,
    notes,
    audited_by,
    manual_review
  ) VALUES (
    p_conversation_id,
    p_agent_codename,
    p_accuracy_score,
    p_tone_score,
    p_compliance_score,
    p_completeness_score,
    p_empathy_score,
    v_overall_score,
    p_issues,
    p_recommendations,
    p_notes,
    p_audited_by,
    v_overall_score < 70 -- Flag for manual review if below threshold
  ) RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION record_qa_audit IS 'Records a QA audit for a conversation';

-- =============================================================================
-- FUNCTION: AGGREGATE METRICS
-- =============================================================================

CREATE OR REPLACE FUNCTION aggregate_agent_metrics(
  p_agent_codename TEXT,
  p_period_type TEXT, -- hourly, daily, weekly, monthly
  p_period_start TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_period_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate period end
  v_period_end := CASE p_period_type
    WHEN 'hourly' THEN p_period_start + INTERVAL '1 hour'
    WHEN 'daily' THEN p_period_start + INTERVAL '1 day'
    WHEN 'weekly' THEN p_period_start + INTERVAL '1 week'
    WHEN 'monthly' THEN p_period_start + INTERVAL '1 month'
  END;
  
  INSERT INTO agent_metrics (
    agent_codename,
    period_start,
    period_end,
    period_type,
    conversations_total,
    conversations_completed,
    conversations_escalated,
    messages_total,
    avg_response_time_ms,
    avg_sentiment,
    positive_conversations,
    negative_conversations
  )
  SELECT 
    p_agent_codename,
    p_period_start,
    v_period_end,
    p_period_type,
    COUNT(*),
    COUNT(CASE WHEN status = 'ended' THEN 1 END),
    COUNT(CASE WHEN status = 'escalated' THEN 1 END),
    SUM(messages_count),
    AVG(response_time_avg_ms)::INTEGER,
    AVG(sentiment_score),
    COUNT(CASE WHEN sentiment_score > 0.3 THEN 1 END),
    COUNT(CASE WHEN sentiment_score < -0.3 THEN 1 END)
  FROM agent_conversations
  WHERE agent_codename = p_agent_codename
    AND started_at >= p_period_start
    AND started_at < v_period_end
  ON CONFLICT (agent_codename, period_start, period_type) 
  DO UPDATE SET
    conversations_total = EXCLUDED.conversations_total,
    conversations_completed = EXCLUDED.conversations_completed,
    conversations_escalated = EXCLUDED.conversations_escalated,
    messages_total = EXCLUDED.messages_total,
    avg_response_time_ms = EXCLUDED.avg_response_time_ms,
    avg_sentiment = EXCLUDED.avg_sentiment,
    positive_conversations = EXCLUDED.positive_conversations,
    negative_conversations = EXCLUDED.negative_conversations;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION aggregate_agent_metrics IS 'Aggregates metrics for an agent for a specific period';

-- =============================================================================
-- FUNCTION: GET AGENT STATS
-- =============================================================================

CREATE OR REPLACE FUNCTION get_agent_stats(
  p_agent_codename TEXT,
  p_days INTEGER DEFAULT 30
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'agent', p_agent_codename,
    'period_days', p_days,
    'conversations', jsonb_build_object(
      'total', COUNT(*),
      'completed', COUNT(CASE WHEN status = 'ended' THEN 1 END),
      'escalated', COUNT(CASE WHEN status = 'escalated' THEN 1 END),
      'active', COUNT(CASE WHEN status = 'active' THEN 1 END)
    ),
    'performance', jsonb_build_object(
      'avg_response_time_ms', ROUND(AVG(response_time_avg_ms)),
      'avg_messages_per_conversation', ROUND(AVG(messages_count)::numeric, 1),
      'success_rate', ROUND((COUNT(CASE WHEN status = 'ended' THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100)::numeric, 1),
      'escalation_rate', ROUND((COUNT(CASE WHEN status = 'escalated' THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100)::numeric, 1)
    ),
    'sentiment', jsonb_build_object(
      'average', ROUND(AVG(sentiment_score)::numeric, 2),
      'positive_count', COUNT(CASE WHEN sentiment_score > 0.3 THEN 1 END),
      'negative_count', COUNT(CASE WHEN sentiment_score < -0.3 THEN 1 END)
    ),
    'channels', (
      SELECT jsonb_object_agg(channel, cnt)
      FROM (
        SELECT channel, COUNT(*) as cnt
        FROM agent_conversations
        WHERE agent_codename = p_agent_codename
          AND started_at >= NOW() - (p_days || ' days')::INTERVAL
        GROUP BY channel
      ) c
    )
  ) INTO v_result
  FROM agent_conversations
  WHERE agent_codename = p_agent_codename
    AND started_at >= NOW() - (p_days || ' days')::INTERVAL;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_agent_stats IS 'Returns comprehensive stats for an agent';

-- =============================================================================
-- FUNCTION: SEARCH KNOWLEDGE
-- Wrapper for vector similarity search
-- =============================================================================

CREATE OR REPLACE FUNCTION search_knowledge(
  p_query_text TEXT,
  p_agent_codename TEXT DEFAULT NULL,
  p_knowledge_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 5
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
  -- Note: This requires the query text to be converted to an embedding first
  -- In production, this would call an embedding API
  -- For now, we do a simple text search fallback
  
  RETURN QUERY
  SELECT 
    k.id,
    k.agent_codename,
    k.knowledge_type,
    k.title,
    k.content,
    ts_rank(
      to_tsvector('english', k.title || ' ' || k.content),
      plainto_tsquery('english', p_query_text)
    )::FLOAT as similarity
  FROM agent_knowledge k
  WHERE 
    k.is_active = TRUE
    AND (p_agent_codename IS NULL OR k.agent_codename = p_agent_codename OR k.agent_codename IS NULL)
    AND (p_knowledge_type IS NULL OR k.knowledge_type = p_knowledge_type)
    AND (
      to_tsvector('english', k.title || ' ' || k.content) @@ plainto_tsquery('english', p_query_text)
    )
  ORDER BY similarity DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION search_knowledge IS 'Searches knowledge base by text (fallback for vector search)';

