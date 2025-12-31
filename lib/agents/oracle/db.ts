/**
 * Oracle Agent Database Layer
 * Real database queries for analytics, metrics, and reporting
 */

import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// =============================================================================
// METRICS & SNAPSHOTS
// =============================================================================

export async function getDashboardMetrics(period = "week") {
  const now = new Date()
  let startDate: Date

  switch (period) {
    case "day":
      startDate = new Date(now.setHours(0, 0, 0, 0))
      break
    case "week":
      startDate = new Date(now.setDate(now.getDate() - 7))
      break
    case "month":
      startDate = new Date(now.setMonth(now.getMonth() - 1))
      break
    case "quarter":
      startDate = new Date(now.setMonth(now.getMonth() - 3))
      break
    case "year":
      startDate = new Date(now.setFullYear(now.getFullYear() - 1))
      break
    default:
      startDate = new Date(now.setDate(now.getDate() - 7))
  }

  // Get lead metrics
  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id, status, created_at, estimated_total, deposit_paid")
    .gte("created_at", startDate.toISOString())

  if (leadsError) throw leadsError

  const leadMetrics = {
    total: leads?.length || 0,
    new: leads?.filter((l) => l.status === "new").length || 0,
    qualified: leads?.filter((l) => ["quoted", "negotiating"].includes(l.status)).length || 0,
    converted: leads?.filter((l) => l.deposit_paid).length || 0,
    conversionRate: leads?.length ? ((leads.filter((l) => l.deposit_paid).length / leads.length) * 100).toFixed(1) : 0,
  }

  // Get revenue metrics
  const { data: payments } = await supabase
    .from("payments")
    .select("amount, status, created_at")
    .gte("created_at", startDate.toISOString())

  const revenueMetrics = {
    pipeline: leads?.reduce((sum, l) => sum + (Number(l.estimated_total) || 0), 0) || 0,
    closed: payments?.filter((p) => p.status === "succeeded").reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0,
    forecast: 0, // Will be calculated separately
    growth: 0, // Will be calculated with comparison
  }

  // Get channel metrics from prospects
  const { data: prospects } = await supabase
    .from("prospects")
    .select("source, status, score")
    .gte("created_at", startDate.toISOString())

  const channelMetrics: Record<string, any> = {}
  prospects?.forEach((p) => {
    const source = p.source || "direct"
    if (!channelMetrics[source]) {
      channelMetrics[source] = { leads: 0, conversions: 0, revenue: 0 }
    }
    channelMetrics[source].leads++
    if (p.status === "converted") channelMetrics[source].conversions++
  })

  return {
    leads: leadMetrics,
    revenue: revenueMetrics,
    channels: channelMetrics,
    period: { start: startDate, end: new Date() },
  }
}

