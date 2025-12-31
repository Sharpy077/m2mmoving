import { BaseAgent, type AgentInput, type AgentOutput, type AgentAction } from "../base-agent"
import type { AgentIdentity, AgentConfig, InterAgentMessage, IntentSignal, IntentSignalType } from "../types"
import { HunterDB, type Prospect, type CreateProspectParams, type IntentSignalType as DBIntentSignalType } from "./db"

// =============================================================================
// HUNTER AGENT
// =============================================================================

export class HunterAgent extends BaseAgent {
  // Lead generation configuration
  private huntingConfig: HuntingConfig
  // Removed: private prospectDatabase: Map<string, Prospect> = new Map()

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
        target: prospect.contact_email || prospect.company_name,
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

    // this.prospectDatabase.set(prospect.id, prospect) // Replaced by DB interaction

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
    // let prospect = this.findProspectByCompany(signal.company.name) // Replaced by DB interaction

    // if (!prospect) {
    //   prospect = {
    //     id: this.generateId(),
    //     companyName: signal.company.name,
    //     source: signal.source,
    //     status: "new",
    //     score: 0,
    //     signals: [],
    //     createdAt: new Date(),
    //     updatedAt: new Date(),
    //   }
    // }

    // Add signal
    // prospect.signals.push(signal)
    // prospect.updatedAt = new Date()

    // Re-score
    const scored = await this.scoreLead({ prospectId: signal.prospectId, signals: [signal] })
    // prospect.score = (scored.data as any)?.score || prospect.score

    // this.prospectDatabase.set(prospect.id, prospect) // Replaced by DB interaction

    // Check if ready for outreach
    // if (prospect.score >= this.huntingConfig.qualificationThreshold && prospect.status === "new") {
    //   prospect.status = "qualified"
    //   await this.initiateOutreachSequence(prospect)
    // }

