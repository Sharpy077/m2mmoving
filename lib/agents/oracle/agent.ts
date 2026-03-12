import { BaseAgent, type AgentInput, type AgentOutput } from "../base-agent"
import type { AgentIdentity, AgentConfig, InterAgentMessage, DashboardMetrics, Insight } from "../types"
import * as db from "./db"

// =============================================================================
// ORACLE AGENT
// =============================================================================

export class OracleAgent extends BaseAgent {
  // Analytics configuration
  private analyticsConfig: any
  private insightsCache: Insight[] = []
  private metricsCache: DashboardMetrics | null = null

  constructor(config?: Partial<AgentConfig>) {
    super({
      codename: "ORACLE_ANL",
      enabled: true,
      model: "anthropic/claude-sonnet-4-20250514",
      temperature: 0.3, // Lower temperature for analytical accuracy
      maxTokens: 2000,
      systemPrompt: this.ORACLE_SYSTEM_PROMPT,
      tools: [
        "getDashboardMetrics",
        "forecastRevenue",
        "analyzePipeline",
        "getChannelAttribution",
        "detectAnomalies",
        "generateInsights",
        "getAgentPerformance",
        "createReport",
      ],
      triggers: [
        { event: "daily_analysis", action: "run_daily_analysis", priority: 2 },
        { event: "anomaly_detected", action: "investigate_anomaly", priority: 1 },
        { event: "report_requested", action: "generate_report", priority: 2 },
      ],
      escalationRules: [
        { condition: "critical_anomaly", reason: "compliance_issue", priority: "urgent" },
        { condition: "revenue_drop > 20", reason: "high_value_deal", priority: "high" },
      ],
      rateLimits: {
        requestsPerMinute: 30,
        tokensPerDay: 300000,
      },
      ...config,
    })

    this.analyticsConfig = this.DEFAULT_ANALYTICS_CONFIG
  }

  // =============================================================================
  // IDENTITY
  // =============================================================================

  protected getIdentity(): AgentIdentity {
    return {
      codename: "ORACLE_ANL",
      name: "Oracle",
      description: "AI Analytics Agent - Provides business intelligence, forecasting, and strategic recommendations",
      version: "1.0.0",
      capabilities: [
        "Dashboard Metrics",
        "Revenue Forecasting",
        "Pipeline Analysis",
        "Channel Attribution",
        "Anomaly Detection",
        "Insight Generation",
        "Performance Reporting",
        "Trend Analysis",
      ],
      status: "idle",
    }
  }

  // =============================================================================
  // TOOLS REGISTRATION
  // =============================================================================

