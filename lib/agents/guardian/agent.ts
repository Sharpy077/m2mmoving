/**
 * GUARDIAN - Quality Assurance Agent
 * QA monitoring, conversation audits, compliance checks, and continuous improvement
 */

import { BaseAgent, type AgentInput, type AgentOutput } from "../base-agent"
import type { AgentIdentity, AgentConfig, InterAgentMessage } from "../types"

// =============================================================================
// GUARDIAN AGENT
// =============================================================================

export class GuardianAgent extends BaseAgent {
  private qaConfig: QAConfig
  private auditLog: ConversationAudit[] = []
  private metrics: QAMetrics
  
  constructor(config?: Partial<AgentConfig>) {
    super({
      codename: "GUARDIAN_QA",
      enabled: true,
      model: "gpt-4o",
      temperature: 0.3,
      maxTokens: 2000,
      systemPrompt: GUARDIAN_SYSTEM_PROMPT,
      tools: [
        "auditConversation",
        "checkQuality",
        "flagIssue",
        "generateQAReport",
        "calibrateScoring",
        "recommendImprovement",
        "validateResponse",
        "trackTrends",
      ],
      triggers: [
        { event: "conversation_ended", action: "audit_conversation", priority: 2 },
        { event: "qa_check_required", action: "quality_check", priority: 1 },
        { event: "daily_qa_review", action: "generate_daily_report", priority: 3 },
      ],
      escalationRules: [
        { condition: "qa_score_critical", reason: "compliance_issue", priority: "high" },
        { condition: "pattern_detected", reason: "training_needed", priority: "medium" },
      ],
      rateLimits: { requestsPerMinute: 30, tokensPerDay: 250000 },
      ...config,
    })
    
    this.qaConfig = DEFAULT_QA_CONFIG
    this.metrics = this.initializeMetrics()
  }
  
  private initializeMetrics(): QAMetrics {
    return {
      totalAudits: 0,
      avgScore: 0,
      scoresByAgent: new Map(),
      issuesByCategory: new Map(),
      trendsOverTime: [],
    }
  }
  
  protected getIdentity(): AgentIdentity {
    return {
      codename: "GUARDIAN_QA",
      name: "Guardian",
      description: "AI Quality Assurance Agent - Audits conversations, monitors quality, drives improvement",
      version: "1.0.0",
      capabilities: [
        "Conversation Auditing",
        "Quality Scoring",
        "Issue Detection",
        "QA Reporting",
        "Trend Analysis",
        "Improvement Recommendations",
        "Response Validation",
        "Agent Calibration",
      ],
      status: "idle",
    }
  }
  
