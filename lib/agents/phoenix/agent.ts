/**
 * PHOENIX - Retention & Loyalty Agent
 * Customer re-engagement, referral programs, and lifetime value maximization
 */

import { z } from "zod"
import { BaseAgent, type AgentInput, type AgentOutput, type AgentAction } from "../base-agent"
import type {
  AgentIdentity,
  AgentConfig,
  InterAgentMessage,
  CustomerProfile,
  AgentMessage,
} from "../types"

// =============================================================================
// PHOENIX AGENT
// =============================================================================

export class PhoenixAgent extends BaseAgent {
  private retentionConfig: RetentionConfig
  private customerJourneys: Map<string, CustomerJourney> = new Map()
  
  constructor(config?: Partial<AgentConfig>) {
    super({
      codename: "PHOENIX_RET",
      enabled: true,
      model: "gpt-4o",
      temperature: 0.7,
      maxTokens: 1500,
      systemPrompt: PHOENIX_SYSTEM_PROMPT,
      tools: [
        "sendSatisfactionSurvey",
        "requestReview",
        "sendReferralInvite",
        "offerLoyaltyReward",
        "createWinBackCampaign",
        "trackNPS",
        "scheduleAnniversaryOutreach",
        "generateTestimonialRequest",
      ],
      triggers: [
        { event: "move_completed", action: "initiate_post_move_sequence", priority: 1 },
        { event: "nps_received", action: "process_nps", priority: 1 },
        { event: "customer_anniversary", action: "anniversary_outreach", priority: 2 },
      ],
      escalationRules: [
        { condition: "nps_score <= 6", reason: "negative_sentiment", priority: "high" },
        { condition: "churn_risk_high", reason: "high_value_deal", priority: "medium" },
      ],
      rateLimits: {
        requestsPerMinute: 20,
        tokensPerDay: 200000,
      },
      ...config,
    })
    
    this.retentionConfig = DEFAULT_RETENTION_CONFIG
  }
  
  protected getIdentity(): AgentIdentity {
    return {
      codename: "PHOENIX_RET",
      name: "Phoenix",
      description: "AI Retention Agent - Manages customer loyalty, referrals, and re-engagement",
      version: "1.0.0",
      capabilities: [
        "Satisfaction Surveys",
        "Review Requests",
        "Referral Programs",
        "Loyalty Rewards",
        "Win-Back Campaigns",
        "NPS Tracking",
        "Anniversary Outreach",
        "Testimonial Collection",
      ],
      status: "idle",
    }
  }
  
