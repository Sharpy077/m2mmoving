-- =============================================================================
-- AI AGENTS DATABASE VIEWS
-- Migration: Create views for reporting and analytics
-- =============================================================================

-- =============================================================================
-- AGENT PERFORMANCE SUMMARY VIEW
-- Real-time performance metrics per agent
-- =============================================================================

CREATE OR REPLACE VIEW v_agent_performance AS
SELECT 
  agent_codename,
  COUNT(*) as total_conversations,
  COUNT(CASE WHEN status = 'ended' THEN 1 END) as completed_conversations,
  COUNT(CASE WHEN status = 'escalated' THEN 1 END) as escalated_conversations,
  ROUND(AVG(messages_count)::numeric, 1) as avg_messages_per_conversation,
  ROUND(AVG(response_time_avg_ms)::numeric, 0) as avg_response_time_ms,
  ROUND(AVG(sentiment_score)::numeric, 2) as avg_sentiment,
  ROUND(
    (COUNT(CASE WHEN status = 'ended' THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100),
    1
  ) as completion_rate,
  ROUND(
    (COUNT(CASE WHEN status = 'escalated' THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100),
    1
  ) as escalation_rate,
  MIN(started_at) as first_conversation,
  MAX(started_at) as last_conversation
FROM agent_conversations
WHERE started_at >= NOW() - INTERVAL '30 days'
GROUP BY agent_codename
ORDER BY total_conversations DESC;

COMMENT ON VIEW v_agent_performance IS 'Aggregated performance metrics per agent for last 30 days';

-- =============================================================================
-- DAILY METRICS VIEW
-- Daily aggregated metrics for trending
-- =============================================================================

CREATE OR REPLACE VIEW v_daily_metrics AS
SELECT 
  DATE(started_at) as date,
  agent_codename,
  COUNT(*) as conversations,
  SUM(messages_count) as total_messages,
  ROUND(AVG(response_time_avg_ms)::numeric, 0) as avg_response_time,
  ROUND(AVG(sentiment_score)::numeric, 2) as avg_sentiment,
  COUNT(CASE WHEN status = 'escalated' THEN 1 END) as escalations
FROM agent_conversations
WHERE started_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(started_at), agent_codename
ORDER BY date DESC, agent_codename;

COMMENT ON VIEW v_daily_metrics IS 'Daily performance metrics per agent for trending analysis';

-- =============================================================================
-- ACTIVE CONVERSATIONS VIEW
-- Currently active conversations with agent details
-- =============================================================================

CREATE OR REPLACE VIEW v_active_conversations AS
SELECT 
  c.id,
  c.agent_codename,
  c.channel,
  c.lead_id,
  c.customer_id,
  c.messages_count,
  c.sentiment_score,
  c.started_at,
  EXTRACT(EPOCH FROM (NOW() - c.started_at)) / 60 as duration_minutes,
  (
    SELECT content 
    FROM agent_messages m 
    WHERE m.conversation_id = c.id 
    ORDER BY created_at DESC 
    LIMIT 1
  ) as last_message
FROM agent_conversations c
WHERE c.status = 'active'
ORDER BY c.started_at DESC;

COMMENT ON VIEW v_active_conversations IS 'Currently active conversations across all agents';

-- =============================================================================
-- ESCALATION QUEUE VIEW
-- Pending escalations requiring human attention
-- =============================================================================

CREATE OR REPLACE VIEW v_escalation_queue AS
SELECT 
  e.id,
  e.from_agent,
  e.reason,
  e.priority,
  e.status,
  e.summary,
  e.assigned_to,
  e.created_at,
  e.assigned_at,
  EXTRACT(EPOCH FROM (NOW() - e.created_at)) / 60 as waiting_minutes,
  c.channel as conversation_channel,
  c.messages_count as conversation_messages
FROM agent_escalations e
LEFT JOIN agent_conversations c ON c.id = e.conversation_id
WHERE e.status IN ('pending', 'assigned', 'in_progress')
ORDER BY 
  CASE e.priority 
    WHEN 'urgent' THEN 1 
    WHEN 'high' THEN 2 
    WHEN 'medium' THEN 3 
    ELSE 4 
  END,
  e.created_at ASC;

COMMENT ON VIEW v_escalation_queue IS 'Pending escalations ordered by priority and age';

-- =============================================================================
-- QA DASHBOARD VIEW
-- Quality assurance overview for monitoring
-- =============================================================================

CREATE OR REPLACE VIEW v_qa_dashboard AS
SELECT 
  agent_codename,
  COUNT(*) as total_audits,
  ROUND(AVG(overall_score)::numeric, 1) as avg_score,
  ROUND(AVG(accuracy_score)::numeric, 1) as avg_accuracy,
  ROUND(AVG(tone_score)::numeric, 1) as avg_tone,
  ROUND(AVG(compliance_score)::numeric, 1) as avg_compliance,
  ROUND(AVG(completeness_score)::numeric, 1) as avg_completeness,
  ROUND(AVG(empathy_score)::numeric, 1) as avg_empathy,
  COUNT(CASE WHEN overall_score >= 85 THEN 1 END) as excellent_count,
  COUNT(CASE WHEN overall_score >= 70 AND overall_score < 85 THEN 1 END) as good_count,
  COUNT(CASE WHEN overall_score < 70 THEN 1 END) as needs_improvement_count,
  COUNT(CASE WHEN manual_review = TRUE AND reviewed_at IS NULL THEN 1 END) as pending_reviews
FROM agent_qa_audits
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY agent_codename
ORDER BY avg_score DESC;

COMMENT ON VIEW v_qa_dashboard IS 'Quality assurance metrics per agent for last 30 days';

-- =============================================================================
-- HOURLY VOLUME VIEW
-- Hourly conversation volume for capacity planning
-- =============================================================================

CREATE OR REPLACE VIEW v_hourly_volume AS
SELECT 
  DATE(started_at) as date,
  EXTRACT(HOUR FROM started_at) as hour,
  COUNT(*) as conversations,
  COUNT(DISTINCT agent_codename) as active_agents,
  ROUND(AVG(response_time_avg_ms)::numeric, 0) as avg_response_time
FROM agent_conversations
WHERE started_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(started_at), EXTRACT(HOUR FROM started_at)
ORDER BY date DESC, hour;

COMMENT ON VIEW v_hourly_volume IS 'Hourly conversation volume for last 7 days';

-- =============================================================================
-- KNOWLEDGE BASE USAGE VIEW
-- Most used knowledge base entries
-- =============================================================================

CREATE OR REPLACE VIEW v_knowledge_usage AS
SELECT 
  id,
  agent_codename,
  knowledge_type,
  category,
  title,
  usage_count,
  last_used_at,
  CASE 
    WHEN last_used_at >= NOW() - INTERVAL '1 day' THEN 'hot'
    WHEN last_used_at >= NOW() - INTERVAL '7 days' THEN 'warm'
    ELSE 'cold'
  END as recency
FROM agent_knowledge
WHERE is_active = TRUE
ORDER BY usage_count DESC, last_used_at DESC NULLS LAST;

COMMENT ON VIEW v_knowledge_usage IS 'Knowledge base entries ranked by usage';

-- =============================================================================
-- MATERIALIZED VIEW: AGENT LEADERBOARD
-- Cached performance leaderboard (refresh periodically)
-- =============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_agent_leaderboard AS
SELECT 
  agent_codename,
  COUNT(*) as total_conversations,
  ROUND(AVG(response_time_avg_ms)::numeric, 0) as avg_response_time_ms,
  ROUND(AVG(sentiment_score)::numeric, 2) as avg_sentiment,
  ROUND(
    (COUNT(CASE WHEN status = 'ended' THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100),
    1
  ) as success_rate,
  RANK() OVER (ORDER BY COUNT(*) DESC) as volume_rank,
  RANK() OVER (ORDER BY AVG(sentiment_score) DESC NULLS LAST) as sentiment_rank,
  RANK() OVER (ORDER BY AVG(response_time_avg_ms) ASC NULLS LAST) as speed_rank
FROM agent_conversations
WHERE started_at >= NOW() - INTERVAL '7 days'
GROUP BY agent_codename;

-- Index for the materialized view
CREATE UNIQUE INDEX idx_mv_leaderboard_agent ON mv_agent_leaderboard(agent_codename);

COMMENT ON MATERIALIZED VIEW mv_agent_leaderboard IS 'Cached agent performance leaderboard (refresh with REFRESH MATERIALIZED VIEW)';

-- =============================================================================
-- FUNCTION: REFRESH LEADERBOARD
-- =============================================================================

CREATE OR REPLACE FUNCTION refresh_agent_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_agent_leaderboard;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_agent_leaderboard IS 'Refreshes the agent leaderboard materialized view';

-- =============================================================================
-- CRON JOB SETUP (requires pg_cron extension)
-- Uncomment if pg_cron is available
-- =============================================================================

-- SELECT cron.schedule('refresh-leaderboard', '*/15 * * * *', 'SELECT refresh_agent_leaderboard()');
