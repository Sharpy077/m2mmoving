/**
 * ECHO - Reputation Management Agent
 * Online reputation monitoring, review generation, and brand sentiment analysis
 */

import { z } from "zod"
import { BaseAgent, type AgentInput, type AgentOutput } from "../base-agent"
import type { AgentIdentity, AgentConfig, InterAgentMessage } from "../types"

// =============================================================================
// ECHO AGENT
// =============================================================================

export class EchoAgent extends BaseAgent {
  private reputationConfig: ReputationConfig
  private reviewQueue: ReviewItem[] = []
  
  constructor(config?: Partial<AgentConfig>) {
    super({
      codename: "ECHO_REP",
      enabled: true,
      model: "gpt-4o",
      temperature: 0.6,
      maxTokens: 1500,
      systemPrompt: ECHO_SYSTEM_PROMPT,
      tools: [
        "monitorReviews",
        "respondToReview",
        "analyzeSentiment",
        "trackMentions",
        "generateReviewResponse",
        "flagCrisis",
        "reportReputationScore",
      ],
      triggers: [
        { event: "new_review", action: "process_review", priority: 1 },
        { event: "brand_mention", action: "analyze_mention", priority: 2 },
        { event: "daily_scan", action: "run_daily_scan", priority: 3 },
      ],
      escalationRules: [
        { condition: "review_rating <= 2", reason: "negative_sentiment", priority: "high" },
        { condition: "viral_negative", reason: "compliance_issue", priority: "urgent" },
      ],
      rateLimits: { requestsPerMinute: 30, tokensPerDay: 250000 },
      ...config,
    })
    
    this.reputationConfig = DEFAULT_REPUTATION_CONFIG
  }
  
  protected getIdentity(): AgentIdentity {
    return {
      codename: "ECHO_REP",
      name: "Echo",
      description: "AI Reputation Agent - Monitors reviews, manages brand sentiment, responds to feedback",
      version: "1.0.0",
      capabilities: [
        "Review Monitoring",
        "Review Response",
        "Sentiment Analysis",
        "Social Listening",
        "Crisis Detection",
        "Reputation Scoring",
        "Competitor Tracking",
      ],
      status: "idle",
    }
  }
  