  protected registerTools(): void {
    this.registerTool({
      name: "sendSatisfactionSurvey",
      description: "Send a customer satisfaction survey",
      parameters: {
        type: "object",
        properties: {
          customerId: { type: "string", description: "Customer ID" },
          bookingId: { type: "string", description: "Booking/Job ID" },
          channel: { type: "string", enum: ["email", "sms"], description: "Delivery channel" },
          surveyType: { type: "string", enum: ["csat", "nps", "detailed"], description: "Survey type" },
        },
        required: ["customerId"],
      },
      handler: async (params) => this.sendSatisfactionSurvey(params as SurveyParams),
    })
    
    this.registerTool({
      name: "requestReview",
      description: "Request a review from a satisfied customer",
      parameters: {
        type: "object",
        properties: {
          customerId: { type: "string", description: "Customer ID" },
          platform: { type: "string", enum: ["google", "facebook", "productreview"], description: "Review platform" },
          incentive: { type: "string", description: "Optional incentive to offer" },
        },
        required: ["customerId", "platform"],
      },
      handler: async (params) => this.requestReview(params as ReviewParams),
    })
    
    this.registerTool({
      name: "sendReferralInvite",
      description: "Send a referral program invitation",
      parameters: {
        type: "object",
        properties: {
          customerId: { type: "string", description: "Customer ID" },
          programType: { type: "string", enum: ["standard", "vip", "business"], description: "Referral program tier" },
          referralCode: { type: "string", description: "Custom referral code" },
        },
        required: ["customerId"],
      },
      handler: async (params) => this.sendReferralInvite(params as ReferralParams),
    })
    
    this.registerTool({
      name: "offerLoyaltyReward",
      description: "Offer a loyalty reward to a customer",
      parameters: {
        type: "object",
        properties: {
          customerId: { type: "string", description: "Customer ID" },
          rewardType: { type: "string", enum: ["discount", "credit", "upgrade", "gift"], description: "Reward type" },
          value: { type: "number", description: "Reward value" },
          reason: { type: "string", description: "Reason for reward" },
        },
        required: ["customerId", "rewardType"],
      },
      handler: async (params) => this.offerLoyaltyReward(params as RewardParams),
    })
    
    this.registerTool({
      name: "createWinBackCampaign",
      description: "Create a win-back campaign for churned/inactive customers",
      parameters: {
        type: "object",
        properties: {
          customerIds: { type: "array", description: "List of customer IDs" },
          campaignType: { type: "string", enum: ["discount", "personal_outreach", "new_service"], description: "Campaign type" },
          offerValue: { type: "number", description: "Discount/offer value" },
        },
        required: ["customerIds", "campaignType"],
      },
      handler: async (params) => this.createWinBackCampaign(params as WinBackParams),
    })
    
    this.registerTool({
      name: "trackNPS",
      description: "Record and process an NPS score",
      parameters: {
        type: "object",
        properties: {
          customerId: { type: "string", description: "Customer ID" },
          score: { type: "number", description: "NPS score (0-10)" },
          feedback: { type: "string", description: "Customer feedback" },
          bookingId: { type: "string", description: "Related booking" },
        },
        required: ["customerId", "score"],
      },
      handler: async (params) => this.trackNPS(params as NPSParams),
    })
    
    this.registerTool({
      name: "scheduleAnniversaryOutreach",
      description: "Schedule anniversary milestone outreach",
      parameters: {
        type: "object",
        properties: {
          customerId: { type: "string", description: "Customer ID" },
          anniversaryType: { type: "string", enum: ["move", "first_contact", "referral"], description: "Anniversary type" },
          message: { type: "string", description: "Custom message" },
        },
        required: ["customerId", "anniversaryType"],
      },
      handler: async (params) => this.scheduleAnniversaryOutreach(params as AnniversaryParams),
    })
    
    this.registerTool({
      name: "generateTestimonialRequest",
      description: "Generate and send a testimonial request",
      parameters: {
        type: "object",
        properties: {
          customerId: { type: "string", description: "Customer ID" },
          format: { type: "string", enum: ["written", "video", "case_study"], description: "Testimonial format" },
          incentive: { type: "string", description: "Optional incentive" },
        },
        required: ["customerId"],
      },
      handler: async (params) => this.generateTestimonialRequest(params as TestimonialParams),
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
      this.log("error", "process", `Processing failed: ${error}`)
      return { success: false, error: error instanceof Error ? error.message : "Processing failed" }
    }
  }
  
  private async handleMessage(input: AgentInput): Promise<AgentOutput> {
    const response = await this.generateResponse(input.messages || [])
    return { success: true, response }
  }
  
  private async handleEvent(input: AgentInput): Promise<AgentOutput> {
    const event = input.event
    if (!event) return { success: false, error: "No event provided" }
    
    switch (event.name) {
      case "move_completed":
        return await this.initiatePostMoveSequence(event.data)
      case "nps_received":
        return await this.processNPSResponse(event.data)
      case "customer_anniversary":
        return await this.handleAnniversary(event.data)
      case "referral_completed":
        return await this.handleReferralCompleted(event.data)
      default:
        return { success: false, error: `Unknown event: ${event.name}` }
    }
  }
  
  private async handleScheduledTask(input: AgentInput): Promise<AgentOutput> {
    const taskType = input.metadata?.taskType as string
    
    switch (taskType) {
      case "daily_retention_check":
        return await this.runDailyRetentionCheck()
      case "win_back_sequence":
        return await this.processWinBackSequence()
      default:
        return { success: false, error: `Unknown task: ${taskType}` }
    }
  }
  
  private async handleHandoffInput(input: AgentInput): Promise<AgentOutput> {
    const handoff = input.handoff
    if (!handoff) return { success: false, error: "No handoff data" }
    
    // Handle handoffs from SENTINEL (positive feedback) or MAYA (deal won)
    if (handoff.fromAgent === "SENTINEL_CS" || handoff.fromAgent === "MAYA_SALES") {
      return await this.initiatePostMoveSequence(handoff.context)
    }
    
    return { success: true, response: "Handoff received" }
  }
  
  public async handleInterAgentMessage(message: InterAgentMessage): Promise<void> {
    this.log("info", "handleInterAgentMessage", `Message from ${message.from}`)
  }
  
  // =============================================================================
  // RETENTION WORKFLOWS
  // =============================================================================
  
  private async initiatePostMoveSequence(data: Record<string, unknown>): Promise<AgentOutput> {
    const customerId = data.customerId as string
    const bookingId = data.bookingId as string
    
    const journey: CustomerJourney = {
      customerId,
      bookingId,
      stage: "post_move",
      startedAt: new Date(),
      actions: [],
    }
    
    // Schedule sequence
    const sequence = this.retentionConfig.postMoveSequence
    
    // Day 1: Thank you
    journey.actions.push({ type: "thank_you_email", scheduledFor: new Date(), status: "pending" })
    
    // Day 7: Satisfaction survey
    const day7 = new Date()
    day7.setDate(day7.getDate() + 7)
    journey.actions.push({ type: "satisfaction_survey", scheduledFor: day7, status: "pending" })
    
    // Day 30: Review request
    const day30 = new Date()
    day30.setDate(day30.getDate() + 30)
    journey.actions.push({ type: "review_request", scheduledFor: day30, status: "pending" })
    
    // Day 90: Referral invite
    const day90 = new Date()
    day90.setDate(day90.getDate() + 90)
    journey.actions.push({ type: "referral_invite", scheduledFor: day90, status: "pending" })
    
    this.customerJourneys.set(customerId, journey)
    
    // Hand off to AURORA for content
    await this.requestHandoff("AURORA_MKT", "Create thank you email content", { customerId, bookingId }, "low")
    
    return {
      success: true,
      response: "Post-move retention sequence initiated",
      data: { journey },
    }
  }
  
  private async processNPSResponse(data: Record<string, unknown>): Promise<AgentOutput> {
    const score = data.score as number
    const customerId = data.customerId as string
    
    if (score >= 9) {
      // Promoter - request review and referral
      await this.requestReview({ customerId, platform: "google" })
      await this.sendReferralInvite({ customerId })
      return { success: true, response: "Promoter flow initiated" }
    } else if (score >= 7) {
      // Passive - offer incentive
      await this.offerLoyaltyReward({ customerId, rewardType: "discount", value: 10, reason: "loyalty" })
      return { success: true, response: "Passive customer incentive sent" }
    } else {
      // Detractor - escalate
      await this.escalateToHuman("negative_sentiment", `Detractor NPS: ${score}`, data, "high")
      return { success: true, response: "Detractor escalated for recovery" }
    }
  }
  
  private async handleAnniversary(data: Record<string, unknown>): Promise<AgentOutput> {
    const customerId = data.customerId as string
    await this.scheduleAnniversaryOutreach({ customerId, anniversaryType: "move" })
    return { success: true, response: "Anniversary outreach scheduled" }
  }
  
  private async handleReferralCompleted(data: Record<string, unknown>): Promise<AgentOutput> {
    const referrerId = data.referrerId as string
    await this.offerLoyaltyReward({ customerId: referrerId, rewardType: "credit", value: 100, reason: "referral" })
    return { success: true, response: "Referral reward issued" }
  }
  
  private async runDailyRetentionCheck(): Promise<AgentOutput> {
    // Check for customers due for outreach
    return { success: true, response: "Daily retention check completed" }
  }
  
  private async processWinBackSequence(): Promise<AgentOutput> {
    return { success: true, response: "Win-back sequence processed" }
  }
  
  // =============================================================================
  // TOOL IMPLEMENTATIONS
  // =============================================================================
  
  private async sendSatisfactionSurvey(params: SurveyParams) {
    this.log("info", "sendSatisfactionSurvey", `Sending ${params.surveyType || "nps"} survey`, params)
    return {
      success: true,
      data: { surveyId: this.generateId(), status: "sent", channel: params.channel || "email" },
    }
  }
  
  private async requestReview(params: ReviewParams) {
    this.log("info", "requestReview", `Requesting ${params.platform} review`, params)
    return {
      success: true,
      data: { requestId: this.generateId(), platform: params.platform, status: "sent" },
    }
  }
  
  private async sendReferralInvite(params: ReferralParams) {
    const referralCode = params.referralCode || `REF-${params.customerId.slice(0, 8).toUpperCase()}`
    this.log("info", "sendReferralInvite", `Sending referral invite`, params)
    return {
      success: true,
      data: { referralCode, programType: params.programType || "standard", status: "sent" },
    }
  }
  
  private async offerLoyaltyReward(params: RewardParams) {
    this.log("info", "offerLoyaltyReward", `Offering ${params.rewardType} reward`, params)
    return {
      success: true,
      data: { rewardId: this.generateId(), type: params.rewardType, value: params.value, status: "issued" },
    }
  }
  
  private async createWinBackCampaign(params: WinBackParams) {
    this.log("info", "createWinBackCampaign", `Creating win-back campaign for ${params.customerIds.length} customers`)
    return {
      success: true,
      data: { campaignId: this.generateId(), customersTargeted: params.customerIds.length, status: "created" },
    }
  }
  
  private async trackNPS(params: NPSParams) {
    const category = params.score >= 9 ? "promoter" : params.score >= 7 ? "passive" : "detractor"
    this.log("info", "trackNPS", `NPS ${params.score} (${category})`, params)
    return {
      success: true,
      data: { score: params.score, category, feedback: params.feedback },
    }
  }
  
  private async scheduleAnniversaryOutreach(params: AnniversaryParams) {
    this.log("info", "scheduleAnniversaryOutreach", `Scheduling ${params.anniversaryType} anniversary`, params)
    return {
      success: true,
      data: { outreachId: this.generateId(), type: params.anniversaryType, status: "scheduled" },
    }
  }
  
  private async generateTestimonialRequest(params: TestimonialParams) {
    this.log("info", "generateTestimonialRequest", `Requesting ${params.format || "written"} testimonial`, params)
    return {
      success: true,
      data: { requestId: this.generateId(), format: params.format || "written", status: "sent" },
    }
  }
}

// =============================================================================
// TYPES & CONFIG
// =============================================================================

const PHOENIX_SYSTEM_PROMPT = `You are Phoenix, an AI Retention Agent for M&M Commercial Moving.

## Your Role
Maximize customer lifetime value through:
- Post-move follow-up and satisfaction tracking
- Review and testimonial collection
- Referral program management
- Win-back campaigns for inactive customers
- Loyalty rewards and recognition

## Key Principles
- Every satisfied customer is a potential referral source
- Address negative feedback immediately
- Celebrate milestones and anniversaries
- Personalize all outreach
- Track NPS religiously

## NPS Response Strategy
- Promoters (9-10): Request reviews, referrals, testimonials
- Passives (7-8): Offer incentives, ask for feedback
- Detractors (0-6): Immediate escalation, recovery attempt`

interface RetentionConfig {
  postMoveSequence: SequenceStep[]
  winBackThreshold: number // Days inactive
  referralReward: number
  npsTarget: number
}

interface SequenceStep {
  day: number
  action: string
  channel: string
}

const DEFAULT_RETENTION_CONFIG: RetentionConfig = {
  postMoveSequence: [
    { day: 1, action: "thank_you", channel: "email" },
    { day: 7, action: "satisfaction_survey", channel: "email" },
    { day: 30, action: "review_request", channel: "email" },
    { day: 90, action: "referral_invite", channel: "email" },
    { day: 365, action: "anniversary", channel: "email" },
  ],
  winBackThreshold: 180,
  referralReward: 100,
  npsTarget: 50,
}

interface CustomerJourney {
  customerId: string
  bookingId?: string
  stage: string
  startedAt: Date
  actions: JourneyAction[]
}

interface JourneyAction {
  type: string
  scheduledFor: Date
  completedAt?: Date
  status: "pending" | "completed" | "skipped"
}

interface SurveyParams { customerId: string; bookingId?: string; channel?: string; surveyType?: string }
interface ReviewParams { customerId: string; platform: string; incentive?: string }
interface ReferralParams { customerId: string; programType?: string; referralCode?: string }
interface RewardParams { customerId: string; rewardType: string; value?: number; reason?: string }
interface WinBackParams { customerIds: string[]; campaignType: string; offerValue?: number }
interface NPSParams { customerId: string; score: number; feedback?: string; bookingId?: string }
interface AnniversaryParams { customerId: string; anniversaryType: string; message?: string }
interface TestimonialParams { customerId: string; format?: string; incentive?: string }

// =============================================================================
// FACTORY
// =============================================================================

let phoenixInstance: PhoenixAgent | null = null

export function getPhoenix(): PhoenixAgent {
  if (!phoenixInstance) phoenixInstance = new PhoenixAgent()
  return phoenixInstance
}

export function resetPhoenix(): void {
  phoenixInstance = null
}
