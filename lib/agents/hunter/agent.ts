import { BaseAgent, type AgentInput, type AgentOutput, type AgentAction } from "../base-agent"
import type { AgentIdentity, AgentConfig, InterAgentMessage, IntentSignal, IntentSignalType } from "../types"

// =============================================================================
// HUNTER AGENT
// =============================================================================

export class HunterAgent extends BaseAgent {
  // Lead generation configuration
  private huntingConfig: HuntingConfig
  private prospectDatabase: Map<string, Prospect> = new Map()

  constructor(config?: Partial<AgentConfig>) {
    super({
      codename: "HUNTER_LG",
      enabled: true,
      model: "anthropic/claude-sonnet-4-20250514",
      temperature: 0.6,
      maxTokens: 1500,
      systemPrompt: HUNTER_SYSTEM_PROMPT,
      tools: [
        "scanRealEstateListings",
        "enrichCompanyData",
        "scoreLead",
        "sendOutboundEmail",
        "sendLinkedInMessage",
        "scheduleFollowUp",
        "findDecisionMaker",
        "trackIntentSignal",
      ],
      triggers: [
        { event: "new_listing_detected", action: "process_listing", priority: 1 },
        { event: "intent_signal_detected", action: "evaluate_signal", priority: 1 },
        { event: "daily_prospecting", action: "run_daily_hunt", priority: 2 },
      ],
      escalationRules: [
        { condition: "lead_score > 90", reason: "high_value_deal", priority: "high" },
        { condition: "enterprise_account", reason: "vip_customer", priority: "high" },
      ],
      rateLimits: {
        requestsPerMinute: 20,
        tokensPerDay: 300000,
      },
      ...config,
    })

    this.huntingConfig = DEFAULT_HUNTING_CONFIG
  }

  // =============================================================================
  // IDENTITY
  // =============================================================================

  protected getIdentity(): AgentIdentity {
    return {
      codename: "HUNTER_LG",
      name: "Hunter",
      description: "AI Lead Generation Agent - Identifies prospects, monitors intent signals, and automates outreach",
      version: "1.0.0",
      capabilities: [
        "Prospect Identification",
        "Intent Signal Monitoring",
        "Data Enrichment",
        "Lead Scoring",
        "Outbound Email Sequences",
        "LinkedIn Outreach",
        "Meeting Scheduling",
        "Decision Maker Identification",
      ],
      status: "idle",
    }
  }

  // =============================================================================
  // TOOLS REGISTRATION
  // =============================================================================