  protected registerTools(): void {
    // Get Dashboard Metrics
    this.registerTool({
      name: "getDashboardMetrics",
      description: "Get real-time dashboard metrics",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["day", "week", "month", "quarter", "year"], description: "Time period" },
          compareToLast: { type: "boolean", description: "Compare to previous period" },
        },
        required: [],
      },
      handler: async (params) => this.getDashboardMetrics(params as any),
    })

    // Forecast Revenue
    this.registerTool({
      name: "forecastRevenue",
      description: "Generate revenue forecast",
      parameters: {
        type: "object",
        properties: {
          horizon: { type: "string", enum: ["month", "quarter", "year"], description: "Forecast horizon" },
          scenario: { type: "string", enum: ["conservative", "base", "optimistic"], description: "Forecast scenario" },
          includeBreakdown: { type: "boolean", description: "Include detailed breakdown" },
        },
        required: [],
      },
      handler: async (params) => this.forecastRevenue(params as any),
    })

    // Analyze Pipeline
    this.registerTool({
      name: "analyzePipeline",
      description: "Analyze sales pipeline health",
      parameters: {
        type: "object",
        properties: {
          stage: { type: "string", description: "Specific stage to analyze" },
          includeAtRisk: { type: "boolean", description: "Include at-risk deals" },
        },
        required: [],
      },
      handler: async (params) => this.analyzePipeline(params as any),
    })

    // Get Channel Attribution
    this.registerTool({
      name: "getChannelAttribution",
      description: "Get marketing channel attribution analysis",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", description: "Analysis period" },
          model: {
            type: "string",
            enum: ["first_touch", "last_touch", "linear", "time_decay"],
            description: "Attribution model",
          },
        },
        required: [],
      },
      handler: async (params) => this.getChannelAttribution(params as any),
    })

    // Detect Anomalies
    this.registerTool({
      name: "detectAnomalies",
      description: "Detect anomalies in metrics",
      parameters: {
        type: "object",
        properties: {
          metrics: { type: "array", description: "Metrics to analyze" },
          sensitivity: { type: "string", enum: ["low", "medium", "high"], description: "Detection sensitivity" },
        },
        required: [],
      },
      handler: async (params) => this.detectAnomalies(params as any),
    })

    // Generate Insights
    this.registerTool({
      name: "generateInsights",
      description: "Generate actionable insights from data",
      parameters: {
        type: "object",
        properties: {
          focus: {
            type: "string",
            enum: ["revenue", "leads", "conversion", "efficiency", "all"],
            description: "Insight focus area",
          },
          limit: { type: "number", description: "Maximum insights to generate" },
        },
        required: [],
      },
      handler: async (params) => this.generateInsights(params as any),
    })

    // Get Agent Performance
    this.registerTool({
      name: "getAgentPerformance",
      description: "Get AI agent performance metrics",
      parameters: {
        type: "object",
        properties: {
          agentCodename: { type: "string", description: "Specific agent to analyze" },
          period: { type: "string", description: "Analysis period" },
        },
        required: [],
      },
      handler: async (params) => this.getAgentPerformance(params as any),
    })

    // Create Report
    this.registerTool({
      name: "createReport",
      description: "Create a formatted analytics report",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["executive", "marketing", "sales", "operations"], description: "Report type" },
          period: { type: "string", description: "Report period" },
          format: { type: "string", enum: ["summary", "detailed"], description: "Report format" },
        },
        required: ["type"],
      },
      handler: async (params) => this.createReport(params as any),
    })
  }

  // =============================================================================
  // MAIN PROCESSING
  // =============================================================================

  public async process(input: AgentInput): Promise<AgentOutput> {
    this.log("info", "process", `Processing input type: ${input.type}`)

    try {
      switch (input.type) {
        case "message":
          return await this.handleMessage(input)
        case "event":
          return await this.handleEvent(input)
        case "scheduled":
          return await this.handleScheduledTask(input)
        case "handoff":
          return await this.handleHandoffInput(input)
        default:
          return { success: false, error: "Unknown input type" }
      }
    } catch (error) {
      this.log("error", "process", `Processing failed: ${error}`)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Processing failed",
      }
    }
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(input: AgentInput): Promise<AgentOutput> {
    const content = input.content || ""

    // Parse analytics requests
    if (content.includes("dashboard") || content.includes("metrics")) {
      return await this.handleMetricsRequest(input.metadata)
    }

    if (content.includes("forecast") || content.includes("predict")) {
      return await this.handleForecastRequest(input.metadata)
    }

    if (content.includes("pipeline") || content.includes("deals")) {
      return await this.handlePipelineRequest(input.metadata)
    }

    if (content.includes("report")) {
      return await this.handleReportRequest(content, input.metadata)
    }

    if (content.includes("insight") || content.includes("recommend")) {
      return await this.handleInsightRequest(input.metadata)
    }

    // Default: generate analytical response
    const response = await this.generateResponse(input.messages || [])
    return { success: true, response }
  }

  /**
   * Handle events
   */
  private async handleEvent(input: AgentInput): Promise<AgentOutput> {
    const event = input.event
    if (!event) {
      return { success: false, error: "No event provided" }
    }

    switch (event.name) {
      case "lead_created":
        return await this.trackLeadCreation(event.data)
      case "deal_won":
        return await this.trackDealWon(event.data)
      case "deal_lost":
        return await this.trackDealLost(event.data)
      case "metric_update":
        return await this.processMetricUpdate(event.data)
      default:
        return { success: false, error: `Unknown event: ${event.name}` }
    }
  }

  /**
   * Handle scheduled tasks
   */
  private async handleScheduledTask(input: AgentInput): Promise<AgentOutput> {
    const taskType = input.metadata?.taskType as string

    switch (taskType) {
      case "daily_analysis":
        return await this.runDailyAnalysis()
      case "weekly_report":
        return await this.generateWeeklyReport()
      case "anomaly_scan":
        return await this.runAnomalyScan()
      default:
        return { success: false, error: `Unknown task: ${taskType}` }
    }
  }

  /**
   * Handle handoff from another agent
   */
  private async handleHandoffInput(input: AgentInput): Promise<AgentOutput> {
    const handoff = input.handoff
    if (!handoff) {
      return { success: false, error: "No handoff data provided" }
    }

    this.log("info", "handleHandoff", `Received handoff from ${handoff.fromAgent}`)

    // Analyze data from other agents
    return {
      success: true,
      response: "Data received and analysis queued.",
      data: { handoffId: handoff.id },
    }
  }

  /**
   * Handle inter-agent messages
   */
  public async handleInterAgentMessage(message: InterAgentMessage): Promise<void> {
    this.log("info", "handleInterAgentMessage", `Message from ${message.from}: ${message.type}`)

    switch (message.type) {
      case "notification":
        // Store insight from other agents
        if (message.payload.insight) {
          this.insightsCache.push(message.payload.insight as Insight)
        }
        break
      case "request":
        // Handle data requests
        break
    }
  }

  // =============================================================================
  // ANALYSIS WORKFLOWS
  // =============================================================================

  /**
   * Run daily analysis routine
   */
  private async runDailyAnalysis(): Promise<AgentOutput> {
    this.log("info", "runDailyAnalysis", "Starting daily analysis")

    // Gather all metrics
    const metricsResult = await this.getDashboardMetrics({ period: "day", compareToLast: true })
    const pipelineResult = await this.analyzePipeline({ includeAtRisk: true })
    const anomaliesResult = await this.detectAnomalies({ sensitivity: "medium" })
    const insightsResult = await this.generateInsights({ focus: "all", limit: 5 })

    // Build daily briefing
    const briefing = await this.buildDailyBriefing({
      metrics: metricsResult.data,
      pipeline: pipelineResult.data,
      anomalies: anomaliesResult.data,
      insights: insightsResult.data,
    })

    // Notify CORTEX of important insights
    const criticalInsights = ((insightsResult.data as any)?.insights || []).filter(
      (i: Insight) => i.priority === "high",
    )

    for (const insight of criticalInsights) {
      await this.sendToAgent("CORTEX_MAIN", "notification", { insight })
    }

    return {
      success: true,
      response: briefing,
      data: {
        metrics: metricsResult.data,
        pipeline: pipelineResult.data,
        anomalies: anomaliesResult.data,
        insights: insightsResult.data,
      },
    }
  }

  /**
   * Generate weekly report
   */
  private async generateWeeklyReport(): Promise<AgentOutput> {
    return await this.createReport({ type: "executive", period: "week", format: "detailed" })
  }

  /**
   * Run anomaly scan
   */
  private async runAnomalyScan(): Promise<AgentOutput> {
    const result = await this.detectAnomalies({ sensitivity: "high" })

    const anomalies = (result.data as any)?.anomalies || []

    if (anomalies.length > 0) {
      // Alert on critical anomalies
      const critical = anomalies.filter((a: any) => a.severity === "critical")
      if (critical.length > 0) {
        await this.escalateToHuman(
          "compliance_issue",
          `Critical anomalies detected: ${critical.map((a: any) => a.description).join("; ")}`,
          { anomalies: critical },
          "urgent",
        )
      }
    }

    return result
  }

  // =============================================================================
  // TOOL IMPLEMENTATIONS - Updated to use real database
  // =============================================================================

  private async getDashboardMetrics(params: any) {
    const period = params.period || "week"

    try {
      const metrics = await db.getDashboardMetrics(period)

      // Cache for quick access
      this.metricsCache = metrics as any

      // Get agent performance
      const agentMetrics = await db.getAgentPerformanceMetrics()

      // Calculate comparisons if requested
      let comparison = null
      if (params.compareToLast) {
        const historical = await db.getHistoricalMetrics(14)
        if (historical.length > 1) {
          const prev = historical[0]
          const curr = historical[historical.length - 1]
          comparison = {
            leads: `${(((curr.leads_total - prev.leads_total) / (prev.leads_total || 1)) * 100).toFixed(0)}%`,
            revenue: `${(((curr.revenue_closed - prev.revenue_closed) / (prev.revenue_closed || 1)) * 100).toFixed(0)}%`,
            conversion: `${(curr.lead_conversion_rate - prev.lead_conversion_rate).toFixed(1)}%`,
          }
        }
      }

      // Save snapshot
      await db.saveAnalyticsSnapshot({ ...metrics, agents: agentMetrics })

      return {
        success: true,
        data: {
          metrics: { ...metrics, agents: agentMetrics },
          comparison,
        },
      }
    } catch (error) {
      this.log("error", "getDashboardMetrics", `Failed: ${error}`)
      return { success: false, error: String(error) }
    }
  }

  private async forecastRevenue(params: any) {
    const horizon = params.horizon || "quarter"
    const scenario = params.scenario || "base"

    try {
      // Check for existing recent forecast
      const existing = await db.getLatestForecast(horizon, scenario)
      if (existing && this.isForecastFresh(existing.forecast_date)) {
        return { success: true, data: existing }
      }

      // Get historical data for forecasting
      const historical = await db.getHistoricalMetrics(90)

      // Calculate growth rate from historical data
      const growthRate = this.calculateGrowthRate(historical, scenario)
      const baseMonthly = this.calculateBaseRevenue(historical)

      const months = horizon === "month" ? 1 : horizon === "quarter" ? 3 : 12
      const forecast: any[] = []

      for (let i = 1; i <= months; i++) {
        const projected = baseMonthly * Math.pow(1 + growthRate / 12, i)
        const date = new Date()
        date.setMonth(date.getMonth() + i)

        forecast.push({
          period: date.toISOString().slice(0, 7),
          projected: Math.round(projected),
          low: Math.round(projected * 0.85),
          high: Math.round(projected * 1.15),
        })
      }

      const total = forecast.reduce((sum, f) => sum + f.projected, 0)
      const confidence = scenario === "base" ? 75 : scenario === "conservative" ? 85 : 65

      const assumptions = [
        "Based on historical conversion rates",
        "Assumes current marketing spend continues",
        `Growth rate: ${(growthRate * 100).toFixed(1)}% annually`,
      ]

      // Save forecast
      await db.saveForecast({
        horizon,
        scenario,
        periodForecasts: forecast,
        totalForecast: total,
        confidence,
        assumptions,
      })

      return {
        success: true,
        data: {
          scenario,
          horizon,
          totalForecast: total,
          confidence,
          breakdown: params.includeBreakdown ? forecast : undefined,
          assumptions,
        },
      }
    } catch (error) {
      this.log("error", "forecastRevenue", `Failed: ${error}`)
      return { success: false, error: String(error) }
    }
  }

  private async analyzePipeline(params: any) {
    try {
      const analysis = await db.getPipelineAnalysis()

      // Identify at-risk deals (stalled for > 7 days)
      const atRisk = params.includeAtRisk ? await this.identifyAtRiskDeals() : []

      // Calculate pipeline health score
      const healthScore = this.calculatePipelineHealth(analysis)

      return {
        success: true,
        data: {
          ...analysis,
          health: {
            score: healthScore,
            status: healthScore >= 70 ? "healthy" : healthScore >= 50 ? "needs_attention" : "at_risk",
            issues: this.identifyPipelineIssues(analysis),
          },
          atRisk,
        },
      }
    } catch (error) {
      this.log("error", "analyzePipeline", `Failed: ${error}`)
      return { success: false, error: String(error) }
    }
  }

  private async generateInsights(params: any) {
    const focus = params.focus || "all"
    const limit = params.limit || 5

    try {
      // Get existing active insights
      const existingInsights = await db.getActiveInsights(focus)

      if (existingInsights.length >= limit) {
        return { success: true, data: { insights: existingInsights.slice(0, limit) } }
      }

      // Generate new insights from current data
      const metrics = await db.getDashboardMetrics("week")
      const pipeline = await db.getPipelineAnalysis()
      const anomalies = await db.getOpenAnomalies()

      const newInsights: Insight[] = []

      // Revenue insights
      if (focus === "all" || focus === "revenue") {
        if (metrics.revenue.closed > metrics.revenue.pipeline * 0.3) {
          newInsights.push({
            id: `insight-${Date.now()}-1`,
            type: "trend",
            category: "revenue",
            priority: "high",
            title: "Strong conversion momentum",
            description: `Closed revenue is ${((metrics.revenue.closed / metrics.revenue.pipeline) * 100).toFixed(0)}% of pipeline, indicating healthy deal velocity.`,
            createdAt: new Date(),
            status: "new",
          })
        }
      }

      // Lead insights
      if (focus === "all" || focus === "leads") {
        const convRate = Number(metrics.leads.conversionRate)
        if (convRate < 25) {
          newInsights.push({
            id: `insight-${Date.now()}-2`,
            type: "recommendation",
            category: "leads",
            priority: "medium",
            title: "Conversion rate below target",
            description: `Current conversion rate is ${convRate}%. Consider reviewing lead qualification criteria or follow-up processes.`,
            createdAt: new Date(),
            status: "new",
          })
        }
      }

      // Anomaly-based insights
      if (anomalies.length > 0) {
        const criticalAnomalies = anomalies.filter((a) => a.severity === "critical")
        if (criticalAnomalies.length > 0) {
          newInsights.push({
            id: `insight-${Date.now()}-3`,
            type: "alert",
            category: "efficiency",
            priority: "high",
            title: `${criticalAnomalies.length} critical anomalies detected`,
            description: criticalAnomalies.map((a) => a.metric_name).join(", ") + " require immediate attention.",
            createdAt: new Date(),
            status: "new",
          })
        }
      }

      // Save new insights to database
      for (const insight of newInsights) {
        await db.createInsight({
          type: insight.type,
          category: insight.category,
          priority: insight.priority,
          title: insight.title,
          description: insight.description,
        })
      }

      // Combine and return
      const allInsights = [...existingInsights, ...newInsights].slice(0, limit)
      this.insightsCache = allInsights

      return {
        success: true,
        data: { insights: allInsights },
      }
    } catch (error) {
      this.log("error", "generateInsights", `Failed: ${error}`)
      return { success: false, error: String(error) }
    }
  }

  private async detectAnomalies(params: any) {
    const sensitivity = params.sensitivity || "medium"

    try {
      // Get historical data for baseline
      const historical = await db.getHistoricalMetrics(30)
      const currentMetrics = await db.getDashboardMetrics("day")

      const anomalies: any[] = []
      const threshold = sensitivity === "high" ? 1.5 : sensitivity === "low" ? 3 : 2

      // Check for lead anomalies
      const avgLeads = historical.reduce((sum, h) => sum + h.leads_new, 0) / (historical.length || 1)
      const stdDevLeads = this.calculateStdDev(historical.map((h) => h.leads_new))

      if (Math.abs(currentMetrics.leads.new - avgLeads) > threshold * stdDevLeads) {
        const deviation = ((currentMetrics.leads.new - avgLeads) / avgLeads) * 100
        const anomaly = {
          metric: "new_leads",
          value: currentMetrics.leads.new,
          expected: avgLeads,
          deviation: deviation.toFixed(1),
          severity: Math.abs(deviation) > 50 ? "critical" : Math.abs(deviation) > 30 ? "high" : "medium",
          type: deviation > 0 ? "spike" : "drop",
          description: `New leads ${deviation > 0 ? "increased" : "decreased"} by ${Math.abs(deviation).toFixed(0)}%`,
        }
        anomalies.push(anomaly)

        // Record in database
        await db.recordAnomaly({
          metricName: "new_leads",
          metricValue: currentMetrics.leads.new,
          expectedValue: avgLeads,
          deviationPercent: Math.abs(deviation),
          severity: anomaly.severity,
          anomalyType: anomaly.type,
        })
      }

      return {
        success: true,
        data: {
          sensitivity,
          anomalies,
          scannedMetrics: params.metrics || ["leads", "revenue", "conversion"],
          lastScan: new Date(),
        },
      }
    } catch (error) {
      this.log("error", "detectAnomalies", `Failed: ${error}`)
      return { success: false, error: String(error) }
    }
  }

  private async getAgentPerformance(params: any) {
    try {
      const metrics = await db.getAgentPerformanceMetrics(params.agentCodename)

      return {
        success: true,
        data: params.agentCodename ? { agent: params.agentCodename, metrics } : { agents: metrics },
      }
    } catch (error) {
      this.log("error", "getAgentPerformance", `Failed: ${error}`)
      return { success: false, error: String(error) }
    }
  }

  private async createReport(params: any) {
    try {
      const periodEnd = new Date()
      const periodStart = new Date()

      switch (params.period) {
        case "week":
          periodStart.setDate(periodStart.getDate() - 7)
          break
        case "month":
          periodStart.setMonth(periodStart.getMonth() - 1)
          break
        case "quarter":
          periodStart.setMonth(periodStart.getMonth() - 3)
          break
        default:
          periodStart.setDate(periodStart.getDate() - 7)
      }

      // Gather all data
      const metrics = await db.getDashboardMetrics(params.period || "week")
      const pipeline = await db.getPipelineAnalysis()
      const insights = await db.getActiveInsights()
      const forecast = await db.getLatestForecast("quarter", "base")

      // Build report content
      const report = {
        type: params.type,
        period: { start: periodStart, end: periodEnd },
        generatedAt: new Date(),
        sections: {
          executive_summary: this.buildExecutiveSummary(metrics, pipeline),
          metrics: metrics,
          pipeline: pipeline,
          insights: insights.slice(0, 5),
          forecast: forecast,
        },
      }

      // Save to history
      await db.saveReportHistory({
        reportType: params.type,
        periodStart,
        periodEnd,
        content: report,
        recipients: [],
      })

      return {
        success: true,
        data: report,
        response: this.formatReportResponse(report, params.format || "summary"),
      }
    } catch (error) {
      this.log("error", "createReport", `Failed: ${error}`)
      return { success: false, error: String(error) }
    }
  }

  // =============================================================================
  // HELPER METHODS - Add helper methods for calculations
  // =============================================================================

  private isForecastFresh(forecastDate: string): boolean {
    const date = new Date(forecastDate)
    const now = new Date()
    const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    return daysDiff < 1 // Fresh if less than 1 day old
  }

  private calculateGrowthRate(historical: any[], scenario: string): number {
    if (historical.length < 2) return scenario === "optimistic" ? 0.15 : scenario === "conservative" ? 0.05 : 0.1

    const first = historical[0]?.revenue_closed || 0
    const last = historical[historical.length - 1]?.revenue_closed || 0
    const months = historical.length / 30

    const baseRate = first > 0 ? Math.pow(last / first, 1 / months) - 1 : 0.1

    switch (scenario) {
      case "optimistic":
        return baseRate * 1.3
      case "conservative":
        return baseRate * 0.7
      default:
        return baseRate
    }
  }

  private calculateBaseRevenue(historical: any[]): number {
    if (historical.length === 0) return 35000
    const recent = historical.slice(-30)
    return (recent.reduce((sum, h) => sum + (h.revenue_closed || 0), 0) / recent.length) * 30
  }

  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2))
    return Math.sqrt(squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length)
  }

  private async identifyAtRiskDeals(): Promise<any[]> {
    // This would query leads that have been stalled
    return []
  }

  private calculatePipelineHealth(analysis: any): number {
    const { pipeline, summary } = analysis
    let score = 100

    // Deduct for low conversion
    if (summary.totalDeals > 0) {
      const wonDeals = pipeline.find((p: any) => p.stage === "won")?.count || 0
      const conversionRate = wonDeals / summary.totalDeals
      if (conversionRate < 0.2) score -= 20
      else if (conversionRate < 0.3) score -= 10
    }

    // Deduct for slow cycle time
    if (summary.avgCycleTime > 14) score -= 15
    else if (summary.avgCycleTime > 7) score -= 5

    return Math.max(0, score)
  }

  private identifyPipelineIssues(analysis: any): string[] {
    const issues: string[] = []
    const { pipeline, summary } = analysis

    if (summary.avgCycleTime > 10) {
      issues.push(`Average cycle time (${summary.avgCycleTime} days) is above target`)
    }

    const quotedStage = pipeline.find((p: any) => p.stage === "quoted")
    if (quotedStage && quotedStage.count > 10) {
      issues.push(`${quotedStage.count} deals stalled in quoted stage`)
    }

    return issues
  }

  private buildExecutiveSummary(metrics: any, pipeline: any): string {
    return `
This period saw ${metrics.leads.total} total leads with a ${metrics.leads.conversionRate}% conversion rate.
Revenue closed: $${metrics.revenue.closed.toLocaleString()} with $${metrics.revenue.pipeline.toLocaleString()} in pipeline.
Pipeline health is ${pipeline.summary.totalDeals} active deals worth $${pipeline.summary.totalValue.toLocaleString()}.
    `.trim()
  }

  private formatReportResponse(report: any, format: string): string {
    if (format === "summary") {
      return `
**${report.type.toUpperCase()} REPORT**
Period: ${report.period.start.toLocaleDateString()} - ${report.period.end.toLocaleDateString()}

${report.sections.executive_summary}

**Key Metrics:**
- Total Leads: ${report.sections.metrics.leads.total}
- Conversion Rate: ${report.sections.metrics.leads.conversionRate}%
- Revenue Closed: $${report.sections.metrics.revenue.closed.toLocaleString()}
- Pipeline Value: $${report.sections.metrics.revenue.pipeline.toLocaleString()}
      `.trim()
    }
    return JSON.stringify(report, null, 2)
  }

  // =============================================================================
  // CONSTANTS & CONFIGURATION
  // =============================================================================

  private ORACLE_SYSTEM_PROMPT =
    `You are Oracle, an AI Analytics Agent for M&M Commercial Moving, a premier commercial relocation service in Melbourne, Australia.

## Your Role
You analyze business data, identify trends, generate insights, and provide actionable recommendations to improve business performance.

## Analysis Principles
- Data-driven decisions over intuition
- Focus on actionable insights
- Consider both leading and lagging indicators
- Always provide context and confidence levels
- Present complex data simply

## Key Metrics You Track
- Lead volume and quality
- Conversion rates at each stage
- Revenue (closed, pipeline, forecast)
- Customer acquisition cost
- Customer lifetime value
- Agent performance
- Channel attribution

## Reporting Style
- Clear, concise summaries
- Visual representations where helpful
- Prioritized recommendations
- Confidence levels on predictions
- Australian business context

## When Analyzing
- Look for patterns and anomalies
- Compare to historical benchmarks
- Consider seasonality
- Factor in market conditions
- Identify root causes, not just symptoms`

  private DEFAULT_ANALYTICS_CONFIG: any = {
    refreshInterval: 3600000, // 1 hour
    alertThresholds: {
      leadDropPercent: 20,
      conversionDropPercent: 15,
      responseTimeMax: 5,
    },
    forecastModels: ["linear", "exponential", "seasonal"],
  }

  // =============================================================================
  // FACTORY & SINGLETON
  // =============================================================================

  private static oracleInstance: OracleAgent | null = null

  public static getOracle(): OracleAgent {
    if (!OracleAgent.oracleInstance) {
      OracleAgent.oracleInstance = new OracleAgent()
    }
    return OracleAgent.oracleInstance
  }

  public static resetOracle(): void {
    OracleAgent.oracleInstance = null
  }
}