  protected registerTools(): void {
    this.registerTool({
      name: "auditConversation",
      description: "Audit a completed conversation",
      parameters: {
        type: "object",
        properties: {
          conversationId: { type: "string", description: "Conversation ID" },
          agentId: { type: "string", description: "Agent that handled it" },
          messages: { type: "array", description: "Conversation messages" },
        },
        required: ["conversationId", "agentId"],
      },
      handler: async (params) => this.auditConversation(params as AuditParams),
    })
    
    this.registerTool({
      name: "checkQuality",
      description: "Run quality check on a response",
      parameters: {
        type: "object",
        properties: {
          agentId: { type: "string", description: "Agent ID" },
          response: { type: "string", description: "Response to check" },
          context: { type: "object", description: "Context of response" },
          criteria: { type: "array", description: "Specific criteria to check" },
        },
        required: ["agentId", "response"],
      },
      handler: async (params) => this.checkQuality(params as QualityParams),
    })
    
    this.registerTool({
      name: "flagIssue",
      description: "Flag a quality issue",
      parameters: {
        type: "object",
        properties: {
          agentId: { type: "string", description: "Agent ID" },
          issueType: { type: "string", enum: ["accuracy", "tone", "compliance", "completeness", "empathy"], description: "Issue type" },
          severity: { type: "string", enum: ["minor", "moderate", "major", "critical"], description: "Severity" },
          description: { type: "string", description: "Issue description" },
          conversationId: { type: "string", description: "Related conversation" },
        },
        required: ["agentId", "issueType", "severity"],
      },
      handler: async (params) => this.flagIssue(params as IssueParams),
    })
    
    this.registerTool({
      name: "generateQAReport",
      description: "Generate QA report",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["day", "week", "month"], description: "Report period" },
          agentFilter: { type: "string", description: "Filter by agent" },
          format: { type: "string", enum: ["summary", "detailed"], description: "Report format" },
        },
        required: [],
      },
      handler: async (params) => this.generateQAReport(params as ReportParams),
    })
    
    this.registerTool({
      name: "calibrateScoring",
      description: "Calibrate QA scoring based on samples",
      parameters: {
        type: "object",
        properties: {
          sampleSize: { type: "number", description: "Number of samples" },
          adjustWeights: { type: "boolean", description: "Adjust category weights" },
        },
        required: [],
      },
      handler: async (params) => this.calibrateScoring(params as CalibrateParams),
    })
    
    this.registerTool({
      name: "recommendImprovement",
      description: "Generate improvement recommendations",
      parameters: {
        type: "object",
        properties: {
          agentId: { type: "string", description: "Agent to analyze" },
          focusArea: { type: "string", description: "Area to focus on" },
        },
        required: [],
      },
      handler: async (params) => this.recommendImprovement(params as ImprovementParams),
    })
    
    this.registerTool({
      name: "validateResponse",
      description: "Validate response before sending",
      parameters: {
        type: "object",
        properties: {
          agentId: { type: "string", description: "Agent ID" },
          response: { type: "string", description: "Response to validate" },
          context: { type: "object", description: "Context" },
        },
        required: ["agentId", "response"],
      },
      handler: async (params) => this.validateResponse(params as ValidateParams),
    })
    
    this.registerTool({
      name: "trackTrends",
      description: "Track QA trends over time",
      parameters: {
        type: "object",
        properties: {
          metric: { type: "string", description: "Metric to track" },
          period: { type: "string", description: "Time period" },
          granularity: { type: "string", enum: ["hour", "day", "week"], description: "Data granularity" },
        },
        required: ["metric"],
      },
      handler: async (params) => this.trackTrends(params as TrendParams),
    })
  }
  
  public async process(input: AgentInput): Promise<AgentOutput> {
    this.log("info", "process", `Processing: ${input.type}`)
    
    try {
      switch (input.type) {
        case "message":
          return await this.handleMessage(input)
        case "event":
          return await this.handleEvent(input)
        case "scheduled":
          return await this.handleScheduledTask(input)
        default:
          return { success: false, error: "Unknown input type" }
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Processing failed" }
    }
  }
  
  private async handleMessage(input: AgentInput): Promise<AgentOutput> {
    const response = await this.generateResponse(input.messages || [])
    return { success: true, response }
  }
  
  private async handleEvent(input: AgentInput): Promise<AgentOutput> {
    const event = input.event
    if (!event) return { success: false, error: "No event" }
    
    switch (event.name) {
      case "conversation_ended":
        return await this.processConversationEnded(event.data)
      case "qa_check_required":
        return await this.processQACheck(event.data)
      default:
        return { success: false, error: `Unknown event: ${event.name}` }
    }
  }
  
  private async handleScheduledTask(input: AgentInput): Promise<AgentOutput> {
    const taskType = input.metadata?.taskType as string
    
    switch (taskType) {
      case "daily_qa_review":
        return await this.runDailyQAReview()
      case "weekly_calibration":
        return await this.runWeeklyCalibration()
      default:
        return { success: false, error: "Unknown task" }
    }
  }
  
  public async handleInterAgentMessage(message: InterAgentMessage): Promise<void> {
    // QA can monitor inter-agent communications
    if (message.type === "response") {
      await this.checkQuality({
        agentId: message.from,
        response: message.payload.content,
        context: message.payload.context,
      })
    }
  }
  
  // =============================================================================
  // QA WORKFLOWS
  // =============================================================================
  
  private async processConversationEnded(data: Record<string, unknown>): Promise<AgentOutput> {
    const audit = await this.auditConversation({
      conversationId: data.conversationId as string,
      agentId: data.agentId as string,
      messages: data.messages as any[],
    })
    
    const score = (audit.data as any)?.overallScore || 0
    
    // Flag if below threshold
    if (score < this.qaConfig.minAcceptableScore) {
      await this.flagIssue({
        agentId: data.agentId as string,
        issueType: "completeness",
        severity: score < 50 ? "major" : "moderate",
        description: `Low QA score: ${score}/100`,
        conversationId: data.conversationId as string,
      })
    }
    
    return { success: true, data: audit.data }
  }
  
  private async processQACheck(data: Record<string, unknown>): Promise<AgentOutput> {
    return await this.checkQuality({
      agentId: data.agentId as string,
      response: data.response as string,
      context: data.context as Record<string, unknown>,
      criteria: data.criteria as string[],
    })
  }
  
  private async runDailyQAReview(): Promise<AgentOutput> {
    const report = await this.generateQAReport({ period: "day", format: "detailed" })
    const trends = await this.trackTrends({ metric: "overall_score", period: "day" })
    const recommendations = await this.recommendImprovement({})
    
    // Send insights to ORACLE
    await this.sendToAgent("ORACLE_BI", "notification", {
      type: "qa_daily_report",
      data: { report: report.data, trends: trends.data },
    })
    
    return {
      success: true,
      response: "Daily QA review completed",
      data: { report: report.data, trends: trends.data, recommendations: recommendations.data },
    }
  }
  
  private async runWeeklyCalibration(): Promise<AgentOutput> {
    const calibration = await this.calibrateScoring({ sampleSize: 50, adjustWeights: true })
    return { success: true, response: "Weekly calibration completed", data: calibration.data }
  }
  
  // =============================================================================
  // TOOL IMPLEMENTATIONS
  // =============================================================================
  
  private async auditConversation(params: AuditParams) {
    const scores: QAScores = {
      accuracy: this.scoreCategory("accuracy", params.messages),
      tone: this.scoreCategory("tone", params.messages),
      compliance: this.scoreCategory("compliance", params.messages),
      completeness: this.scoreCategory("completeness", params.messages),
      empathy: this.scoreCategory("empathy", params.messages),
    }
    
    const weights = this.qaConfig.categoryWeights
    const overallScore = Math.round(
      (scores.accuracy * weights.accuracy +
        scores.tone * weights.tone +
        scores.compliance * weights.compliance +
        scores.completeness * weights.completeness +
        scores.empathy * weights.empathy) * 100
    )
    
    const audit: ConversationAudit = {
      id: `AUDIT-${Date.now()}`,
      conversationId: params.conversationId,
      agentId: params.agentId,
      scores,
      overallScore,
      issues: [],
      recommendations: this.generateAuditRecommendations(scores),
      auditedAt: new Date(),
    }
    
    this.auditLog.push(audit)
    this.updateMetrics(audit)
    
    this.log("info", "auditConversation", `Audit ${params.conversationId}: ${overallScore}/100`)
    
    return { success: true, data: audit }
  }
  
  private async checkQuality(params: QualityParams) {
    const criteria = params.criteria || ["accuracy", "tone", "compliance", "completeness"]
    const results: Record<string, any> = {}
    const issues: string[] = []
    
    criteria.forEach(criterion => {
      const score = this.evaluateCriterion(criterion, params.response)
      results[criterion] = { score, pass: score >= this.qaConfig.minAcceptableScore }
      if (!results[criterion].pass) {
        issues.push(`${criterion}: Score ${score} below threshold`)
      }
    })
    
    const overallPass = issues.length === 0
    
    return {
      success: true,
      data: {
        agentId: params.agentId,
        results,
        issues,
        overallPass,
        overallScore: Math.round(Object.values(results).reduce((sum: number, r: any) => sum + r.score, 0) / criteria.length),
      },
    }
  }
  
  private async flagIssue(params: IssueParams) {
    const issue = {
      id: `ISSUE-${Date.now()}`,
      agentId: params.agentId,
      type: params.issueType,
      severity: params.severity,
      description: params.description,
      conversationId: params.conversationId,
      flaggedAt: new Date(),
    }
    
    // Update metrics
    const count = this.metrics.issuesByCategory.get(params.issueType) || 0
    this.metrics.issuesByCategory.set(params.issueType, count + 1)
    
    this.log("warn", "flagIssue", `Issue flagged: ${params.severity} ${params.issueType}`)
    
    // Escalate critical issues
    if (params.severity === "critical") {
      await this.escalateToHuman("compliance_issue", params.description!, { issue }, "high")
    }
    
    return { success: true, data: issue }
  }
  
  private async generateQAReport(params: ReportParams) {
    const periodDays = { day: 1, week: 7, month: 30 }[params.period || "week"] || 7
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - periodDays)
    
    const recentAudits = this.auditLog.filter(a => a.auditedAt >= cutoff)
    
    const avgScore = recentAudits.length > 0
      ? Math.round(recentAudits.reduce((sum, a) => sum + a.overallScore, 0) / recentAudits.length)
      : 0
    
    const byAgent = new Map<string, number[]>()
    recentAudits.forEach(a => {
      const scores = byAgent.get(a.agentId) || []
      scores.push(a.overallScore)
      byAgent.set(a.agentId, scores)
    })
    
    const agentScores = Array.from(byAgent.entries()).map(([agent, scores]) => ({
      agent,
      avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      audits: scores.length,
    }))
    
    return {
      success: true,
      data: {
        period: params.period || "week",
        totalAudits: recentAudits.length,
        averageScore: avgScore,
        scoreDistribution: {
          excellent: recentAudits.filter(a => a.overallScore >= 90).length,
          good: recentAudits.filter(a => a.overallScore >= 75 && a.overallScore < 90).length,
          acceptable: recentAudits.filter(a => a.overallScore >= 60 && a.overallScore < 75).length,
          poor: recentAudits.filter(a => a.overallScore < 60).length,
        },
        byAgent: agentScores,
        topIssues: Array.from(this.metrics.issuesByCategory.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([type, count]) => ({ type, count })),
        trend: avgScore >= 75 ? "positive" : avgScore >= 60 ? "stable" : "needs_attention",
      },
    }
  }
  
  private async calibrateScoring(params: CalibrateParams) {
    // In production, would use ML to adjust weights based on outcomes
    const calibration = {
      samplesAnalyzed: params.sampleSize || 50,
      currentWeights: { ...this.qaConfig.categoryWeights },
      recommendedWeights: {
        accuracy: 0.25,
        tone: 0.20,
        compliance: 0.25,
        completeness: 0.20,
        empathy: 0.10,
      },
      adjustmentsApplied: params.adjustWeights,
    }
    
    if (params.adjustWeights) {
      this.qaConfig.categoryWeights = calibration.recommendedWeights
    }
    
    return { success: true, data: calibration }
  }
  
  private async recommendImprovement(params: ImprovementParams) {
    const recommendations = []
    
    // Analyze recent issues
    const topIssues = Array.from(this.metrics.issuesByCategory.entries())
      .sort((a, b) => b[1] - a[1])
    
    if (topIssues.length > 0 && topIssues[0][0] === "accuracy") {
      recommendations.push({
        area: "accuracy",
        recommendation: "Review and update agent knowledge base with recent product/service changes",
        priority: "high",
      })
    }
    
    if (topIssues.some(i => i[0] === "tone")) {
      recommendations.push({
        area: "tone",
        recommendation: "Adjust temperature settings for more consistent tone",
        priority: "medium",
      })
    }
    
    if (topIssues.some(i => i[0] === "compliance")) {
      recommendations.push({
        area: "compliance",
        recommendation: "Update system prompts with latest compliance requirements",
        priority: "high",
      })
    }
    
    // General recommendations
    recommendations.push({
      area: "general",
      recommendation: "Consider implementing pre-response validation for high-risk conversations",
      priority: "medium",
    })
    
    return { success: true, data: { recommendations, analysisDate: new Date() } }
  }
  
  private async validateResponse(params: ValidateParams) {
    const checks = [
      { name: "profanity_check", pass: !this.containsProfanity(params.response) },
      { name: "pii_exposure", pass: !this.containsPII(params.response) },
      { name: "competitor_mention", pass: !this.mentionsCompetitors(params.response) },
      { name: "promise_check", pass: !this.containsUnsafePromises(params.response) },
      { name: "length_check", pass: params.response.length <= 2000 },
    ]
    
    const allPass = checks.every(c => c.pass)
    
    return {
      success: true,
      data: {
        valid: allPass,
        checks,
        blockedReason: allPass ? null : checks.filter(c => !c.pass).map(c => c.name).join(", "),
      },
    }
  }
  
  private async trackTrends(params: TrendParams) {
    const dataPoints = []
    const periods = { hour: 24, day: 7, week: 4 }[params.granularity || "day"] || 7
    
    for (let i = 0; i < periods; i++) {
      dataPoints.push({
        period: i,
        value: 70 + Math.random() * 20, // Simulated
      })
    }
    
    return {
      success: true,
      data: {
        metric: params.metric,
        period: params.period || "week",
        granularity: params.granularity || "day",
        dataPoints,
        trend: dataPoints[dataPoints.length - 1].value > dataPoints[0].value ? "improving" : "declining",
      },
    }
  }
  
  // =============================================================================
  // HELPER METHODS
  // =============================================================================
  
  private scoreCategory(category: string, messages: any[]): number {
    // Simplified scoring - in production would use LLM evaluation
    const baseScore = 70 + Math.random() * 25
    return Math.min(100, Math.max(0, baseScore))
  }
  
  private evaluateCriterion(criterion: string, response: string): number {
    // Simplified - would use LLM in production
    return 70 + Math.random() * 25
  }
  
  private generateAuditRecommendations(scores: QAScores): string[] {
    const recommendations = []
    
    if (scores.accuracy < 75) recommendations.push("Review factual accuracy of responses")
    if (scores.tone < 75) recommendations.push("Adjust tone to be more professional/empathetic")
    if (scores.compliance < 75) recommendations.push("Ensure all compliance requirements are met")
    if (scores.completeness < 75) recommendations.push("Provide more complete answers to customer queries")
    if (scores.empathy < 75) recommendations.push("Show more empathy in challenging situations")
    
    return recommendations
  }
  
  private updateMetrics(audit: ConversationAudit): void {
    this.metrics.totalAudits++
    this.metrics.avgScore = Math.round(
      ((this.metrics.avgScore * (this.metrics.totalAudits - 1)) + audit.overallScore) / this.metrics.totalAudits
    )
    
    const agentScores = this.metrics.scoresByAgent.get(audit.agentId) || []
    agentScores.push(audit.overallScore)
    this.metrics.scoresByAgent.set(audit.agentId, agentScores)
  }
  
  private containsProfanity(text: string): boolean {
    const profanityList = ["damn", "hell"] // Simplified
    return profanityList.some(word => text.toLowerCase().includes(word))
  }
  
  private containsPII(text: string): boolean {
    // Check for patterns that look like SSN, credit cards, etc.
    const patterns = [/\d{3}-\d{2}-\d{4}/, /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/]
    return patterns.some(p => p.test(text))
  }
  
  private mentionsCompetitors(text: string): boolean {
    const competitors = ["metro movers", "cbd relocations"]
    return competitors.some(c => text.toLowerCase().includes(c))
  }
  
  private containsUnsafePromises(text: string): boolean {
    const unsafePatterns = ["guarantee", "100%", "promise", "never"]
    return unsafePatterns.some(p => text.toLowerCase().includes(p))
  }
}