    return {
      success: true,
      response: `Intent signal processed. Prospect score: ${scored.data.score}`,
      data: { signal, prospectScore: scored.data.score },
    }
  }

  // =============================================================================
  // TOOL IMPLEMENTATIONS - Updated to use real database
  // =============================================================================

  private async scanRealEstateListings(params: ScanListingsParams) {
    this.log("info", "scanRealEstateListings", `Scanning ${params.location}`, params)

    // In production, integrate with Domain.com.au API, REA API, etc.
    // For now, check for unprocessed signals from external integrations
    const unprocessedSignals = await HunterDB.getUnprocessedSignals(20)

    const listingSignals = unprocessedSignals.filter(
      (s) =>
        s.signal_type === "commercial_lease_listing" &&
        (s.details as any)?.suburb?.toLowerCase().includes(params.location.toLowerCase()),
    )

    // If no real signals, return mock for demo
    if (listingSignals.length === 0) {
      return {
        success: true,
        data: [
          {
            id: `listing-${Date.now()}`,
            address: `${Math.floor(Math.random() * 500)} Collins St, Melbourne`,
            suburb: params.location,
            sqm: Math.floor(Math.random() * 1000) + 100,
            type: "Office",
            listingType: params.listingType,
            companyName: "Sample Company Pty Ltd",
            leaseEnd: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            source: "domain.com.au",
          },
        ],
      }
    }

    return {
      success: true,
      data: listingSignals.map((s) => ({
        id: s.id,
        ...s.details,
        companyName: s.company_name,
        source: s.source,
      })),
    }
  }

  private async enrichCompanyData(params: EnrichParams) {
    this.log("info", "enrichCompanyData", `Enriching: ${params.companyName}`)

    // Check if prospect already exists with enriched data
    const existing = await HunterDB.findProspect({ company_name: params.companyName })

    if (existing && existing.enriched_data && Object.keys(existing.enriched_data).length > 0) {
      return {
        success: true,
        data: existing.enriched_data,
      }
    }

    // In production, integrate with Apollo, Clearbit, LinkedIn Sales Nav
    // Mock enrichment data
    const enrichedData = {
      companyName: params.companyName,
      abn: params.abn || `${Math.floor(Math.random() * 90000000000) + 10000000000}`,
      industry: "Technology",
      employeeCount: "50-100",
      revenue: "$5M-$10M",
      founded: 2015 + Math.floor(Math.random() * 8),
      website: params.website || `https://${params.companyName.toLowerCase().replace(/\s/g, "")}.com.au`,
      linkedInUrl: `https://linkedin.com/company/${params.companyName.toLowerCase().replace(/\s/g, "-")}`,
      headquarters: "Melbourne, VIC",
      decisionMakers: [
        {
          name: "John Smith",
          title: "Office Manager",
          email: `j.smith@${params.companyName.toLowerCase().replace(/\s/g, "")}.com.au`,
          linkedIn: "https://linkedin.com/in/johnsmith",
          confidence: 85,
        },
      ],
    }

    // Update prospect if exists
    if (existing) {
      await HunterDB.updateProspect({
        prospect_id: existing.id,
        enriched_data: enrichedData,
        status: "enriched",
      })
    }

    return {
      success: true,
      data: enrichedData,
    }
  }

  private async scoreLead(params: ScoreLeadParams) {
    const prospect = params.prospectId ? await HunterDB.getProspect(params.prospectId) : null

    const signals = params.signals || prospect?.signals || []
    const engagement = params.engagement || {}

    // Scoring algorithm
    let score = 0
    const breakdown: Record<string, number> = {}

    // Signal strength (up to 40 points)
    let signalScore = 0
    for (const signal of signals) {
      const signalWeight = SIGNAL_WEIGHTS[signal.type as IntentSignalType] || 5
      signalScore += signalWeight * ((signal.confidence || 70) / 100)
    }
    breakdown.signalStrength = Math.min(Math.round(signalScore), 40)
    score += breakdown.signalStrength

    // Company fit (up to 30 points)
    breakdown.companyFit = 0
    const enrichedData = prospect?.enriched_data as Record<string, unknown> | undefined
    if (enrichedData) {
      const employeeCount = (enrichedData.employeeCount as string) || ""
      if (employeeCount.includes("50") || employeeCount.includes("100") || employeeCount.includes("200")) {
        breakdown.companyFit += 15
      }
      const industry = (enrichedData.industry as string) || ""
      if (["Technology", "Finance", "Professional Services", "Healthcare", "Legal"].includes(industry)) {
        breakdown.companyFit += 10
      }
      const headquarters = (enrichedData.headquarters as string) || ""
      if (headquarters.includes("Melbourne") || headquarters.includes("VIC")) {
        breakdown.companyFit += 5
      }
    }
    score += breakdown.companyFit

    // Timing (up to 20 points)
    breakdown.timing = 0
    const urgentSignals = signals.filter((s: any) => s.timing === "immediate")
    const nearTermSignals = signals.filter((s: any) => s.timing === "near_term")
    breakdown.timing = Math.min(urgentSignals.length * 10 + nearTermSignals.length * 5, 20)
    score += breakdown.timing

    // Engagement (up to 10 points)
    breakdown.engagement = 0
    if (engagement.emailOpened) breakdown.engagement += 3
    if (engagement.linkClicked) breakdown.engagement += 4
    if (engagement.replied) breakdown.engagement += 10
    breakdown.engagement = Math.min(breakdown.engagement, 10)
    score += breakdown.engagement

    score = Math.min(score, 100)
    const qualified = score >= this.huntingConfig.qualificationThreshold

    if (prospect) {
      await HunterDB.updateProspect({
        prospect_id: prospect.id,
        score,
        score_breakdown: breakdown,
        qualified,
        status: qualified && prospect.status === "new" ? "qualified" : undefined,
      })
    }

    return {
      success: true,
      data: {
        prospectId: params.prospectId,
        score: Math.round(score),
        breakdown,
        qualified,
      },
    }
  }

  private async sendOutboundEmail(params: EmailParams) {
    const prospect = await HunterDB.getProspect(params.prospectId)
    if (!prospect) {
      return { success: false, error: "Prospect not found" }
    }

    // Get template from database
    const template = await HunterDB.getEmailTemplate(params.templateId)
    if (!template) {
      return { success: false, error: "Template not found" }
    }

    const personalized = this.personalizeTemplate(
      { id: template.id, subject: template.subject, body: template.body },
      prospect as any, // Casting to any to match the older Prospect interface used in personalizeTemplate
      params.personalization,
    )

    this.log("info", "sendOutboundEmail", `Sending email to ${prospect.contact_email}`, {
      template: params.templateId,
      step: params.sequenceStep,
    })

    const outreachResult = await HunterDB.recordOutreach({
      prospect_id: params.prospectId,
      channel: "email",
      outreach_type: params.templateId,
      template_id: params.templateId,
      sequence_name: prospect.current_sequence || "default",
      sequence_step: params.sequenceStep || 1,
      subject: template.subject,
      message_content: personalized,
      personalization_data: params.personalization || {},
    })

    // Update template stats
    await HunterDB.incrementTemplateStats(params.templateId, "send")

    // In production, send via Resend or other email service
    // For now, just record the outreach

    return {
      success: true,
      data: {
        emailId: outreachResult.outreachId,
        prospectId: params.prospectId,
        template: params.templateId,
        sequenceStep: params.sequenceStep || 1,
        status: "sent",
        sentAt: new Date().toISOString(),
      },
    }
  }

  private async sendLinkedInMessage(params: LinkedInParams) {
    this.log("info", "sendLinkedInMessage", `LinkedIn ${params.messageType} to ${params.prospectId}`)

    const outreachResult = await HunterDB.recordOutreach({
      prospect_id: params.prospectId,
      channel: "linkedin",
      outreach_type: params.messageType,
      message_content: params.message,
    })

    // In production, use LinkedIn Sales Navigator API or automation tool
    return {
      success: true,
      data: {
        messageId: outreachResult.outreachId,
        type: params.messageType,
        status: "sent",
        sentAt: new Date().toISOString(),
      },
    }
  }

  private async scheduleFollowUp(params: FollowUpParams) {
    await HunterDB.updateProspect({
      prospect_id: params.prospectId,
      next_follow_up_date: params.scheduledDate,
      follow_up_action: params.action,
      follow_up_notes: params.notes,
    })

    return {
      success: true,
      data: {
        followUpId: crypto.randomUUID(),
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

    const prospect = await HunterDB.findProspect({ company_name: params.companyName })

    if (prospect?.decision_makers && prospect.decision_makers.length > 0) {
      return {
        success: true,
        data: {
          company: params.companyName,
          decisionMakers: prospect.decision_makers,
        },
      }
    }

    // In production, use LinkedIn Sales Navigator, Apollo, etc.
    // Mock data for demo
    const decisionMakers = [
      {
        name: "Sarah Johnson",
        title: "Office Manager",
        email: `s.johnson@${params.companyName.toLowerCase().replace(/\s/g, "")}.com.au`,
        linkedIn: "https://linkedin.com/in/sarahjohnson",
        confidence: 90,
      },
      {
        name: "Michael Chen",
        title: "Operations Director",
        email: `m.chen@${params.companyName.toLowerCase().replace(/\s/g, "")}.com.au`,
        linkedIn: "https://linkedin.com/in/michaelchen",
        confidence: 75,
      },
    ]

    if (prospect) {
      await HunterDB.updateProspect({
        prospect_id: prospect.id,
        decision_makers: decisionMakers,
      })
    }

    return {
      success: true,
      data: {
        company: params.companyName,
        decisionMakers,
      },
    }
  }

  private async trackIntentSignal(params: IntentSignalParams) {
    const signalResult = await HunterDB.recordIntentSignal({
      prospect_id: params.prospectId,
      signal_type: params.signalType as DBIntentSignalType,
      confidence: 70,
      source: params.source,
      timing: "near_term",
      details: params.details,
    })

    // Also add to prospect's signals array if prospect exists
    if (params.prospectId) {
      await HunterDB.addSignalToProspect(params.prospectId, {
        type: params.signalType as DBIntentSignalType,
        confidence: 70,
        source: params.source,
        timing: "near_term",
        details: params.details || {},
      })
    }

    return {
      success: true,
      data: { signalId: signalResult.signalId },
    }
  }

  // =============================================================================
  // HELPER METHODS - Updated to use database
  // =============================================================================

  private async buildProspectList(industry: string, size: string): Promise<Prospect[]> {
    const prospects = await HunterDB.getQualifiedProspects(50)

    return prospects.filter((p) => {
      const enriched = p.enriched_data as Record<string, unknown>
      if (industry !== "all" && enriched?.industry !== industry) return false
      if (size !== "all" && !enriched?.employeeCount?.toString().includes(size)) return false
      return true
    }) as any[]
  }

  private async checkIntentSignals(): Promise<IntentSignal[]> {
    const signals = await HunterDB.getUnprocessedSignals()

    return signals.map((s) => ({
      id: s.id,
      type: s.signal_type,
      confidence: s.confidence,
      source: s.source,
      company: { name: s.company_name || "" },
      timing: s.timing as any,
      details: s.details,
      detectedAt: new Date(s.detected_at),
    }))
  }

  private async createOrUpdateProspect(result: ProspectingResult): Promise<Prospect | null> {
    const companyName = result.data?.companyName || result.data?.company_name
    if (!companyName) return null

    // Check if prospect exists
    let prospect = await HunterDB.findProspect({
      company_name: companyName,
      source_listing_id: result.data?.id,
    })

    if (prospect) {
      // Update existing prospect with new signal
      if (result.type === "signal") {
        await HunterDB.addSignalToProspect(prospect.id, {
          type: result.data.type || "website_visit",
          confidence: result.data.confidence || 70,
          source: result.source,
          timing: result.data.timing || "near_term",
          details: result.data,
        })
      }
      // Refetch updated prospect
      prospect = await HunterDB.getProspect(prospect.id)
    } else {
      // Create new prospect
      const createParams: CreateProspectParams = {
        company_name: companyName,
        source: result.source,
        source_detail: result.data?.listingUrl || result.data?.source_url,
        source_listing_id: result.data?.id,
        website: result.data?.website,
        headquarters: result.data?.suburb || result.data?.address,
        signals:
          result.type === "signal"
            ? [
                {
                  id: crypto.randomUUID(),
                  type: result.data.type || "commercial_lease_listing",
                  confidence: result.data.confidence || 70,
                  source: result.source,
                  timing: result.data.timing || "near_term",
                  details: result.data,
                  detected_at: new Date().toISOString(),
                },
              ]
            : [],
      }

      const createResult = await HunterDB.createProspect(createParams)
      if (createResult.success && createResult.prospectId) {
        prospect = await HunterDB.getProspect(createResult.prospectId)
      }
    }

    return prospect as any
  }

  private async initiateOutreachSequence(prospect: Prospect): Promise<any> {
    await HunterDB.updateProspect({
      prospect_id: prospect.id,
      current_sequence: "standard_outreach",
      current_sequence_step: 1,
    })

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

  // Removed: private findProspectByCompany(companyName: string): Prospect | undefined { ... }

  private personalizeTemplate(template: EmailTemplate, prospect: Prospect, custom?: Record<string, unknown>): string {
    let content = template.body

    // Ensure prospect and its properties are defined before using them
    content = content.replace("{companyName}", prospect?.companyName ?? "the company")
    content = content.replace("{firstName}", prospect?.contactName?.split(" ")[0] ?? "there")

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
    const prospects = await HunterDB.getProspectsNeedingFollowUp()

    const actions: AgentAction[] = []

    for (const prospect of prospects.slice(0, 10)) {
      const nextStep = (prospect.current_sequence_step || 0) + 1
      const templateMap: Record<number, string> = {
        2: "follow_up_1",
        3: "follow_up_2",
        4: "closing_loop",
      }

      const templateId = templateMap[nextStep]
      if (templateId) {
        await this.sendOutboundEmail({
          prospectId: prospect.id,
          templateId,
          sequenceStep: nextStep,
        })

        actions.push({
          type: "send_email",
          target: prospect.contact_email || prospect.company_name,
          data: { templateId, step: nextStep },
          status: "completed",
        })
      }
    }

    return {
      success: true,
      response: `Processed ${actions.length} follow-ups.`,
      actions,
    }
  }

  private async refreshProspectData(): Promise<AgentOutput> {
    const stats = await HunterDB.getProspectStats()

    return {
      success: true,
      response: `Prospect data refreshed. Total: ${stats.total}, Qualified: ${stats.qualified}, Avg Score: ${stats.avgScore}`,
      data: stats,
    }
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
  // Add other templates here as needed by the system
  follow_up_2: {
    id: "follow_up_2",
    subject: "Thinking of {companyName}'s move",
    body: `Hi {firstName},

Hope you're having a good week.

Just wanted to share a quick thought on office moves: ensuring clear communication and minimizing disruption are key. Our clients consistently praise our proactive approach to these very issues.

Let me know if you're free for a brief chat.

Best,
Hunter`,
  },
  closing_loop: {
    id: "closing_loop",
    subject: "Closing the loop on {companyName}",
    body: `Hi {firstName},

I'll assume you've got your office move covered for now. If anything changes or you need a reliable partner for future relocations, don't hesitate to reach out.

Wishing you all the best with the new space!

Best,
Hunter`,
  },
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
  prospectId?: string // Make prospectId optional as it might be used for new signals
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
    // Initialize DB connection if not already done
    // HunterDB.initialize(); // Assuming HunterDB has an initialize method if needed
    hunterInstance = new HunterAgent()
  }
  return hunterInstance
}

export function resetHunter(): void {
  hunterInstance = null
}
