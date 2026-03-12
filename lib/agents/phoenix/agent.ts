import { BaseAgent, type AgentInput, type AgentOutput } from "../base-agent"
import type { AgentIdentity, AgentConfig, InterAgentMessage } from "../types"
import * as db from "./db"

// =============================================================================
// PHOENIX AGENT
// =============================================================================

export class PhoenixAgent extends BaseAgent {
  private retentionConfig: RetentionConfig

  constructor(config?: Partial<AgentConfig>) {
    super({
      codename: "PHOENIX_RET",
      enabled: true,
      model: "anthropic/claude-sonnet-4-20250514",
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
          customerEmail: { type: "string", description: "Customer email" },
          customerName: { type: "string", description: "Customer name" },
          bookingId: { type: "string", description: "Booking/Job ID" },
          channel: { type: "string", enum: ["email", "sms"], description: "Delivery channel" },
          surveyType: { type: "string", enum: ["csat", "nps", "detailed"], description: "Survey type" },
        },
        required: ["customerEmail"],
      },
      handler: async (params) => this.sendSatisfactionSurvey(params as SurveyParams),
    })

    this.registerTool({
      name: "requestReview",
      description: "Request a review from a satisfied customer",
      parameters: {
        type: "object",
        properties: {
          customerEmail: { type: "string", description: "Customer email" },
          customerName: { type: "string", description: "Customer name" },
          platform: { type: "string", enum: ["google", "facebook", "productreview"], description: "Review platform" },
          incentive: { type: "string", description: "Optional incentive to offer" },
        },
        required: ["customerEmail", "platform"],
      },
      handler: async (params) => this.requestReview(params as ReviewParams),
    })

    this.registerTool({
      name: "sendReferralInvite",
      description: "Send a referral program invitation",
      parameters: {
        type: "object",
        properties: {
          customerEmail: { type: "string", description: "Customer email" },
          customerName: { type: "string", description: "Customer name" },
          programType: { type: "string", enum: ["standard", "vip", "business"], description: "Referral program tier" },
        },
        required: ["customerEmail"],
      },
      handler: async (params) => this.sendReferralInvite(params as ReferralParams),
    })

    this.registerTool({
      name: "offerLoyaltyReward",
      description: "Offer a loyalty reward to a customer",
      parameters: {
        type: "object",
        properties: {
          customerEmail: { type: "string", description: "Customer email" },
          customerName: { type: "string", description: "Customer name" },
          rewardType: { type: "string", enum: ["discount", "credit", "upgrade", "gift"], description: "Reward type" },
          value: { type: "number", description: "Reward value" },
          reason: { type: "string", description: "Reason for reward" },
        },
        required: ["customerEmail", "rewardType", "reason"],
      },
      handler: async (params) => this.offerLoyaltyReward(params as RewardParams),
    })

    this.registerTool({
      name: "createWinBackCampaign",
      description: "Create a win-back campaign for churned/inactive customers",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Campaign name" },
          customerEmails: { type: "array", description: "List of customer emails" },
          campaignType: {
            type: "string",
            enum: ["discount", "personal_outreach", "new_service"],
            description: "Campaign type",
          },
          offerValue: { type: "number", description: "Discount/offer value" },
        },
        required: ["name", "campaignType"],
      },
      handler: async (params) => this.createWinBackCampaign(params as WinBackParams),
    })

    this.registerTool({
      name: "trackNPS",
      description: "Record and process an NPS score",
      parameters: {
        type: "object",
        properties: {
          customerEmail: { type: "string", description: "Customer email" },
          customerName: { type: "string", description: "Customer name" },
          score: { type: "number", description: "NPS score (0-10)" },
          feedback: { type: "string", description: "Customer feedback" },
          bookingId: { type: "string", description: "Related booking" },
        },
        required: ["customerEmail", "score"],
      },
      handler: async (params) => this.trackNPS(params as NPSParams),
    })

    this.registerTool({
      name: "scheduleAnniversaryOutreach",
      description: "Schedule anniversary milestone outreach",
      parameters: {
        type: "object",
        properties: {
          customerEmail: { type: "string", description: "Customer email" },
          customerName: { type: "string", description: "Customer name" },
          anniversaryType: {
            type: "string",
            enum: ["move", "first_contact", "referral"],
            description: "Anniversary type",
          },
          message: { type: "string", description: "Custom message" },
        },
        required: ["customerEmail", "anniversaryType"],
      },
      handler: async (params) => this.scheduleAnniversaryOutreach(params as AnniversaryParams),
    })

    this.registerTool({
      name: "generateTestimonialRequest",
      description: "Generate and send a testimonial request",
      parameters: {
        type: "object",
        properties: {
          customerEmail: { type: "string", description: "Customer email" },
          customerName: { type: "string", description: "Customer name" },
          format: { type: "string", enum: ["written", "video", "case_study"], description: "Testimonial format" },
          incentive: { type: "string", description: "Optional incentive" },
        },
        required: ["customerEmail"],
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
      case "process_pending_actions":
        return await this.processPendingActions()
      default:
        return { success: false, error: `Unknown task: ${taskType}` }
    }
  }

  private async handleHandoffInput(input: AgentInput): Promise<AgentOutput> {
    const handoff = input.handoff
    if (!handoff) return { success: false, error: "No handoff data" }

    if (handoff.fromAgent === "SENTINEL_CS" || handoff.fromAgent === "MAYA_SALES") {
      return await this.initiatePostMoveSequence(handoff.context)
    }

    return { success: true, response: "Handoff received" }
  }

  public async handleInterAgentMessage(message: InterAgentMessage): Promise<void> {
    this.log("info", "handleInterAgentMessage", `Message from ${message.from}`)
  }

  // =============================================================================
  // RETENTION WORKFLOWS - Using Database
  // =============================================================================

  private async initiatePostMoveSequence(data: Record<string, unknown>): Promise<AgentOutput> {
    const customerEmail = data.customerEmail as string
    const customerName = data.customerName as string
    const bookingId = data.bookingId as string

    const journey = await db.createJourney({
      customer_email: customerEmail,
      customer_name: customerName,
      booking_id: bookingId,
      stage: "post_move",
      metadata: { source: "move_completed_event" },
    })

    if (!journey) {
      return { success: false, error: "Failed to create customer journey" }
    }

    // Schedule sequence actions
    const sequence = this.retentionConfig.postMoveSequence
    for (const step of sequence) {
      const scheduledDate = new Date()
      scheduledDate.setDate(scheduledDate.getDate() + step.day)

      await db.scheduleJourneyAction({
        journey_id: journey.id,
        action_type: step.action,
        scheduled_for: scheduledDate,
      })
    }

    // Update journey with next action
    const nextAction = sequence[0]
    const nextActionDate = new Date()
    nextActionDate.setDate(nextActionDate.getDate() + nextAction.day)

    await db.updateJourney(journey.id, {
      next_action_at: nextActionDate.toISOString(),
      next_action_type: nextAction.action,
    })

    this.log("info", "initiatePostMoveSequence", `Created journey ${journey.id} for ${customerEmail}`)

    return {
      success: true,
      response: "Post-move retention sequence initiated",
      data: { journeyId: journey.id, customerId: customerEmail },
    }
  }

  private async processNPSResponse(data: Record<string, unknown>): Promise<AgentOutput> {
    const score = data.score as number
    const customerEmail = data.customerEmail as string
    const customerName = data.customerName as string
    const feedback = data.feedback as string

    const nps = await db.recordNPSScore({
      customer_email: customerEmail,
      customer_name: customerName,
      score,
      feedback,
    })

    if (!nps) {
      return { success: false, error: "Failed to record NPS score" }
    }

    if (score >= 9) {
      // Promoter - request review and referral
      await this.requestReview({ customerEmail, customerName, platform: "google" })
      await this.sendReferralInvite({ customerEmail, customerName })
      await db.updateNPSFollowUp(nps.id, "promoter_flow", "review_and_referral_sent")
      return { success: true, response: "Promoter flow initiated" }
    } else if (score >= 7) {
      // Passive - offer incentive
      await this.offerLoyaltyReward({
        customerEmail,
        customerName,
        rewardType: "discount",
        value: 10,
        reason: "Thank you for your feedback",
      })
      await db.updateNPSFollowUp(nps.id, "passive_flow", "loyalty_reward_sent")
      return { success: true, response: "Passive customer incentive sent" }
    } else {
      // Detractor - escalate
      await this.escalateToHuman("negative_sentiment", `Detractor NPS: ${score}`, data, "high")
      await db.updateNPSFollowUp(nps.id, "detractor_flow", "escalated_to_human")
      return { success: true, response: "Detractor escalated for recovery" }
    }
  }

  private async handleAnniversary(data: Record<string, unknown>): Promise<AgentOutput> {
    const customerEmail = data.customerEmail as string
    const customerName = data.customerName as string
    await this.scheduleAnniversaryOutreach({ customerEmail, customerName, anniversaryType: "move" })
    return { success: true, response: "Anniversary outreach scheduled" }
  }

  private async handleReferralCompleted(data: Record<string, unknown>): Promise<AgentOutput> {
    const referralCode = data.referralCode as string
    const referredEmail = data.referredEmail as string
    const referredName = data.referredName as string

    const referral = await db.convertReferral(referralCode, referredEmail, referredName)

    if (referral) {
      // Issue reward to referrer
      await db.issueReferralReward(referral.id, "credit", this.retentionConfig.referralReward)

      // Also issue loyalty reward
      await this.offerLoyaltyReward({
        customerEmail: referral.referrer_email,
        customerName: referral.referrer_name,
        rewardType: "credit",
        value: this.retentionConfig.referralReward,
        reason: "Successful referral",
      })
    }

    return { success: true, response: "Referral reward issued" }
  }

  private async runDailyRetentionCheck(): Promise<AgentOutput> {
    // Process any pending journey actions
    return await this.processPendingActions()
  }

  private async processPendingActions(): Promise<AgentOutput> {
    const pendingActions = await db.getPendingActions()

    let processed = 0
    for (const action of pendingActions) {
      try {
        // Execute action based on type
        switch (action.action_type) {
          case "thank_you":
            // Send thank you email (would integrate with email service)
            break
          case "satisfaction_survey":
            // Send survey
            break
          case "review_request":
            // Send review request
            break
          case "referral_invite":
            // Send referral invite
            break
          case "anniversary":
            // Send anniversary message
            break
        }

        await db.completeAction(action.id, { status: "executed" })
        processed++
      } catch (error) {
        this.log("error", "processPendingActions", `Failed to process action ${action.id}: ${error}`)
      }
    }

    return { success: true, response: `Processed ${processed} pending actions` }
  }

  private async processWinBackSequence(): Promise<AgentOutput> {
    return { success: true, response: "Win-back sequence processed" }
  }

  // =============================================================================
  // TOOL IMPLEMENTATIONS - Using Database
  // =============================================================================

  private async sendSatisfactionSurvey(params: SurveyParams) {
    this.log(
      "info",
      "sendSatisfactionSurvey",
      `Sending ${params.surveyType || "nps"} survey to ${params.customerEmail}`,
    )

    // Get or create customer journey
    let journey = await db.getJourneyByCustomer(params.customerEmail)
    if (!journey) {
      journey = await db.createJourney({
        customer_email: params.customerEmail,
        customer_name: params.customerName,
        stage: "survey",
      })
    }

    return {
      success: true,
      data: {
        surveyId: this.generateId(),
        journeyId: journey?.id,
        status: "sent",
        channel: params.channel || "email",
      },
    }
  }

  private async requestReview(params: ReviewParams) {
    this.log("info", "requestReview", `Requesting ${params.platform} review from ${params.customerEmail}`)

    const request = await db.createReviewRequest({
      customer_email: params.customerEmail,
      customer_name: params.customerName,
      platform: params.platform,
      incentive_offered: params.incentive,
    })

    return {
      success: true,
      data: {
        requestId: request?.id || this.generateId(),
        platform: params.platform,
        status: "sent",
      },
    }
  }

  private async sendReferralInvite(params: ReferralParams) {
    this.log("info", "sendReferralInvite", `Sending referral invite to ${params.customerEmail}`)

    const referral = await db.createReferral({
      referrer_email: params.customerEmail,
      referrer_name: params.customerName,
      program_type: params.programType,
    })

    return {
      success: true,
      data: {
        referralCode: referral?.referral_code || `REF-${params.customerEmail.slice(0, 8).toUpperCase()}`,
        programType: params.programType || "standard",
        status: "sent",
      },
    }
  }

  private async offerLoyaltyReward(params: RewardParams) {
    this.log("info", "offerLoyaltyReward", `Offering ${params.rewardType} reward to ${params.customerEmail}`)

    const reward = await db.issueReward({
      customer_email: params.customerEmail,
      customer_name: params.customerName,
      reward_type: params.rewardType,
      reward_value: params.value || 0,
      reason: params.reason,
    })

    return {
      success: true,
      data: {
        rewardId: reward?.id || this.generateId(),
        code: reward?.code,
        type: params.rewardType,
        value: params.value,
        status: "issued",
      },
    }
  }

  private async createWinBackCampaign(params: WinBackParams) {
    this.log("info", "createWinBackCampaign", `Creating win-back campaign: ${params.name}`)

    const campaign = await db.createWinBackCampaign({
      name: params.name,
      campaign_type: params.campaignType,
      offer_value: params.offerValue,
      target_customer_ids: params.customerEmails,
    })

    return {
      success: true,
      data: {
        campaignId: campaign?.id || this.generateId(),
        customersTargeted: params.customerEmails?.length || 0,
        status: "created",
      },
    }
  }

  private async trackNPS(params: NPSParams) {
    const category = params.score >= 9 ? "promoter" : params.score >= 7 ? "passive" : "detractor"
    this.log("info", "trackNPS", `NPS ${params.score} (${category}) from ${params.customerEmail}`)

    const nps = await db.recordNPSScore({
      customer_email: params.customerEmail,
      customer_name: params.customerName,
      score: params.score,
      feedback: params.feedback,
      booking_id: params.bookingId,
    })

    // Trigger follow-up based on category
    if (nps) {
      await this.processNPSResponse({
        score: params.score,
        customerEmail: params.customerEmail,
        customerName: params.customerName,
        feedback: params.feedback,
        npsId: nps.id,
      })
    }

    return {
      success: true,
      data: {
        npsId: nps?.id,
        score: params.score,
        category,
        feedback: params.feedback,
      },
    }
  }

  private async scheduleAnniversaryOutreach(params: AnniversaryParams) {
    this.log(
      "info",
      "scheduleAnniversaryOutreach",
      `Scheduling ${params.anniversaryType} anniversary for ${params.customerEmail}`,
    )

    // Get or create journey
    let journey = await db.getJourneyByCustomer(params.customerEmail)
    if (!journey) {
      journey = await db.createJourney({
        customer_email: params.customerEmail,
        customer_name: params.customerName,
        stage: "anniversary",
      })
    }

    if (journey) {
      // Schedule anniversary action for next year
      const anniversaryDate = new Date()
      anniversaryDate.setFullYear(anniversaryDate.getFullYear() + 1)

      await db.scheduleJourneyAction({
        journey_id: journey.id,
        action_type: `anniversary_${params.anniversaryType}`,
        scheduled_for: anniversaryDate,
      })
    }

    return {
      success: true,
      data: {
        outreachId: this.generateId(),
        type: params.anniversaryType,
        status: "scheduled",
      },
    }
  }

  private async generateTestimonialRequest(params: TestimonialParams) {
    this.log(
      "info",
      "generateTestimonialRequest",
      `Requesting ${params.format || "written"} testimonial from ${params.customerEmail}`,
    )

    return {
      success: true,
      data: {
        requestId: this.generateId(),
        format: params.format || "written",
        status: "sent",
      },
    }
  }

  public async getRetentionStats(): Promise<{
    nps: Awaited<ReturnType<typeof db.getNPSStats>>
    referrals: Awaited<ReturnType<typeof db.getReferralStats>>
  }> {
    const [nps, referrals] = await Promise.all([db.getNPSStats(), db.getReferralStats()])
    return { nps, referrals }
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
  winBackThreshold: number
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

interface SurveyParams {
  customerEmail: string
  customerName?: string
  bookingId?: string
  channel?: string
  surveyType?: string
}
interface ReviewParams {
  customerEmail: string
  customerName?: string
  platform: string
  incentive?: string
}
interface ReferralParams {
  customerEmail: string
  customerName?: string
  programType?: string
}
interface RewardParams {
  customerEmail: string
  customerName?: string
  rewardType: string
  value?: number
  reason: string
}
interface WinBackParams {
  name: string
  customerEmails?: string[]
  campaignType: string
  offerValue?: number
}
interface NPSParams {
  customerEmail: string
  customerName?: string
  score: number
  feedback?: string
  bookingId?: string
}
interface AnniversaryParams {
  customerEmail: string
  customerName?: string
  anniversaryType: string
  message?: string
}
interface TestimonialParams {
  customerEmail: string
  customerName?: string
  format?: string
  incentive?: string
}

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
