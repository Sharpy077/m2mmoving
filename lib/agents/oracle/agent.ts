/**
 * ORACLE - Analytics & Insights Agent
 * Business intelligence, forecasting, and strategic recommendations
 */

import { z } from "zod"
import { BaseAgent, type AgentInput, type AgentOutput, type AgentAction } from "../base-agent"
import type {
  AgentIdentity,
  AgentConfig,
  ToolDefinition,
  InterAgentMessage,
  DashboardMetrics,
  Insight,
  AgentMessage,
  Lead,
} from "../types"

// =============================================================================
// ORACLE AGENT
// =============================================================================

export class OracleAgent extends BaseAgent {
  // Analytics configuration
  private analyticsConfig: AnalyticsConfig
  private insightsCache: Insight[] = []
  private metricsCache: DashboardMetrics | null = null
  
  constructor(config?: Partial<AgentConfig>) {
    super({
      codename: "ORACLE_ANL",
      enabled: true,
      model: "gpt-4o",
      temperature: 0.3, // Lower temperature for analytical accuracy
      maxTokens: 2000,
      systemPrompt: ORACLE_SYSTEM_PROMPT,
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
    
    this.analyticsConfig = DEFAULT_ANALYTICS_CONFIG
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
      handler: async (params) => this.getDashboardMetrics(params as MetricsParams),
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
      handler: async (params) => this.forecastRevenue(params as ForecastParams),
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
      handler: async (params) => this.analyzePipeline(params as PipelineParams),
    })
    
    // Get Channel Attribution
    this.registerTool({
      name: "getChannelAttribution",
      description: "Get marketing channel attribution analysis",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", description: "Analysis period" },
          model: { type: "string", enum: ["first_touch", "last_touch", "linear", "time_decay"], description: "Attribution model" },
        },
        required: [],
      },
      handler: async (params) => this.getChannelAttribution(params as AttributionParams),
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
      handler: async (params) => this.detectAnomalies(params as AnomalyParams),
    })
    
    // Generate Insights
    this.registerTool({
      name: "generateInsights",
      description: "Generate actionable insights from data",
      parameters: {
        type: "object",
        properties: {
          focus: { type: "string", enum: ["revenue", "leads", "conversion", "efficiency", "all"], description: "Insight focus area" },
          limit: { type: "number", description: "Maximum insights to generate" },
        },
        required: [],
      },
      handler: async (params) => this.generateInsights(params as InsightParams),
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
      handler: async (params) => this.getAgentPerformance(params as AgentPerfParams),
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
      handler: async (params) => this.createReport(params as ReportParams),
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
    const criticalInsights = ((insightsResult.data as any)?.insights || [])
      .filter((i: Insight) => i.priority === "high")
    
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
          "urgent"
        )
      }
    }
    
    return result
  }
  
  // =============================================================================
  // TOOL IMPLEMENTATIONS
  // =============================================================================
  
  private async getDashboardMetrics(params: MetricsParams) {
    const period = params.period || "week"
    
    // In production, query actual database/analytics
    const metrics: DashboardMetrics = {
      leads: {
        total: 156,
        new: 34,
        qualified: 28,
        converted: 12,
        conversionRate: 34.3,
      },
      revenue: {
        pipeline: 245000,
        closed: 78500,
        forecast: 112000,
        growth: 15.3,
      },
      agents: {
        MAYA_SALES: { interactions: 145, successRate: 78, avgResponseTime: 2.3, escalationRate: 8, satisfaction: 4.6 },
        SENTINEL_CS: { interactions: 89, successRate: 92, avgResponseTime: 1.8, escalationRate: 5, satisfaction: 4.8 },
        HUNTER_LG: { interactions: 234, successRate: 12, avgResponseTime: 0, escalationRate: 2, satisfaction: 0 },
        AURORA_MKT: { interactions: 78, successRate: 0, avgResponseTime: 0, escalationRate: 0, satisfaction: 0 },
      },
      channels: {
        organic: { leads: 45, cost: 0, conversions: 8, revenue: 24000, roi: 0 },
        google_ads: { leads: 38, cost: 1500, conversions: 6, revenue: 18000, roi: 12 },
        linkedin: { leads: 28, cost: 800, conversions: 5, revenue: 15000, roi: 18.75 },
        referral: { leads: 22, cost: 0, conversions: 7, revenue: 21500, roi: 0 },
        direct: { leads: 23, cost: 0, conversions: 4, revenue: 0, roi: 0 },
      },
      period: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
    }
    
    this.metricsCache = metrics
    
    // Calculate comparisons if requested
    let comparison = null
    if (params.compareToLast) {
      comparison = {
        leads: "+12%",
        revenue: "+15%",
        conversion: "+3%",
      }
    }
    
    return {
      success: true,
      data: { metrics, comparison },
    }
  }
  
  private async forecastRevenue(params: ForecastParams) {
    const horizon = params.horizon || "quarter"
    const scenario = params.scenario || "base"
    
    // Simple forecasting model
    const baseMonthly = 35000
    const growthRate = scenario === "optimistic" ? 0.15 : scenario === "conservative" ? 0.05 : 0.10
    
    const months = horizon === "month" ? 1 : horizon === "quarter" ? 3 : 12
    const forecast: ForecastData[] = []
    
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
    
    return {
      success: true,
      data: {
        scenario,
        horizon,
        totalForecast: total,
        confidence: scenario === "base" ? 75 : scenario === "conservative" ? 85 : 65,
        breakdown: params.includeBreakdown ? forecast : undefined,
        assumptions: [
          "Based on historical conversion rates",
          "Assumes current marketing spend continues",
          "Does not account for seasonality",
        ],
      },
    }
  }
  
  private async analyzePipeline(params: PipelineParams) {
    // Mock pipeline data
    const pipeline: PipelineStage[] = [
      { stage: "new", count: 34, value: 85000, avgDays: 0 },
      { stage: "contacted", count: 28, value: 70000, avgDays: 2 },
      { stage: "qualified", count: 18, value: 54000, avgDays: 5 },
      { stage: "quoted", count: 12, value: 42000, avgDays: 8 },
      { stage: "negotiating", count: 6, value: 24000, avgDays: 12 },
    ]
    
    const totalValue = pipeline.reduce((sum, s) => sum + s.value, 0)
    const totalDeals = pipeline.reduce((sum, s) => sum + s.count, 0)
    
    // Calculate velocity
    const avgCycleTime = pipeline.reduce((sum, s) => sum + s.avgDays * s.count, 0) / totalDeals
    
    // Identify at-risk deals
    const atRisk = params.includeAtRisk ? [
      { company: "TechCorp", value: 8500, daysStalled: 14, stage: "quoted", reason: "No response to follow-ups" },
      { company: "FinanceHub", value: 12000, daysStalled: 10, stage: "negotiating", reason: "Competitor evaluation" },
    ] : []
    
    return {
      success: true,
      data: {
        pipeline,
        summary: {
          totalValue,
          totalDeals,
          avgCycleTime: Math.round(avgCycleTime),
          weightedForecast: Math.round(totalValue * 0.35), // Weighted by stage
        },
        health: {
          score: 72,
          status: "healthy",
          issues: [
            "2 deals stalled > 10 days in quoted stage",
            "Conversion from qualified to quoted below target (67% vs 75%)",
          ],
        },
        atRisk,
      },
    }
  }
  
  private async getChannelAttribution(params: AttributionParams) {
    const model = params.model || "linear"
    
    // Mock attribution data
    const attribution: ChannelAttribution[] = [
      { channel: "Organic Search", firstTouch: 32, lastTouch: 18, linear: 25, revenue: 28500 },
      { channel: "Google Ads", firstTouch: 28, lastTouch: 35, linear: 30, revenue: 24000 },
      { channel: "LinkedIn", firstTouch: 18, lastTouch: 22, linear: 20, revenue: 18000 },
      { channel: "Referral", firstTouch: 12, lastTouch: 15, linear: 15, revenue: 21500 },
      { channel: "Direct", firstTouch: 10, lastTouch: 10, linear: 10, revenue: 6500 },
    ]
    
    return {
      success: true,
      data: {
        model,
        attribution,
        insights: [
          "Organic search is the top first-touch channel - SEO investment paying off",
          "Google Ads converts best at bottom of funnel - consider increasing budget",
          "LinkedIn has strong awareness to conversion ratio - expand targeting",
        ],
        recommendations: [
          { action: "Increase Google Ads budget by 20%", impact: "+15 leads/month", confidence: "high" },
          { action: "Double down on LinkedIn content", impact: "+10% brand awareness", confidence: "medium" },
        ],
      },
    }
  }
  
  private async detectAnomalies(params: AnomalyParams) {
    const sensitivity = params.sensitivity || "medium"
    
    // Mock anomaly detection
    const anomalies: Anomaly[] = [
      {
        metric: "Lead response time",
        current: 4.2,
        expected: 2.5,
        deviation: "+68%",
        severity: sensitivity === "high" ? "warning" : "info",
        description: "Response time increased significantly in last 24 hours",
        possibleCauses: ["High volume", "Agent availability"],
      },
    ]
    
    return {
      success: true,
      data: {
        scannedMetrics: params.metrics || ["all"],
        sensitivity,
        anomalies,
        timestamp: new Date(),
      },
    }
  }
  
  private async generateInsights(params: InsightParams) {
    const focus = params.focus || "all"
    const limit = params.limit || 10
    
    const allInsights: Insight[] = [
      {
        id: this.generateId(),
        type: "opportunity",
        priority: "high",
        title: "Data Center moves converting at 45%",
        description: "Data center migration leads are converting at nearly double the average rate. Consider increasing targeting and budget for this segment.",
        actionable: true,
        suggestedAction: "Shift 20% of Google Ads budget to data center keywords",
        createdAt: new Date(),
      },
      {
        id: this.generateId(),
        type: "alert",
        priority: "medium",
        title: "Pipeline velocity slowed by 2.3 days",
        description: "Deals are taking longer to progress through stages compared to last month. Main bottleneck is quoted → negotiating.",
        actionable: true,
        suggestedAction: "Implement 48hr follow-up SLA for quotes > $10K",
        createdAt: new Date(),
      },
      {
        id: this.generateId(),
        type: "recommendation",
        priority: "medium",
        title: "Thursday-Friday quotes have highest close rate",
        description: "Quotes sent Thursday-Friday close at 38% vs 22% for Monday-Wednesday. Timing optimization could improve conversions.",
        actionable: true,
        suggestedAction: "Prioritize quote delivery for end of week",
        createdAt: new Date(),
      },
      {
        id: this.generateId(),
        type: "opportunity",
        priority: "low",
        title: "LinkedIn engagement up 23% WoW",
        description: "LinkedIn content is resonating. Educational posts about IT equipment handling performing particularly well.",
        actionable: true,
        suggestedAction: "Create more IT-focused content series",
        createdAt: new Date(),
      },
    ]
    
    // Filter by focus area if specified
    let filtered = allInsights
    if (focus !== "all") {
      filtered = allInsights.filter(i => {
        if (focus === "revenue") return i.title.toLowerCase().includes("revenue") || i.title.toLowerCase().includes("converting")
        if (focus === "leads") return i.title.toLowerCase().includes("lead")
        if (focus === "conversion") return i.title.toLowerCase().includes("convert") || i.title.toLowerCase().includes("close")
        return true
      })
    }
    
    // Sort by priority and limit
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    filtered = filtered.slice(0, limit)
    
    this.insightsCache = filtered
    
    return {
      success: true,
      data: {
        insights: filtered,
        generatedAt: new Date(),
        nextRefresh: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    }
  }
  
  private async getAgentPerformance(params: AgentPerfParams) {
    const period = params.period || "week"
    
    // Get performance data for all agents or specific one
    const performance: Record<string, AgentPerf> = {
      MAYA_SALES: {
        interactions: 145,
        successRate: 78,
        avgResponseTime: 2.3,
        avgTokensPerInteraction: 450,
        escalationRate: 8,
        customerSatisfaction: 4.6,
        topActions: ["calculateQuote", "qualifyLead", "handleObjection"],
      },
      SENTINEL_CS: {
        interactions: 89,
        successRate: 92,
        avgResponseTime: 1.8,
        avgTokensPerInteraction: 380,
        escalationRate: 5,
        customerSatisfaction: 4.8,
        topActions: ["getBookingStatus", "modifyBooking", "searchFAQ"],
      },
      HUNTER_LG: {
        interactions: 234,
        successRate: 12,
        avgResponseTime: 0,
        avgTokensPerInteraction: 520,
        escalationRate: 2,
        customerSatisfaction: 0,
        topActions: ["scanRealEstateListings", "enrichCompanyData", "sendOutboundEmail"],
      },
      AURORA_MKT: {
        interactions: 78,
        successRate: 95,
        avgResponseTime: 0,
        avgTokensPerInteraction: 850,
        escalationRate: 0,
        customerSatisfaction: 0,
        topActions: ["generateSocialPost", "generateBlogPost", "schedulePost"],
      },
    }
    
    if (params.agentCodename) {
      return {
        success: true,
        data: {
          agent: params.agentCodename,
          performance: performance[params.agentCodename] || null,
          period,
        },
      }
    }
    
    return {
      success: true,
      data: { performance, period },
    }
  }
  
  private async createReport(params: ReportParams) {
    const reportType = params.type
    const period = params.period || "week"
    
    // Gather data for report
    const metrics = await this.getDashboardMetrics({ period })
    const pipeline = await this.analyzePipeline({})
    const insights = await this.generateInsights({ focus: "all", limit: 5 })
    
    // Generate report using LLM
    const reportContent = await this.generateStructuredResponse(
      `Generate a ${params.format || "summary"} ${reportType} report for M&M Commercial Moving.

Period: ${period}

Key Metrics:
${JSON.stringify(metrics.data, null, 2)}

Pipeline Analysis:
${JSON.stringify(pipeline.data, null, 2)}

Top Insights:
${JSON.stringify(insights.data, null, 2)}

Format as a professional business report with:
1. Executive Summary
2. Key Metrics
3. Highlights
4. Areas of Concern
5. Recommendations
6. Next Steps`,
      z.object({
        title: z.string(),
        executiveSummary: z.string(),
        keyMetrics: z.array(z.object({
          name: z.string(),
          value: z.string(),
          trend: z.string(),
        })),
        highlights: z.array(z.string()),
        concerns: z.array(z.string()),
        recommendations: z.array(z.string()),
        nextSteps: z.array(z.string()),
      })
    )
    
    return {
      success: true,
      data: {
        report: reportContent,
        type: reportType,
        period,
        generatedAt: new Date(),
      },
    }
  }
  
  // =============================================================================
  // HELPER METHODS
  // =============================================================================
  
  private async handleMetricsRequest(metadata?: Record<string, unknown>): Promise<AgentOutput> {
    const result = await this.getDashboardMetrics({ period: "week", compareToLast: true })
    return {
      success: true,
      response: this.formatMetricsResponse(result.data),
      data: result.data,
    }
  }
  
  private async handleForecastRequest(metadata?: Record<string, unknown>): Promise<AgentOutput> {
    const result = await this.forecastRevenue({ horizon: "quarter", scenario: "base", includeBreakdown: true })
    return {
      success: true,
      response: this.formatForecastResponse(result.data),
      data: result.data,
    }
  }
  
  private async handlePipelineRequest(metadata?: Record<string, unknown>): Promise<AgentOutput> {
    const result = await this.analyzePipeline({ includeAtRisk: true })
    return {
      success: true,
      response: this.formatPipelineResponse(result.data),
      data: result.data,
    }
  }
  
  private async handleReportRequest(content: string, metadata?: Record<string, unknown>): Promise<AgentOutput> {
    let reportType: string = "executive"
    if (content.includes("marketing")) reportType = "marketing"
    if (content.includes("sales")) reportType = "sales"
    if (content.includes("operations")) reportType = "operations"
    
    return await this.createReport({ type: reportType, format: "summary" })
  }
  
  private async handleInsightRequest(metadata?: Record<string, unknown>): Promise<AgentOutput> {
    const result = await this.generateInsights({ focus: "all", limit: 5 })
    return {
      success: true,
      response: this.formatInsightsResponse(result.data),
      data: result.data,
    }
  }
  
  private async trackLeadCreation(data: Record<string, unknown>): Promise<AgentOutput> {
    return { success: true, response: "Lead tracked." }
  }
  
  private async trackDealWon(data: Record<string, unknown>): Promise<AgentOutput> {
    return { success: true, response: "Deal win tracked." }
  }
  
  private async trackDealLost(data: Record<string, unknown>): Promise<AgentOutput> {
    return { success: true, response: "Deal loss tracked." }
  }
  
  private async processMetricUpdate(data: Record<string, unknown>): Promise<AgentOutput> {
    return { success: true, response: "Metric updated." }
  }
  
  private async buildDailyBriefing(data: any): Promise<string> {
    const { metrics, insights } = data
    const m = metrics?.metrics as DashboardMetrics
    const ins = insights?.insights as Insight[]
    
    return `📊 **Daily Briefing - ${new Date().toLocaleDateString("en-AU")}**

**Key Metrics**
• Leads: ${m?.leads.total || 0} total (${m?.leads.new || 0} new)
• Pipeline: $${((m?.revenue.pipeline || 0) / 1000).toFixed(0)}K
• Closed Revenue: $${((m?.revenue.closed || 0) / 1000).toFixed(0)}K

**Top Insights**
${ins?.slice(0, 3).map(i => `• ${i.title}`).join("\n") || "No insights generated"}

**Recommended Actions**
${ins?.filter(i => i.actionable).slice(0, 2).map(i => `• ${i.suggestedAction}`).join("\n") || "No actions recommended"}`
  }
  
  private formatMetricsResponse(data: any): string {
    const m = data?.metrics as DashboardMetrics
    if (!m) return "Unable to retrieve metrics."
    
    return `Here's your metrics summary:

📈 **Leads**: ${m.leads.total} total, ${m.leads.new} new this period
💰 **Revenue**: $${(m.revenue.closed / 1000).toFixed(0)}K closed, $${(m.revenue.pipeline / 1000).toFixed(0)}K in pipeline
📊 **Conversion Rate**: ${m.leads.conversionRate.toFixed(1)}%
🚀 **Growth**: ${m.revenue.growth > 0 ? "+" : ""}${m.revenue.growth.toFixed(1)}%`
  }
  
  private formatForecastResponse(data: any): string {
    if (!data) return "Unable to generate forecast."
    
    return `**Revenue Forecast (${data.scenario} scenario)**

Total ${data.horizon} forecast: $${(data.totalForecast / 1000).toFixed(0)}K
Confidence: ${data.confidence}%

${data.breakdown ? data.breakdown.map((b: any) => `• ${b.period}: $${(b.projected / 1000).toFixed(0)}K`).join("\n") : ""}`
  }
  
  private formatPipelineResponse(data: any): string {
    if (!data) return "Unable to analyze pipeline."
    
    const s = data.summary
    return `**Pipeline Analysis**

Total Value: $${(s.totalValue / 1000).toFixed(0)}K across ${s.totalDeals} deals
Weighted Forecast: $${(s.weightedForecast / 1000).toFixed(0)}K
Avg Cycle Time: ${s.avgCycleTime} days

Health Score: ${data.health.score}/100 (${data.health.status})

${data.atRisk.length > 0 ? `⚠️ At-Risk Deals:\n${data.atRisk.map((d: any) => `• ${d.company}: $${(d.value / 1000).toFixed(1)}K - ${d.reason}`).join("\n")}` : "No at-risk deals identified."}`
  }
  
  private formatInsightsResponse(data: any): string {
    const insights = data?.insights as Insight[]
    if (!insights || insights.length === 0) return "No insights available."
    
    return `**Top Insights**

${insights.map((i, idx) => `${idx + 1}. ${i.priority === "high" ? "🔴" : i.priority === "medium" ? "🟡" : "🟢"} **${i.title}**
   ${i.description}
   ${i.suggestedAction ? `→ *Action: ${i.suggestedAction}*` : ""}`).join("\n\n")}`
  }
}

// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================

const ORACLE_SYSTEM_PROMPT = `You are Oracle, an AI Analytics Agent for M&M Commercial Moving, a premier commercial relocation service in Melbourne, Australia.

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

interface AnalyticsConfig {
  refreshInterval: number
  alertThresholds: Record<string, number>
  forecastModels: string[]
}

const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = {
  refreshInterval: 3600000, // 1 hour
  alertThresholds: {
    leadDropPercent: 20,
    conversionDropPercent: 15,
    responseTimeMax: 5,
  },
  forecastModels: ["linear", "exponential", "seasonal"],
}

interface MetricsParams {
  period?: string
  compareToLast?: boolean
}

interface ForecastParams {
  horizon?: string
  scenario?: string
  includeBreakdown?: boolean
}

interface PipelineParams {
  stage?: string
  includeAtRisk?: boolean
}

interface AttributionParams {
  period?: string
  model?: string
}

interface AnomalyParams {
  metrics?: string[]
  sensitivity?: string
}

interface InsightParams {
  focus?: string
  limit?: number
}

interface AgentPerfParams {
  agentCodename?: string
  period?: string
}

interface ReportParams {
  type: string
  period?: string
  format?: string
}

interface ForecastData {
  period: string
  projected: number
  low: number
  high: number
}

interface PipelineStage {
  stage: string
  count: number
  value: number
  avgDays: number
}

interface ChannelAttribution {
  channel: string
  firstTouch: number
  lastTouch: number
  linear: number
  revenue: number
}

interface Anomaly {
  metric: string
  current: number
  expected: number
  deviation: string
  severity: string
  description: string
  possibleCauses: string[]
}

interface AgentPerf {
  interactions: number
  successRate: number
  avgResponseTime: number
  avgTokensPerInteraction: number
  escalationRate: number
  customerSatisfaction: number
  topActions: string[]
}

// =============================================================================
// FACTORY & SINGLETON
// =============================================================================

let oracleInstance: OracleAgent | null = null

export function getOracle(): OracleAgent {
  if (!oracleInstance) {
    oracleInstance = new OracleAgent()
  }
  return oracleInstance
}

export function resetOracle(): void {
  oracleInstance = null
}