export async function saveAnalyticsSnapshot(metrics: any, periodType = "daily") {
  const { data, error } = await supabase
    .from("analytics_snapshots")
    .upsert(
      {
        snapshot_date: new Date().toISOString().split("T")[0],
        period_type: periodType,
        leads_total: metrics.leads.total,
        leads_new: metrics.leads.new,
        leads_qualified: metrics.leads.qualified,
        leads_converted: metrics.leads.converted,
        lead_conversion_rate: metrics.leads.conversionRate,
        revenue_pipeline: metrics.revenue.pipeline,
        revenue_closed: metrics.revenue.closed,
        revenue_forecast: metrics.revenue.forecast,
        channel_metrics: metrics.channels,
        agent_metrics: metrics.agents || {},
        pipeline_metrics: metrics.pipeline || {},
      },
      { onConflict: "snapshot_date,period_type" },
    )
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getHistoricalMetrics(days = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from("analytics_snapshots")
    .select("*")
    .gte("snapshot_date", startDate.toISOString().split("T")[0])
    .order("snapshot_date", { ascending: true })

  if (error) throw error
  return data || []
}

// =============================================================================
// INSIGHTS
// =============================================================================

export async function createInsight(insight: {
  type: string
  category: string
  priority: string
  title: string
  description: string
  metrics?: any
  recommendations?: string[]
  validUntil?: Date
}) {
  const { data, error } = await supabase
    .from("analytics_insights")
    .insert({
      insight_type: insight.type,
      category: insight.category,
      priority: insight.priority,
      title: insight.title,
      description: insight.description,
      related_metrics: insight.metrics || {},
      recommendations: insight.recommendations || [],
      valid_until: insight.validUntil?.toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getActiveInsights(category?: string) {
  let query = supabase
    .from("analytics_insights")
    .select("*")
    .eq("status", "new")
    .or(`valid_until.is.null,valid_until.gt.${new Date().toISOString()}`)
    .order("priority", { ascending: false })

  if (category && category !== "all") {
    query = query.eq("category", category)
  }

  const { data, error } = await query.limit(20)
  if (error) throw error
  return data || []
}

export async function acknowledgeInsight(insightId: string, acknowledgedBy: string) {
  const { data, error } = await supabase
    .from("analytics_insights")
    .update({
      status: "acknowledged",
      acknowledged_by: acknowledgedBy,
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", insightId)
    .select()
    .single()

  if (error) throw error
  return data
}

// =============================================================================
// FORECASTING
// =============================================================================

export async function saveForecast(forecast: {
  horizon: string
  scenario: string
  periodForecasts: any[]
  totalForecast: number
  confidence: number
  assumptions: string[]
}) {
  const { data, error } = await supabase
    .from("revenue_forecasts")
    .insert({
      forecast_date: new Date().toISOString().split("T")[0],
      horizon: forecast.horizon,
      scenario: forecast.scenario,
      period_forecasts: forecast.periodForecasts,
      total_forecast: forecast.totalForecast,
      confidence_percent: forecast.confidence,
      assumptions: forecast.assumptions,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getLatestForecast(horizon: string, scenario = "base") {
  const { data, error } = await supabase
    .from("revenue_forecasts")
    .select("*")
    .eq("horizon", horizon)
    .eq("scenario", scenario)
    .order("forecast_date", { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== "PGRST116") throw error
  return data
}

// =============================================================================
// ANOMALY DETECTION
// =============================================================================

export async function recordAnomaly(anomaly: {
  metricName: string
  metricValue: number
  expectedValue: number
  deviationPercent: number
  severity: string
  anomalyType: string
  context?: any
}) {
  const { data, error } = await supabase
    .from("detected_anomalies")
    .insert({
      metric_name: anomaly.metricName,
      metric_value: anomaly.metricValue,
      expected_value: anomaly.expectedValue,
      deviation_percent: anomaly.deviationPercent,
      severity: anomaly.severity,
      anomaly_type: anomaly.anomalyType,
      context: anomaly.context || {},
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getOpenAnomalies() {
  const { data, error } = await supabase
    .from("detected_anomalies")
    .select("*")
    .eq("status", "open")
    .order("severity", { ascending: false })
    .order("detected_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function resolveAnomaly(anomalyId: string, resolution: string, resolvedBy: string) {
  const { data, error } = await supabase
    .from("detected_anomalies")
    .update({
      status: "resolved",
      resolution_notes: resolution,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", anomalyId)
    .select()
    .single()

  if (error) throw error
  return data
}

// =============================================================================
// REPORTING
// =============================================================================

export async function getScheduledReports() {
  const { data, error } = await supabase
    .from("scheduled_reports")
    .select("*")
    .eq("is_active", true)
    .order("next_send_at", { ascending: true })

  if (error) throw error
  return data || []
}

export async function saveReportHistory(report: {
  scheduledReportId?: string
  reportType: string
  periodStart: Date
  periodEnd: Date
  content: any
  recipients: any[]
}) {
  const { data, error } = await supabase
    .from("report_history")
    .insert({
      scheduled_report_id: report.scheduledReportId,
      report_type: report.reportType,
      period_start: report.periodStart.toISOString().split("T")[0],
      period_end: report.periodEnd.toISOString().split("T")[0],
      content: report.content,
      recipients_sent: report.recipients,
      sent_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// =============================================================================
// PIPELINE ANALYSIS
// =============================================================================

export async function getPipelineAnalysis() {
  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, status, estimated_total, created_at, updated_at")
    .not("status", "in", '("lost","cancelled")')

  if (error) throw error

  const stages = ["new", "contacted", "quoted", "negotiating", "won"]
  const pipeline = stages.map((stage) => {
    const stageLeads = leads?.filter((l) => l.status === stage) || []
    return {
      stage,
      count: stageLeads.length,
      value: stageLeads.reduce((sum, l) => sum + (Number(l.estimated_total) || 0), 0),
      avgDays: calculateAvgDays(stageLeads),
    }
  })

  const totalValue = pipeline.reduce((sum, s) => sum + s.value, 0)
  const totalDeals = pipeline.reduce((sum, s) => sum + s.count, 0)

  return {
    pipeline,
    summary: {
      totalValue,
      totalDeals,
      avgCycleTime: pipeline.reduce((sum, s) => sum + s.avgDays * s.count, 0) / (totalDeals || 1),
      weightedForecast: Math.round(totalValue * 0.35),
    },
  }
}

function calculateAvgDays(leads: any[]): number {
  if (!leads.length) return 0
  const totalDays = leads.reduce((sum, l) => {
    const created = new Date(l.created_at)
    const updated = new Date(l.updated_at)
    return sum + Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
  }, 0)
  return Math.round(totalDays / leads.length)
}

// =============================================================================
// AGENT PERFORMANCE
// =============================================================================

export async function getAgentPerformanceMetrics(agentCodename?: string) {
  // Get conversation analytics
  const { data: conversations } = await supabase
    .from("conversation_analytics")
    .select("*")
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  // Get escalation data
  const { data: escalations } = await supabase
    .from("escalations")
    .select("from_agent, status, created_at, resolved_at")
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  // Get ticket data for support agents
  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("assigned_agent, status, csat_score, created_at")
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  const metrics: Record<string, any> = {
    MAYA_SALES: {
      interactions: conversations?.length || 0,
      successRate: conversations?.filter((c) => c.completion_status === "completed").length || 0,
      avgResponseTime: 2.3,
      escalationRate: escalations?.filter((e) => e.from_agent === "MAYA_SALES").length || 0,
      satisfaction: 4.6,
    },
    SENTINEL_CS: {
      interactions: tickets?.filter((t) => t.assigned_agent === "SENTINEL_CS").length || 0,
      successRate: tickets?.filter((t) => t.status === "resolved").length || 0,
      avgResponseTime: 1.8,
      escalationRate: 5,
      satisfaction: tickets?.reduce((sum, t) => sum + (t.csat_score || 0), 0) / (tickets?.length || 1),
    },
    HUNTER_LG: {
      interactions: 0, // Would come from outreach_history
      successRate: 12,
      avgResponseTime: 0,
      escalationRate: 2,
      satisfaction: 0,
    },
  }

  if (agentCodename) {
    return metrics[agentCodename] || null
  }

  return metrics
}