  protected registerTools(): void {
    this.registerTool({
      name: "monitorReviews",
      description: "Scan for new reviews across platforms",
      parameters: {
        type: "object",
        properties: {
          platforms: { type: "array", description: "Platforms to scan" },
          since: { type: "string", description: "Check since date" },
        },
        required: [],
      },
      handler: async (params) => this.monitorReviews(params as MonitorParams),
    })
    
    this.registerTool({
      name: "respondToReview",
      description: "Post a response to a review",
      parameters: {
        type: "object",
        properties: {
          reviewId: { type: "string", description: "Review ID" },
          platform: { type: "string", description: "Platform" },
          response: { type: "string", description: "Response text" },
          tone: { type: "string", enum: ["grateful", "apologetic", "professional"], description: "Response tone" },
        },
        required: ["reviewId", "platform", "response"],
      },
      handler: async (params) => this.respondToReview(params as ResponseParams),
    })
    
    this.registerTool({
      name: "analyzeSentiment",
      description: "Analyze sentiment of text or reviews",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text to analyze" },
          context: { type: "string", description: "Additional context" },
        },
        required: ["text"],
      },
      handler: async (params) => this.analyzeSentiment(params as SentimentParams),
    })
    
    this.registerTool({
      name: "trackMentions",
      description: "Track brand mentions across social media",
      parameters: {
        type: "object",
        properties: {
          keywords: { type: "array", description: "Keywords to track" },
          platforms: { type: "array", description: "Platforms to monitor" },
        },
        required: ["keywords"],
      },
      handler: async (params) => this.trackMentions(params as MentionParams),
    })
    
    this.registerTool({
      name: "generateReviewResponse",
      description: "Generate a response for a review",
      parameters: {
        type: "object",
        properties: {
          reviewText: { type: "string", description: "Original review" },
          rating: { type: "number", description: "Star rating" },
          customerName: { type: "string", description: "Customer name" },
        },
        required: ["reviewText", "rating"],
      },
      handler: async (params) => this.generateReviewResponse(params as GenerateResponseParams),
    })
    
    this.registerTool({
      name: "flagCrisis",
      description: "Flag a potential reputation crisis",
      parameters: {
        type: "object",
        properties: {
          issue: { type: "string", description: "Issue description" },
          severity: { type: "string", enum: ["low", "medium", "high", "critical"], description: "Severity" },
          source: { type: "string", description: "Source of issue" },
        },
        required: ["issue", "severity"],
      },
      handler: async (params) => this.flagCrisis(params as CrisisParams),
    })
    
    this.registerTool({
      name: "reportReputationScore",
      description: "Generate reputation score report",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["week", "month", "quarter"], description: "Report period" },
          includeCompetitors: { type: "boolean", description: "Include competitor comparison" },
        },
        required: [],
      },
      handler: async (params) => this.reportReputationScore(params as ReportParams),
    })
  }
  
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
      case "new_review":
        return await this.processNewReview(event.data)
      case "brand_mention":
        return await this.processBrandMention(event.data)
      default:
        return { success: false, error: `Unknown event: ${event.name}` }
    }
  }
  
  private async handleScheduledTask(input: AgentInput): Promise<AgentOutput> {
    const taskType = input.metadata?.taskType as string
    if (taskType === "daily_scan") return await this.runDailyScan()
    return { success: false, error: "Unknown task" }
  }
  
  private async handleHandoffInput(input: AgentInput): Promise<AgentOutput> {
    return { success: true, response: "Handoff received" }
  }
  
  public async handleInterAgentMessage(message: InterAgentMessage): Promise<void> {
    this.log("info", "handleInterAgentMessage", `From ${message.from}`)
  }
  
  // =============================================================================
  // REVIEW WORKFLOWS
  // =============================================================================
  
  private async processNewReview(data: Record<string, unknown>): Promise<AgentOutput> {
    const rating = data.rating as number
    const text = data.text as string
    const platform = data.platform as string
    
    // Analyze sentiment
    const sentiment = await this.analyzeSentiment({ text })
    
    // Generate response
    const responseResult = await this.generateReviewResponse({
      reviewText: text,
      rating,
      customerName: data.customerName as string,
    })
    
    // If negative, escalate
    if (rating <= 2) {
      await this.escalateToHuman(
        "negative_sentiment",
        `${rating}-star review on ${platform}: ${text.substring(0, 100)}...`,
        data,
        "high"
      )
    }
    
    // Hand to PHOENIX for follow-up if positive
    if (rating >= 4) {
      await this.requestHandoff("PHOENIX_RET", "Positive review - referral opportunity", data, "low")
    }
    
    return {
      success: true,
      response: "Review processed",
      data: { sentiment: sentiment.data, suggestedResponse: responseResult.data },
    }
  }
  
  private async processBrandMention(data: Record<string, unknown>): Promise<AgentOutput> {
    const sentiment = await this.analyzeSentiment({ text: data.content as string })
    
    if ((sentiment.data as any)?.score < -0.5) {
      await this.flagCrisis({
        issue: data.content as string,
        severity: "medium",
        source: data.platform as string,
      })
    }
    
    return { success: true, response: "Mention processed" }
  }
  
  private async runDailyScan(): Promise<AgentOutput> {
    const reviews = await this.monitorReviews({})
    const score = await this.reportReputationScore({})
    
    return {
      success: true,
      response: "Daily scan completed",
      data: { reviews: reviews.data, score: score.data },
    }
  }
  
  // =============================================================================
  // TOOL IMPLEMENTATIONS
  // =============================================================================
  
  private async monitorReviews(params: MonitorParams) {
    const platforms = params.platforms || ["google", "facebook", "productreview"]
    // In production, integrate with review APIs
    return {
      success: true,
      data: {
        platforms,
        newReviews: 3,
        avgRating: 4.7,
        reviews: [
          { platform: "google", rating: 5, excerpt: "Excellent service!" },
          { platform: "google", rating: 4, excerpt: "Good move, minor delay" },
          { platform: "facebook", rating: 5, excerpt: "Highly recommend!" },
        ],
      },
    }
  }
  
  private async respondToReview(params: ResponseParams) {
    this.log("info", "respondToReview", `Responding on ${params.platform}`)
    return { success: true, data: { reviewId: params.reviewId, status: "posted" } }
  }
  
  private async analyzeSentiment(params: SentimentParams) {
    const text = params.text.toLowerCase()
    let score = 0
    
    const positive = ["excellent", "great", "amazing", "wonderful", "recommend", "professional"]
    const negative = ["terrible", "awful", "worst", "damage", "late", "unprofessional"]
    
    positive.forEach(w => { if (text.includes(w)) score += 0.2 })
    negative.forEach(w => { if (text.includes(w)) score -= 0.3 })
    
    return {
      success: true,
      data: {
        score: Math.max(-1, Math.min(1, score)),
        sentiment: score > 0.2 ? "positive" : score < -0.2 ? "negative" : "neutral",
        keywords: [...positive, ...negative].filter(w => text.includes(w)),
      },
    }
  }
  
  private async trackMentions(params: MentionParams) {
    return {
      success: true,
      data: { keywords: params.keywords, mentions: 12, sentiment: "mostly_positive" },
    }
  }
  
  private async generateReviewResponse(params: GenerateResponseParams) {
    const { rating, customerName, reviewText } = params
    const name = customerName || "there"
    
    let response: string
    if (rating >= 4) {
      response = `Thank you so much for the wonderful feedback${name !== "there" ? `, ${name}` : ""}! We're thrilled to hear your move went smoothly. Your recommendation means the world to us! 🌟`
    } else if (rating === 3) {
      response = `Thank you for your feedback${name !== "there" ? `, ${name}` : ""}. We appreciate you sharing your experience and would love to learn more about how we can improve. Please reach out to us at support@m2mmoving.au.`
    } else {
      response = `We're truly sorry to hear about your experience${name !== "there" ? `, ${name}` : ""}. This doesn't reflect the standard we strive for. Please contact us at 03 8820 1801 so we can make this right.`
    }
    
    return { success: true, data: { response, tone: rating >= 4 ? "grateful" : rating >= 3 ? "professional" : "apologetic" } }
  }
  
  private async flagCrisis(params: CrisisParams) {
    this.log("warn", "flagCrisis", `Crisis flagged: ${params.severity}`, params)
    
    if (params.severity === "critical" || params.severity === "high") {
      await this.escalateToHuman("compliance_issue", params.issue, params, "urgent")
    }
    
    return { success: true, data: { crisisId: this.generateId(), severity: params.severity, status: "flagged" } }
  }
  
  private async reportReputationScore(params: ReportParams) {
    return {
      success: true,
      data: {
        overallScore: 4.7,
        totalReviews: 47,
        distribution: { "5": 32, "4": 10, "3": 3, "2": 1, "1": 1 },
        trend: "+0.2 vs last period",
        platforms: {
          google: { score: 4.8, reviews: 28 },
          facebook: { score: 4.6, reviews: 12 },
          productreview: { score: 4.5, reviews: 7 },
        },
      },
    }
  }
}