// =============================================================================
// TYPES & CONFIG
// =============================================================================

const GUARDIAN_SYSTEM_PROMPT = `You are Guardian, an AI Quality Assurance Agent for M&M Commercial Moving.

## Your Role
- Audit AI agent conversations
- Monitor response quality
- Flag issues and compliance violations
- Generate improvement recommendations
- Track QA trends

## Quality Criteria
- Accuracy: Factually correct responses
- Tone: Professional, friendly, brand-consistent
- Compliance: Follows all policies and regulations
- Completeness: Fully addresses customer needs
- Empathy: Shows understanding and care

## Standards
- Minimum acceptable score: 70/100
- Target score: 85/100
- Critical threshold: 50/100 (immediate escalation)`

interface QAConfig {
  minAcceptableScore: number
  targetScore: number
  categoryWeights: Record<string, number>
}

const DEFAULT_QA_CONFIG: QAConfig = {
  minAcceptableScore: 70,
  targetScore: 85,
  categoryWeights: {
    accuracy: 0.25,
    tone: 0.20,
    compliance: 0.25,
    completeness: 0.20,
    empathy: 0.10,
  },
}

interface QAScores {
  accuracy: number
  tone: number
  compliance: number
  completeness: number
  empathy: number
}

interface ConversationAudit {
  id: string
  conversationId: string
  agentId: string
  scores: QAScores
  overallScore: number
  issues: any[]
  recommendations: string[]
  auditedAt: Date
}

interface QAMetrics {
  totalAudits: number
  avgScore: number
  scoresByAgent: Map<string, number[]>
  issuesByCategory: Map<string, number>
  trendsOverTime: any[]
}

interface AuditParams { conversationId: string; agentId: string; messages?: any[] }
interface QualityParams { agentId: string; response: string; context?: Record<string, unknown>; criteria?: string[] }
interface IssueParams { agentId: string; issueType: string; severity: string; description?: string; conversationId?: string }
interface ReportParams { period?: string; agentFilter?: string; format?: string }
interface CalibrateParams { sampleSize?: number; adjustWeights?: boolean }
interface ImprovementParams { agentId?: string; focusArea?: string }
interface ValidateParams { agentId: string; response: string; context?: Record<string, unknown> }
interface TrendParams { metric: string; period?: string; granularity?: string }

// =============================================================================
// FACTORY
// =============================================================================

let guardianInstance: GuardianAgent | null = null

export function getGuardian(): GuardianAgent {
  if (!guardianInstance) guardianInstance = new GuardianAgent()
  return guardianInstance
}

export function resetGuardian(): void {
  guardianInstance = null
}