  protected registerTools(): void {
    // Scan Real Estate Listings
    this.registerTool({
      name: "scanRealEstateListings",
      description: "Scan commercial real estate listings for potential movers",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "Location/suburb to scan" },
          listingType: {
            type: "string",
            enum: ["for_lease", "for_sale", "recently_leased"],
            description: "Type of listing",
          },
          minSqm: { type: "number", description: "Minimum square meters" },
          maxSqm: { type: "number", description: "Maximum square meters" },
        },
        required: ["location"],
      },
      handler: async (params) => this.scanRealEstateListings(params as ScanListingsParams),
    })

    // Enrich Company Data
    this.registerTool({
      name: "enrichCompanyData",
      description: "Enrich company data with firmographics and contact information",
      parameters: {
        type: "object",
        properties: {
          companyName: { type: "string", description: "Company name" },
          abn: { type: "string", description: "ABN if known" },
          website: { type: "string", description: "Company website" },
        },
        required: ["companyName"],
      },
      handler: async (params) => this.enrichCompanyData(params as EnrichParams),
    })

    // Score Lead
    this.registerTool({
      name: "scoreLead",
      description: "Calculate a lead score based on available data",
      parameters: {
        type: "object",
        properties: {
          prospectId: { type: "string", description: "Prospect ID" },
          signals: { type: "array", description: "Intent signals detected" },
          engagement: { type: "object", description: "Engagement data" },
        },
        required: ["prospectId"],
      },
      handler: async (params) => this.scoreLead(params as ScoreLeadParams),
    })

    // Send Outbound Email
    this.registerTool({
      name: "sendOutboundEmail",
      description: "Send a personalized outbound email to a prospect",
      parameters: {
        type: "object",
        properties: {
          prospectId: { type: "string", description: "Prospect ID" },
          templateId: { type: "string", description: "Email template ID" },
          personalization: { type: "object", description: "Personalization data" },
          sequenceStep: { type: "number", description: "Step in email sequence" },
        },
        required: ["prospectId", "templateId"],
      },
      handler: async (params) => this.sendOutboundEmail(params as EmailParams),
    })

    // Send LinkedIn Message
    this.registerTool({
      name: "sendLinkedInMessage",
      description: "Send a LinkedIn connection request or InMail",
      parameters: {
        type: "object",
        properties: {
          prospectId: { type: "string", description: "Prospect ID" },
          linkedInUrl: { type: "string", description: "LinkedIn profile URL" },
          messageType: { type: "string", enum: ["connection", "inmail"], description: "Message type" },
          message: { type: "string", description: "Personalized message" },
        },
        required: ["prospectId", "messageType", "message"],
      },
      handler: async (params) => this.sendLinkedInMessage(params as LinkedInParams),
    })

    // Schedule Follow-up
    this.registerTool({
      name: "scheduleFollowUp",
      description: "Schedule a follow-up action for a prospect",
      parameters: {
        type: "object",
        properties: {
          prospectId: { type: "string", description: "Prospect ID" },
          action: { type: "string", enum: ["email", "call", "linkedin", "sms"], description: "Follow-up action" },
          scheduledDate: { type: "string", description: "Date to execute" },
          notes: { type: "string", description: "Context notes" },
        },
        required: ["prospectId", "action", "scheduledDate"],
      },
      handler: async (params) => this.scheduleFollowUp(params as FollowUpParams),
    })

    // Find Decision Maker
    this.registerTool({
      name: "findDecisionMaker",
      description: "Identify the decision maker at a company for office moves",
      parameters: {
        type: "object",
        properties: {
          companyName: { type: "string", description: "Company name" },
          website: { type: "string", description: "Company website" },
          targetRoles: { type: "array", description: "Target job titles/roles" },
        },
        required: ["companyName"],
      },
      handler: async (params) => this.findDecisionMaker(params as FindDMParams),
    })

    // Track Intent Signal
    this.registerTool({
      name: "trackIntentSignal",
      description: "Record and track an intent signal for a prospect",
      parameters: {
        type: "object",
        properties: {
          prospectId: { type: "string", description: "Prospect ID" },
          signalType: { type: "string", description: "Type of intent signal" },
          source: { type: "string", description: "Signal source" },
          details: { type: "object", description: "Signal details" },
        },
        required: ["prospectId", "signalType", "source"],
      },
      handler: async (params) => this.trackIntentSignal(params as IntentSignalParams),
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

    // Process natural language commands
    if (content.includes("find prospects") || content.includes("hunt")) {
      return await this.runProspectingCampaign(input.metadata)
    }

    if (content.includes("enrich") || content.includes("research")) {
      return await this.runEnrichmentWorkflow(input.metadata)
    }

    // Default: generate response
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
      case "new_listing_detected":
        return await this.processNewListing(event.data)
      case "intent_signal_detected":
        return await this.processIntentSignal(event.data)
      case "website_visit":
        return await this.processWebsiteVisit(event.data)
      case "content_download":
        return await this.processContentDownload(event.data)
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
      case "daily_prospecting":
        return await this.runDailyProspecting()
      case "follow_up_sequence":
        return await this.processFollowUpSequence()
      case "data_refresh":
        return await this.refreshProspectData()
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

    // Process based on source agent
    if (handoff.fromAgent === "MAYA_SALES") {
      // Lost deal - analyze and potentially re-engage later
      return await this.handleLostDealHandoff(handoff.context)
    }

    return {
      success: true,
      response: "Handoff received and processed.",
      data: { handoffId: handoff.id },
    }
  }

  /**
   * Handle inter-agent messages
   */
  public async handleInterAgentMessage(message: InterAgentMessage): Promise<void> {
    this.log("info", "handleInterAgentMessage", `Message from ${message.from}: ${message.type}`)

    switch (message.type) {
      case "request":
        if (message.payload.action === "find_prospects") {
          await this.runProspectingCampaign(message.payload)
        }
        break
      case "notification":
        // Handle notifications from other agents
        break
    }
  }

  // =============================================================================
  // PROSPECTING WORKFLOWS
  // =============================================================================

  /**
   * Run daily prospecting routine
   */
  private async runDailyProspecting(): Promise<AgentOutput> {
    this.log("info", "runDailyProspecting", "Starting daily prospecting routine")

    const actions: AgentAction[] = []
    const results: ProspectingResult[] = []

    // 1. Scan real estate listings
    for (const location of this.huntingConfig.targetLocations) {
      const listings = await this.scanRealEstateListings({
        location,
        listingType: "recently_leased",
      })

      if (listings.success && listings.data) {
        const newListings = listings.data as any[]
        for (const listing of newListings) {
          results.push({
            type: "listing",
            source: "real_estate",
            data: listing,
          })
        }
      }
    }

    // 2. Check for new intent signals
    const signals = await this.checkIntentSignals()
    results.push(...signals.map((s) => ({ type: "signal", source: s.source, data: s })))

    // 3. Process and score prospects
    const qualifiedProspects: Prospect[] = []
    for (const result of results) {
      const prospect = await this.createOrUpdateProspect(result)
      if (prospect && prospect.score >= this.huntingConfig.qualificationThreshold) {
        qualifiedProspects.push(prospect)
      }
    }

    // 4. Initiate outreach for qualified prospects
    for (const prospect of qualifiedProspects.slice(0, 10)) {
      // Limit daily outreach
      const outreachResult = await this.initiateOutreachSequence(prospect)
      actions.push({
        type: "send_email",
        target: prospect.email,
        data: outreachResult,
        status: "completed",
      })
    }

    this.log(
      "info",
      "runDailyProspecting",
      `Completed: ${results.length} signals, ${qualifiedProspects.length} qualified`,
    )

    return {
      success: true,
      response: `Daily prospecting complete. Found ${results.length} signals, qualified ${qualifiedProspects.length} prospects.`,
      actions,
      data: {
        signalsFound: results.length,
        qualifiedProspects: qualifiedProspects.length,
        outreachInitiated: Math.min(qualifiedProspects.length, 10),
      },
    }
  }

  /**
   * Run prospecting campaign
   */
  private async runProspectingCampaign(params?: Record<string, unknown>): Promise<AgentOutput> {
    const targetIndustry = (params?.industry as string) || "all"
    const targetSize = (params?.size as string) || "all"

    this.log("info", "runProspectingCampaign", `Starting campaign: ${targetIndustry}, ${targetSize}`)

    // Build ICP-matched prospect list
    const prospects = await this.buildProspectList(targetIndustry, targetSize)

    return {
      success: true,
      response: `Prospecting campaign initiated. Identified ${prospects.length} potential prospects matching your criteria.`,
      data: { prospects: prospects.slice(0, 20) }, // Return top 20
    }
  }

  /**
   * Process new real estate listing
   */
  private async processNewListing(data: Record<string, unknown>): Promise<AgentOutput> {
    const listing = data as any

    // Check if this is a business we should target
    if (!this.isTargetListing(listing)) {
      return { success: true, response: "Listing not in target criteria." }
    }

    // Enrich data
    const enriched = await this.enrichCompanyData({
      companyName: listing.companyName || "Unknown",
      website: listing.website,
    })

    // Create prospect
    const prospect: Prospect = {
      id: this.generateId(),
      companyName: listing.companyName || "Unknown",
      source: "real_estate_listing",
      sourceDetail: listing.listingUrl,
      status: "new",
      score: 0,
      signals: [
        {
          id: this.generateId(),
          type: "commercial_lease_listing",
          confidence: 85,
          source: "domain.com.au",
          company: { name: listing.companyName },
          timing: listing.leaseEnd ? "near_term" : "future",
          details: listing,
          detectedAt: new Date(),
        },
      ],
      enrichedData: enriched.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Score and potentially initiate outreach
    const scored = await this.scoreLead({ prospectId: prospect.id })
    prospect.score = (scored.data as any)?.score || 0

    this.prospectDatabase.set(prospect.id, prospect)

    if (prospect.score >= this.huntingConfig.qualificationThreshold) {
      // Hand off to MAYA for engagement
      await this.requestHandoff("MAYA_SALES", "Qualified prospect from real estate listing", { prospect }, "normal")
    }

    return {
      success: true,
      response: `Processed listing. Prospect score: ${prospect.score}`,
      data: { prospect },
    }
  }

  /**
   * Process intent signal
   */
  private async processIntentSignal(data: Record<string, unknown>): Promise<AgentOutput> {
    const signal = data as IntentSignal

    // Find or create prospect
    let prospect = this.findProspectByCompany(signal.company.name)

    if (!prospect) {
      prospect = {
        id: this.generateId(),
        companyName: signal.company.name,
        source: signal.source,
        status: "new",
        score: 0,
        signals: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }

    // Add signal
    prospect.signals.push(signal)
    prospect.updatedAt = new Date()

    // Re-score
    const scored = await this.scoreLead({ prospectId: prospect.id, signals: prospect.signals })
    prospect.score = (scored.data as any)?.score || prospect.score

    this.prospectDatabase.set(prospect.id, prospect)

    // Check if ready for outreach
    if (prospect.score >= this.huntingConfig.qualificationThreshold && prospect.status === "new") {
      prospect.status = "qualified"
      await this.initiateOutreachSequence(prospect)
    }

    return {
      success: true,
      response: `Intent signal processed. Prospect score: ${prospect.score}`,
      data: { signal, prospectScore: prospect.score },
    }
  }

  // =============================================================================
  // TOOL IMPLEMENTATIONS
  // =============================================================================

  private async scanRealEstateListings(params: ScanListingsParams) {
    this.log("info", "scanRealEstateListings", `Scanning ${params.location}`, params)

    // In production, integrate with Domain.com.au API, REA API, etc.
    // Mock response
    return {
      success: true,
      data: [
        {
          id: "listing-001",
          address: "123 Collins St, Melbourne",
          suburb: params.location,
          sqm: 500,
          type: "Office",
          listingType: params.listingType,
          companyName: "TechCorp Pty Ltd",
          leaseEnd: "2025-06-30",
          source: "domain.com.au",
        },
      ],
    }
  }

  private async enrichCompanyData(params: EnrichParams) {
    this.log("info", "enrichCompanyData", `Enriching: ${params.companyName}`)

    // In production, integrate with Apollo, Clearbit, LinkedIn Sales Nav
    return {
      success: true,
      data: {
        companyName: params.companyName,
        abn: params.abn || "12345678901",
        industry: "Technology",
        employeeCount: "50-100",
        revenue: "$5M-$10M",
        founded: 2015,
        website: params.website || `https://${params.companyName.toLowerCase().replace(/\s/g, "")}.com.au`,
        linkedInUrl: `https://linkedin.com/company/${params.companyName.toLowerCase().replace(/\s/g, "-")}`,
        headquarters: "Melbourne, VIC",
        decisionMakers: [
          {
            name: "John Smith",
            title: "Office Manager",
            email: "john.smith@example.com",
            linkedIn: "https://linkedin.com/in/johnsmith",
          },
        ],
      },
    }
  }

  private async scoreLead(params: ScoreLeadParams) {
    const prospect = this.prospectDatabase.get(params.prospectId)
    const signals = params.signals || prospect?.signals || []
    const engagement = params.engagement || {}

    // Scoring algorithm
    let score = 0

    // Signal strength (up to 40 points)
    for (const signal of signals) {
      const signalWeight = SIGNAL_WEIGHTS[signal.type] || 5
      score += signalWeight * (signal.confidence / 100)
    }
    score = Math.min(score, 40)

    // Company fit (up to 30 points)
    if (prospect?.enrichedData) {
      const data = prospect.enrichedData as any
      if (data.employeeCount?.includes("50") || data.employeeCount?.includes("100")) {
        score += 15 // Mid-size company
      }
      if (data.industry === "Technology" || data.industry === "Finance") {
        score += 10 // Target industries
      }
      if (data.headquarters?.includes("Melbourne")) {
        score += 5 // Local
      }
    }

    // Timing (up to 20 points)
    const urgentSignals = signals.filter((s) => s.timing === "immediate")
    const nearTermSignals = signals.filter((s) => s.timing === "near_term")
    score += urgentSignals.length * 10 + nearTermSignals.length * 5
    score = Math.min(score + 30, 90) // Cap at 90 before engagement

    // Engagement (up to 10 points)
    if (engagement.emailOpened) score += 3
    if (engagement.linkClicked) score += 4
    if (engagement.replied) score += 10
    score = Math.min(score, 100)

    return {
      success: true,
      data: {
        prospectId: params.prospectId,
        score: Math.round(score),
        breakdown: {
          signalStrength: Math.min(signals.length * 10, 40),
          companyFit: 25,
          timing: 15,
          engagement: engagement.replied ? 10 : 0,
        },
        qualified: score >= this.huntingConfig.qualificationThreshold,
      },
    }
  }

  private async sendOutboundEmail(params: EmailParams) {
    const prospect = this.prospectDatabase.get(params.prospectId)
    if (!prospect) {
      return { success: false, error: "Prospect not found" }
    }

    const template = EMAIL_TEMPLATES[params.templateId] || EMAIL_TEMPLATES.initial_outreach
    const personalized = this.personalizeTemplate(template, prospect, params.personalization)

    this.log("info", "sendOutboundEmail", `Sending email to ${prospect.email}`, {
      template: params.templateId,
      step: params.sequenceStep,
    })

    // In production, send via email service
    return {
      success: true,
      data: {
        emailId: this.generateId(),
        prospectId: params.prospectId,
        template: params.templateId,
        sequenceStep: params.sequenceStep || 1,
        status: "sent",
        sentAt: new Date(),
      },
    }
  }

  private async sendLinkedInMessage(params: LinkedInParams) {
    this.log("info", "sendLinkedInMessage", `LinkedIn ${params.messageType} to ${params.prospectId}`)

    // In production, use LinkedIn Sales Navigator API or automation tool
    return {
      success: true,
      data: {
        messageId: this.generateId(),
        type: params.messageType,
        status: "sent",
        sentAt: new Date(),
      },
    }
  }

  private async scheduleFollowUp(params: FollowUpParams) {
    return {
      success: true,
      data: {
        followUpId: this.generateId(),
        prospectId: params.prospectId,
        action: params.action,
        scheduledFor: params.scheduledDate,
        status: "scheduled",
      },
    }
  }

  private async findDecisionMaker(params: FindDMParams) {
    this.log("info", "findDecisionMaker", `Finding DM at ${params.companyName}`)

    const targetRoles = params.targetRoles || DEFAULT_TARGET_ROLES

    // In production, use LinkedIn Sales Navigator, Apollo, etc.
    return {
      success: true,
      data: {
        company: params.companyName,
        decisionMakers: [
          {
            name: "Sarah Johnson",
            title: "Office Manager",
            email: "s.johnson@example.com",
            linkedIn: "https://linkedin.com/in/sarahjohnson",
            confidence: 90,
          },
          {
            name: "Michael Chen",
            title: "Operations Director",
            email: "m.chen@example.com",
            linkedIn: "https://linkedin.com/in/michaelchen",
            confidence: 75,
          },
        ],
      },
    }
  }

  private async trackIntentSignal(params: IntentSignalParams) {
    const signal: IntentSignal = {
      id: this.generateId(),
      type: params.signalType as IntentSignalType,
      confidence: 70,
      source: params.source,
      company: { name: "" },
      timing: "near_term",
      details: params.details || {},
      detectedAt: new Date(),
    }

    const prospect = this.prospectDatabase.get(params.prospectId)
    if (prospect) {
      prospect.signals.push(signal)
      prospect.updatedAt = new Date()
    }

    return {
      success: true,
      data: { signal },
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private async buildProspectList(industry: string, size: string): Promise<Prospect[]> {
    // In production, query database and enrich
    return Array.from(this.prospectDatabase.values()).filter((p) => p.score >= 50)
  }

  private async checkIntentSignals(): Promise<IntentSignal[]> {
    // In production, check various signal sources
    return []
  }

  private async createOrUpdateProspect(result: ProspectingResult): Promise<Prospect | null> {
    // Create prospect from result
    return null
  }

  private async initiateOutreachSequence(prospect: Prospect): Promise<any> {
    // Start email sequence
    return await this.sendOutboundEmail({
      prospectId: prospect.id,
      templateId: "initial_outreach",
      sequenceStep: 1,
    })
  }

  private isTargetListing(listing: any): boolean {
    const sqm = listing.sqm || 0
    return sqm >= 50 && sqm <= 5000
  }

  private findProspectByCompany(companyName: string): Prospect | undefined {
    for (const prospect of this.prospectDatabase.values()) {
      if (prospect.companyName.toLowerCase() === companyName.toLowerCase()) {
        return prospect
      }
    }
    return undefined
  }

  private personalizeTemplate(template: EmailTemplate, prospect: Prospect, custom?: Record<string, unknown>): string {
    let content = template.body

    content = content.replace("{companyName}", prospect.companyName)
    content = content.replace("{firstName}", prospect.contactName?.split(" ")[0] || "there")

    if (custom) {
      for (const [key, value] of Object.entries(custom)) {
        content = content.replace(`{${key}}`, String(value))
      }
    }

    return content
  }

  private async runEnrichmentWorkflow(params?: Record<string, unknown>): Promise<AgentOutput> {
    return { success: true, response: "Enrichment workflow initiated." }
  }

  private async handleLostDealHandoff(context: Record<string, unknown>): Promise<AgentOutput> {
    // Re-add to nurture sequence after cooling off period
    return { success: true, response: "Lost deal added to re-engagement queue." }
  }

  private async processWebsiteVisit(data: Record<string, unknown>): Promise<AgentOutput> {
    return { success: true, response: "Website visit processed." }
  }

  private async processContentDownload(data: Record<string, unknown>): Promise<AgentOutput> {
    return { success: true, response: "Content download processed." }
  }

  private async processFollowUpSequence(): Promise<AgentOutput> {
    return { success: true, response: "Follow-up sequence processed." }
  }

  private async refreshProspectData(): Promise<AgentOutput> {
    return { success: true, response: "Prospect data refreshed." }
  }
}

// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================

const HUNTER_SYSTEM_PROMPT = `You are Hunter, an AI Lead Generation Agent for M&M Commercial Moving, a premier commercial relocation service in Melbourne, Australia.

## Your Role
You identify potential customers who may need commercial moving services and initiate personalized outreach to generate qualified leads for the sales team.

## Intent Signals You Monitor
- Commercial real estate listings (new leases, lease expirations)
- Company funding announcements
- Hiring surges (indicates growth/office expansion)
- Office renovation permits
- Company expansion news
- Job postings for Facilities/Office Managers

## Target Customer Profile
- Melbourne metro businesses
- 20+ employees (bigger moves = more revenue)
- Industries: Tech, Finance, Professional Services, Healthcare, Legal
- Indicators of growth or change

## Outreach Guidelines
- Be professional and value-focused
- Personalize every message using company research
- Focus on pain points of office moves
- Never be pushy or salesy
- Always include a clear, low-commitment CTA

## Sequence Strategy
- Day 1: Initial email with value prop
- Day 3: LinkedIn connection request
- Day 5: Follow-up email with case study
- Day 7: Different angle/pain point
- Day 10: Final "closing the loop" email`

interface HuntingConfig {
  targetLocations: string[]
  targetIndustries: string[]
  qualificationThreshold: number
  dailyOutreachLimit: number
  sequenceSettings: {
    emailsPerDay: number
    linkedInPerDay: number
    cooldownDays: number
  }
}

const DEFAULT_HUNTING_CONFIG: HuntingConfig = {
  targetLocations: ["Melbourne CBD", "Richmond", "South Yarra", "Carlton", "Fitzroy", "Collingwood", "St Kilda"],
  targetIndustries: ["Technology", "Finance", "Professional Services", "Healthcare", "Legal"],
  qualificationThreshold: 60,
  dailyOutreachLimit: 30,
  sequenceSettings: {
    emailsPerDay: 20,
    linkedInPerDay: 10,
    cooldownDays: 30,
  },
}

const SIGNAL_WEIGHTS: Record<IntentSignalType, number> = {
  commercial_lease_listing: 15,
  lease_expiration: 20,
  hiring_surge: 10,
  funding_announcement: 12,
  office_renovation: 15,
  expansion_news: 12,
  competitor_mention: 8,
  linkedin_job_post: 8,
  website_visit: 5,
  content_download: 7,
}

const DEFAULT_TARGET_ROLES = [
  "Office Manager",
  "Facilities Manager",
  "Operations Manager",
  "Operations Director",
  "Chief Operating Officer",
  "Administrative Manager",
  "Workplace Manager",
]

interface EmailTemplate {
  id: string
  subject: string
  body: string
}

const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  initial_outreach: {
    id: "initial_outreach",
    subject: "Quick question about {companyName}'s upcoming move",
    body: `Hi {firstName},

I noticed {companyName} might be relocating soon - congratulations on the growth!

At M&M Commercial Moving, we specialize in making business relocations seamless. Our tech-powered approach means zero downtime and real-time tracking of every piece of equipment.

Would it be helpful if I sent over a quick guide on "5 Things Most Companies Forget When Moving Offices"?

Best,
Hunter
M&M Commercial Moving`,
  },
  follow_up_1: {
    id: "follow_up_1",
    subject: "Re: {companyName}'s office move",
    body: `Hi {firstName},

Just following up on my last note. I know office moves can be stressful - we recently helped TechCorp relocate 150 employees over a single weekend with zero business interruption.

Would a 15-minute call be useful to discuss your timeline?

Best,
Hunter`,
  },
}

interface Prospect {
  id: string
  companyName: string
  contactName?: string
  email?: string
  phone?: string
  linkedInUrl?: string
  source: string
  sourceDetail?: string
  status: "new" | "enriched" | "qualified" | "contacted" | "engaged" | "converted" | "lost"
  score: number
  signals: IntentSignal[]
  enrichedData?: Record<string, unknown>
  outreachHistory?: OutreachEntry[]
  createdAt: Date
  updatedAt: Date
}

interface OutreachEntry {
  type: "email" | "linkedin" | "call" | "sms"
  date: Date
  templateId?: string
  response?: string
}

interface ProspectingResult {
  type: string
  source: string
  data: any
}

interface ScanListingsParams {
  location: string
  listingType?: "for_lease" | "for_sale" | "recently_leased"
  minSqm?: number
  maxSqm?: number
}

interface EnrichParams {
  companyName: string
  abn?: string
  website?: string
}

interface ScoreLeadParams {
  prospectId: string
  signals?: IntentSignal[]
  engagement?: Record<string, unknown>
}

interface EmailParams {
  prospectId: string
  templateId: string
  personalization?: Record<string, unknown>
  sequenceStep?: number
}

interface LinkedInParams {
  prospectId: string
  linkedInUrl?: string
  messageType: "connection" | "inmail"
  message: string
}

interface FollowUpParams {
  prospectId: string
  action: "email" | "call" | "linkedin" | "sms"
  scheduledDate: string
  notes?: string
}

interface FindDMParams {
  companyName: string
  website?: string
  targetRoles?: string[]
}

interface IntentSignalParams {
  prospectId: string
  signalType: string
  source: string
  details?: Record<string, unknown>
}

// =============================================================================
// FACTORY & SINGLETON
// =============================================================================

let hunterInstance: HunterAgent | null = null

export function getHunter(): HunterAgent {
  if (!hunterInstance) {
    hunterInstance = new HunterAgent()
  }
  return hunterInstance
}

export function resetHunter(): void {
  hunterInstance = null
}