// =============================================================================
// TYPES & CONFIG
// =============================================================================

const ECHO_SYSTEM_PROMPT = `You are Echo, an AI Reputation Management Agent for M&M Commercial Moving.

## Your Role
- Monitor and respond to online reviews
- Track brand mentions and sentiment
- Detect and flag reputation crises
- Generate appropriate review responses
- Maintain brand voice consistency

## Response Guidelines
- 5 stars: Thank enthusiastically, invite referral
- 4 stars: Thank, address any minor concerns
- 3 stars: Thank, apologize, offer to improve
- 1-2 stars: Sincere apology, take offline immediately

## Always maintain:
- Professional, empathetic tone
- Australian English
- Brand voice consistency
- Quick response times`

interface ReputationConfig {
  platforms: string[]
  responseTimeTarget: number // hours
  alertThreshold: number // rating
}

const DEFAULT_REPUTATION_CONFIG: ReputationConfig = {
  platforms: ["google", "facebook", "productreview", "trustpilot"],
  responseTimeTarget: 24,
  alertThreshold: 2,
}

interface ReviewItem {
  id: string
  platform: string
  rating: number
  text: string
  date: Date
  responded: boolean
}

interface MonitorParams { platforms?: string[]; since?: string }
interface ResponseParams { reviewId: string; platform: string; response: string; tone?: string }
interface SentimentParams { text: string; context?: string }
interface MentionParams { keywords: string[]; platforms?: string[] }
interface GenerateResponseParams { reviewText: string; rating: number; customerName?: string }
interface CrisisParams { issue: string; severity: string; source?: string }
interface ReportParams { period?: string; includeCompetitors?: boolean }

// =============================================================================
// FACTORY
// =============================================================================

let echoInstance: EchoAgent | null = null

export function getEcho(): EchoAgent {
  if (!echoInstance) echoInstance = new EchoAgent()
  return echoInstance
}

export function resetEcho(): void {
  echoInstance = null
}

