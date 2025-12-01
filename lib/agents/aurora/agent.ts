/**
 * AURORA - Marketing Agent
 * Autonomous content creation, campaign management, and brand amplification
 */

import { z } from "zod"
import { BaseAgent, type AgentInput, type AgentOutput, type AgentAction } from "../base-agent"
import type {
  AgentIdentity,
  AgentConfig,
  ToolDefinition,
  InterAgentMessage,
  ContentPiece,
  ContentType,
  Platform,
  Campaign,
  CampaignMetrics,
  AgentMessage,
} from "../types"

// =============================================================================
// AURORA AGENT
// =============================================================================

export class AuroraAgent extends BaseAgent {
  // Marketing configuration
  private marketingConfig: MarketingConfig
  private contentCalendar: Map<string, ScheduledContent> = new Map()
  private campaigns: Map<string, Campaign> = new Map()
  
  constructor(config?: Partial<AgentConfig>) {
    super({
      codename: "AURORA_MKT",
      enabled: true,
      model: "gpt-4o",
      temperature: 0.8, // Higher creativity for marketing
      maxTokens: 2500,
      systemPrompt: AURORA_SYSTEM_PROMPT,
      tools: [
        "generateBlogPost",
        "generateSocialPost",
        "schedulePost",
        "analyzePerformance",
        "optimizeAds",
        "generateEmailSequence",
        "createCampaign",
        "researchKeywords",
      ],
      triggers: [
        { event: "new_testimonial", action: "create_social_proof_content", priority: 1 },
        { event: "industry_news", action: "create_thought_leadership", priority: 2 },
        { event: "daily_content", action: "generate_daily_posts", priority: 2 },
        { event: "weekly_newsletter", action: "generate_newsletter", priority: 2 },
      ],
      escalationRules: [
        { condition: "brand_crisis", reason: "compliance_issue", priority: "urgent" },
        { condition: "negative_mention", reason: "negative_sentiment", priority: "high" },
      ],
      rateLimits: {
        requestsPerMinute: 15,
        tokensPerDay: 400000,
      },
      ...config,
    })
    
    this.marketingConfig = DEFAULT_MARKETING_CONFIG
  }
  
  // =============================================================================
  // IDENTITY
  // =============================================================================
  
  protected getIdentity(): AgentIdentity {
    return {
      codename: "AURORA_MKT",
      name: "Aurora",
      description: "AI Marketing Agent - Creates content, manages campaigns, and amplifies brand presence",
      version: "1.0.0",
      capabilities: [
        "Blog Post Generation",
        "Social Media Content",
        "Email Marketing",
        "SEO Optimization",
        "Ad Campaign Management",
        "Content Calendar",
        "Performance Analytics",
        "Visual Content Direction",
      ],
      status: "idle",
    }
  }
  
  // =============================================================================
  // TOOLS REGISTRATION
  // =============================================================================
  
  protected registerTools(): void {
    // Generate Blog Post
    this.registerTool({
      name: "generateBlogPost",
      description: "Generate an SEO-optimized blog post",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "Blog post topic" },
          keywords: { type: "array", description: "Target keywords" },
          tone: { type: "string", enum: ["professional", "casual", "educational", "persuasive"], description: "Writing tone" },
          length: { type: "string", enum: ["short", "medium", "long"], description: "Post length" },
          targetAudience: { type: "string", description: "Target audience" },
        },
        required: ["topic"],
      },
      handler: async (params) => this.generateBlogPost(params as BlogParams),
    })
    
    // Generate Social Post
    this.registerTool({
      name: "generateSocialPost",
      description: "Generate a social media post for a specific platform",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["linkedin", "facebook", "instagram", "twitter"], description: "Social platform" },
          contentType: { type: "string", enum: ["promotional", "educational", "engagement", "testimonial", "behind_scenes"], description: "Content type" },
          topic: { type: "string", description: "Post topic" },
          includeImage: { type: "boolean", description: "Include image suggestion" },
          cta: { type: "string", description: "Call to action" },
        },
        required: ["platform", "topic"],
      },
      handler: async (params) => this.generateSocialPost(params as SocialParams),
    })
    
    // Schedule Post
    this.registerTool({
      name: "schedulePost",
      description: "Schedule content for publishing",
      parameters: {
        type: "object",
        properties: {
          contentId: { type: "string", description: "Content ID to schedule" },
          platform: { type: "string", description: "Platform to publish to" },
          scheduledTime: { type: "string", description: "ISO datetime to publish" },
        },
        required: ["contentId", "platform", "scheduledTime"],
      },
      handler: async (params) => this.schedulePost(params as ScheduleParams),
    })
    
    // Analyze Performance
    this.registerTool({
      name: "analyzePerformance",
      description: "Analyze marketing performance metrics",
      parameters: {
        type: "object",
        properties: {
          channel: { type: "string", enum: ["social", "email", "ads", "blog", "all"], description: "Channel to analyze" },
          period: { type: "string", enum: ["week", "month", "quarter"], description: "Analysis period" },
          compareToLast: { type: "boolean", description: "Compare to previous period" },
        },
        required: ["channel"],
      },
      handler: async (params) => this.analyzePerformance(params as AnalyzeParams),
    })
    
    // Optimize Ads
    this.registerTool({
      name: "optimizeAds",
      description: "Analyze and suggest ad optimizations",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["google", "facebook", "linkedin"], description: "Ad platform" },
          campaignId: { type: "string", description: "Campaign ID to optimize" },
          budget: { type: "number", description: "Monthly budget in AUD" },
        },
        required: ["platform"],
      },
      handler: async (params) => this.optimizeAds(params as AdOptimizeParams),
    })
    
    // Generate Email Sequence
    this.registerTool({
      name: "generateEmailSequence",
      description: "Generate a nurture email sequence",
      parameters: {
        type: "object",
        properties: {
          sequenceType: { type: "string", enum: ["welcome", "nurture", "reengagement", "post_quote", "post_move"], description: "Sequence type" },
          numberOfEmails: { type: "number", description: "Number of emails in sequence" },
          audienceSegment: { type: "string", description: "Target audience segment" },
        },
        required: ["sequenceType"],
      },
      handler: async (params) => this.generateEmailSequence(params as EmailSequenceParams),
    })
    
    // Create Campaign
    this.registerTool({
      name: "createCampaign",
      description: "Create a marketing campaign",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Campaign name" },
          type: { type: "string", enum: ["awareness", "lead_gen", "conversion", "retention"], description: "Campaign type" },
          channels: { type: "array", description: "Marketing channels" },
          budget: { type: "number", description: "Total budget" },
          startDate: { type: "string", description: "Start date" },
          endDate: { type: "string", description: "End date" },
          targetAudience: { type: "string", description: "Target audience" },
        },
        required: ["name", "type", "channels"],
      },
      handler: async (params) => this.createCampaign(params as CreateCampaignParams),
    })
    
    // Research Keywords
    this.registerTool({
      name: "researchKeywords",
      description: "Research keywords for SEO and content",
      parameters: {
        type: "object",
        properties: {
          seedKeywords: { type: "array", description: "Seed keywords to expand" },
          intent: { type: "string", enum: ["informational", "commercial", "transactional"], description: "Search intent" },
          location: { type: "string", description: "Target location" },
        },
        required: ["seedKeywords"],
      },
      handler: async (params) => this.researchKeywords(params as KeywordParams),
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
    
    // Parse content requests
    if (content.includes("blog") || content.includes("article")) {
      return await this.handleBlogRequest(content, input.metadata)
    }
    
    if (content.includes("social") || content.includes("post")) {
      return await this.handleSocialRequest(content, input.metadata)
    }
    
    if (content.includes("email") || content.includes("newsletter")) {
      return await this.handleEmailRequest(content, input.metadata)
    }
    
    if (content.includes("campaign")) {
      return await this.handleCampaignRequest(content, input.metadata)
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
      case "new_testimonial":
        return await this.createTestimonialContent(event.data)
      case "industry_news":
        return await this.createThoughtLeadership(event.data)
      case "competitor_activity":
        return await this.respondToCompetitor(event.data)
      case "move_completed":
        return await this.createCaseStudy(event.data)
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
      case "daily_content":
        return await this.runDailyContentGeneration()
      case "weekly_newsletter":
        return await this.generateWeeklyNewsletter()
      case "monthly_report":
        return await this.generateMonthlyReport()
      case "content_calendar":
        return await this.planContentCalendar()
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
    if (handoff.fromAgent === "PHOENIX_RET") {
      // Create referral/testimonial content
      return await this.createTestimonialContent(handoff.context)
    }
    
    if (handoff.fromAgent === "ECHO_REP") {
      // Handle reputation-related content
      return await this.handleReputationContent(handoff.context)
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
        if (message.payload.action === "generate_content") {
          // Generate requested content
        }
        break
      case "notification":
        // Handle notifications
        break
    }
  }
  
  // =============================================================================
  // CONTENT WORKFLOWS
  // =============================================================================
  
  /**
   * Run daily content generation
   */
  private async runDailyContentGeneration(): Promise<AgentOutput> {
    this.log("info", "runDailyContentGeneration", "Starting daily content generation")
    
    const actions: AgentAction[] = []
    const generatedContent: ContentPiece[] = []
    
    // Generate social posts for each platform
    for (const platform of this.marketingConfig.activePlatforms) {
      const topic = this.selectDailyTopic()
      const result = await this.generateSocialPost({
        platform: platform as Platform,
        topic,
        contentType: "educational",
        includeImage: true,
      })
      
      if (result.success && result.data) {
        const content = result.data as ContentPiece
        generatedContent.push(content)
        
        // Schedule for optimal time
        const optimalTime = this.getOptimalPostTime(platform)
        await this.schedulePost({
          contentId: content.id,
          platform,
          scheduledTime: optimalTime.toISOString(),
        })
      }
    }
    
    this.log("info", "runDailyContentGeneration", `Generated ${generatedContent.length} pieces of content`)
    
    return {
      success: true,
      response: `Daily content generation complete. Created ${generatedContent.length} posts.`,
      actions,
      data: { generatedContent },
    }
  }
  
  /**
   * Generate weekly newsletter
   */
  private async generateWeeklyNewsletter(): Promise<AgentOutput> {
    this.log("info", "generateWeeklyNewsletter", "Generating weekly newsletter")
    
    const newsletter = await this.generateStructuredResponse(
      `Generate a weekly newsletter for M&M Commercial Moving subscribers. Include:
      1. A catchy subject line
      2. An engaging opening
      3. A featured tip or insight about office moves
      4. Any recent company news or achievements
      5. A call to action
      
      Keep the tone professional but friendly. Use Australian English.`,
      z.object({
        subjectLine: z.string(),
        preheader: z.string(),
        greeting: z.string(),
        mainContent: z.string(),
        tip: z.object({
          title: z.string(),
          content: z.string(),
        }),
        cta: z.object({
          text: z.string(),
          buttonText: z.string(),
          url: z.string(),
        }),
        signOff: z.string(),
      })
    )
    
    return {
      success: true,
      response: "Weekly newsletter generated successfully.",
      data: { newsletter },
    }
  }
  
  /**
   * Plan content calendar
   */
  private async planContentCalendar(): Promise<AgentOutput> {
    const daysToplan = 14 // Two weeks ahead
    const calendar: ScheduledContent[] = []
    
    const today = new Date()
    
    for (let i = 0; i < daysToplan; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      
      // Skip weekends for B2B content
      if (date.getDay() === 0 || date.getDay() === 6) continue
      
      // Plan content for each day
      const dayPlan = await this.planDayContent(date)
      calendar.push(...dayPlan)
    }
    
    // Store in calendar
    for (const item of calendar) {
      this.contentCalendar.set(item.id, item)
    }
    
    return {
      success: true,
      response: `Content calendar planned for next ${daysToplan} days. ${calendar.length} pieces scheduled.`,
      data: { calendar },
    }
  }
  
  // =============================================================================
  // TOOL IMPLEMENTATIONS
  // =============================================================================
  
  private async generateBlogPost(params: BlogParams) {
    const keywords = params.keywords || ["commercial moving", "office relocation", "Melbourne"]
    const length = params.length || "medium"
    
    const wordCount = length === "short" ? 600 : length === "medium" ? 1200 : 2000
    
    const blogPrompt = `Write a ${wordCount}-word blog post about "${params.topic}" for M&M Commercial Moving.

Target keywords: ${keywords.join(", ")}
Tone: ${params.tone || "professional"}
Target audience: ${params.targetAudience || "Melbourne business decision-makers"}

Include:
- An engaging headline with the primary keyword
- Meta description (155 chars max)
- Introduction that hooks the reader
- 3-5 main sections with H2 headings
- Practical tips or insights
- Conclusion with CTA
- Suggested internal links

Use Australian English. Be informative and valuable, not salesy.`

    const blogPost = await this.generateStructuredResponse(
      blogPrompt,
      z.object({
        title: z.string(),
        metaDescription: z.string(),
        slug: z.string(),
        content: z.string(),
        excerpt: z.string(),
        headings: z.array(z.string()),
        keywords: z.array(z.string()),
        suggestedImages: z.array(z.string()),
        cta: z.string(),
        estimatedReadTime: z.number(),
      })
    )
    
    const content: ContentPiece = {
      id: this.generateId(),
      type: "blog",
      title: blogPost.title,
      content: blogPost.content,
      status: "draft",
      createdAt: new Date(),
    }
    
    return {
      success: true,
      data: {
        ...content,
        ...blogPost,
      },
    }
  }
  
  private async generateSocialPost(params: SocialParams) {
    const platformGuidelines = PLATFORM_GUIDELINES[params.platform]
    
    const postPrompt = `Create a ${params.platform} post for M&M Commercial Moving about "${params.topic}".

Platform guidelines:
- Character limit: ${platformGuidelines.charLimit}
- Hashtag limit: ${platformGuidelines.hashtagLimit}
- Best practices: ${platformGuidelines.bestPractices}

Content type: ${params.contentType || "educational"}
${params.cta ? `Call to action: ${params.cta}` : ""}

Make it engaging, professional, and appropriate for B2B audience. Use Australian English.`

    const post = await this.generateStructuredResponse(
      postPrompt,
      z.object({
        content: z.string(),
        hashtags: z.array(z.string()),
        imagePrompt: z.string().optional(),
        linkText: z.string().optional(),
        bestTimeToPost: z.string(),
      })
    )
    
    const content: ContentPiece = {
      id: this.generateId(),
      type: "social",
      platform: params.platform as Platform,
      title: params.topic,
      content: post.content,
      status: "draft",
      createdAt: new Date(),
    }
    
    return {
      success: true,
      data: {
        ...content,
        hashtags: post.hashtags,
        imagePrompt: params.includeImage ? post.imagePrompt : undefined,
        bestTimeToPost: post.bestTimeToPost,
      },
    }
  }
  
  private async schedulePost(params: ScheduleParams) {
    const scheduledContent: ScheduledContent = {
      id: params.contentId,
      platform: params.platform as Platform,
      scheduledTime: new Date(params.scheduledTime),
      status: "scheduled",
    }
    
    this.contentCalendar.set(params.contentId, scheduledContent)
    
    this.log("info", "schedulePost", `Content scheduled for ${params.scheduledTime}`, params)
    
    return {
      success: true,
      data: {
        contentId: params.contentId,
        platform: params.platform,
        scheduledTime: params.scheduledTime,
        status: "scheduled",
      },
    }
  }
  
  private async analyzePerformance(params: AnalyzeParams) {
    // In production, integrate with analytics APIs
    const mockMetrics: ChannelPerformance = {
      channel: params.channel,
      period: params.period || "month",
      metrics: {
        impressions: 15420,
        reach: 8750,
        engagement: 1240,
        engagementRate: 8.03,
        clicks: 342,
        ctr: 2.22,
        conversions: 28,
        conversionRate: 8.19,
        cost: 1500,
        cpc: 4.39,
        cpa: 53.57,
      },
      topContent: [
        { title: "5 Tips for a Seamless Office Move", engagement: 245 },
        { title: "Data Center Migration Checklist", engagement: 189 },
        { title: "Client Success Story: TechCorp", engagement: 167 },
      ],
      recommendations: [
        "Increase posting frequency on LinkedIn - 15% higher engagement",
        "Video content performs 2x better - consider more video posts",
        "Tuesday and Thursday posts get 20% more reach",
      ],
    }
    
    return {
      success: true,
      data: mockMetrics,
    }
  }
  
  private async optimizeAds(params: AdOptimizeParams) {
    const recommendations: AdRecommendation[] = [
      {
        type: "budget_reallocation",
        description: "Shift 20% budget from display to search - higher conversion rate",
        impact: "+15% conversions",
        priority: "high",
      },
      {
        type: "keyword_expansion",
        description: "Add 'commercial removalist Melbourne' keyword - high intent, low competition",
        impact: "+25 clicks/week",
        priority: "medium",
      },
      {
        type: "ad_copy",
        description: "Test new headline: 'Zero Downtime Office Moves' vs current",
        impact: "+10% CTR expected",
        priority: "medium",
      },
      {
        type: "targeting",
        description: "Add 'Office Manager' job title targeting on LinkedIn",
        impact: "+20% qualified leads",
        priority: "high",
      },
    ]
    
    return {
      success: true,
      data: {
        platform: params.platform,
        currentSpend: params.budget || 2000,
        recommendations,
        estimatedImprovement: "+25% ROAS",
      },
    }
  }
  
  private async generateEmailSequence(params: EmailSequenceParams) {
    const numberOfEmails = params.numberOfEmails || 5
    
    const sequencePrompt = `Create a ${params.sequenceType} email sequence for M&M Commercial Moving.
    
Number of emails: ${numberOfEmails}
Target audience: ${params.audienceSegment || "Business decision-makers considering office relocation"}

For each email, provide:
- Subject line (A/B test variants)
- Preview text
- Main content
- CTA
- Recommended send timing (delay from previous email)

Keep emails concise, valuable, and professional. Use Australian English.
Focus on building trust and providing value, not hard selling.`

    const sequence = await this.generateStructuredResponse(
      sequencePrompt,
      z.object({
        sequenceName: z.string(),
        emails: z.array(z.object({
          order: z.number(),
          subjectA: z.string(),
          subjectB: z.string(),
          previewText: z.string(),
          content: z.string(),
          cta: z.string(),
          ctaUrl: z.string(),
          delayDays: z.number(),
        })),
        expectedOpenRate: z.string(),
        expectedClickRate: z.string(),
      })
    )
    
    return {
      success: true,
      data: sequence,
    }
  }
  
  private async createCampaign(params: CreateCampaignParams) {
    const campaign: Campaign = {
      id: this.generateId(),
      name: params.name,
      type: params.type as any,
      status: "draft",
      budget: params.budget,
      startDate: params.startDate ? new Date(params.startDate) : new Date(),
      endDate: params.endDate ? new Date(params.endDate) : undefined,
      targetAudience: params.targetAudience ? [params.targetAudience] : [],
    }
    
    this.campaigns.set(campaign.id, campaign)
    
    // Generate campaign brief
    const brief = await this.generateResponse([{
      id: this.generateId(),
      role: "user",
      content: `Create a campaign brief for: ${params.name}. Type: ${params.type}. Channels: ${params.channels.join(", ")}`,
      timestamp: new Date(),
    }])
    
    return {
      success: true,
      data: {
        campaign,
        brief,
        suggestedContent: [
          `${params.type === "awareness" ? "Brand story video" : "Lead magnet offer"}`,
          "Social media posts (10 pieces)",
          "Email sequence (5 emails)",
          params.channels.includes("google") ? "Search ads (5 variants)" : null,
        ].filter(Boolean),
      },
    }
  }
  
  private async researchKeywords(params: KeywordParams) {
    const seedKeywords = params.seedKeywords || ["commercial moving", "office relocation"]
    
    // In production, integrate with SEMrush/Ahrefs API
    const keywords: KeywordData[] = [
      { keyword: "commercial moving Melbourne", volume: 720, difficulty: 45, intent: "transactional" },
      { keyword: "office relocation services", volume: 480, difficulty: 38, intent: "commercial" },
      { keyword: "business moving company", volume: 390, difficulty: 42, intent: "commercial" },
      { keyword: "commercial removalists Melbourne", volume: 320, difficulty: 35, intent: "transactional" },
      { keyword: "office move checklist", volume: 590, difficulty: 25, intent: "informational" },
      { keyword: "how to plan office relocation", volume: 210, difficulty: 22, intent: "informational" },
      { keyword: "data center migration services", volume: 170, difficulty: 48, intent: "commercial" },
      { keyword: "IT equipment moving", volume: 140, difficulty: 32, intent: "commercial" },
    ]
    
    return {
      success: true,
      data: {
        seedKeywords,
        expandedKeywords: keywords,
        contentOpportunities: keywords.filter(k => k.intent === "informational" && k.difficulty < 30),
        targetKeywords: keywords.filter(k => k.intent === "transactional" || k.intent === "commercial"),
      },
    }
  }
  
  // =============================================================================
  // HELPER METHODS
  // =============================================================================
  
  private async handleBlogRequest(content: string, metadata?: Record<string, unknown>): Promise<AgentOutput> {
    const topic = this.extractTopic(content) || "office relocation best practices"
    return await this.generateBlogPost({ topic })
  }
  
  private async handleSocialRequest(content: string, metadata?: Record<string, unknown>): Promise<AgentOutput> {
    const topic = this.extractTopic(content) || "commercial moving tips"
    const results: any[] = []
    
    for (const platform of this.marketingConfig.activePlatforms) {
      const result = await this.generateSocialPost({ platform: platform as Platform, topic })
      if (result.success) results.push(result.data)
    }
    
    return {
      success: true,
      response: `Generated ${results.length} social posts.`,
      data: { posts: results },
    }
  }
  
  private async handleEmailRequest(content: string, metadata?: Record<string, unknown>): Promise<AgentOutput> {
    return await this.generateEmailSequence({ sequenceType: "nurture" })
  }
  
  private async handleCampaignRequest(content: string, metadata?: Record<string, unknown>): Promise<AgentOutput> {
    return await this.createCampaign({
      name: "New Campaign",
      type: "lead_gen",
      channels: ["linkedin", "email"],
    })
  }
  
  private async createTestimonialContent(data: Record<string, unknown>): Promise<AgentOutput> {
    const testimonial = data as any
    
    // Generate multiple content pieces from testimonial
    const content = []
    
    // Social post
    const socialResult = await this.generateSocialPost({
      platform: "linkedin",
      topic: `Client success story: ${testimonial.companyName}`,
      contentType: "testimonial",
    })
    if (socialResult.success) content.push(socialResult.data)
    
    return {
      success: true,
      response: "Testimonial content created.",
      data: { content },
    }
  }
  
  private async createThoughtLeadership(data: Record<string, unknown>): Promise<AgentOutput> {
    const news = data as any
    
    const blogResult = await this.generateBlogPost({
      topic: `Industry insight: ${news.headline}`,
      tone: "educational",
    })
    
    return {
      success: true,
      response: "Thought leadership content created.",
      data: blogResult.data,
    }
  }
  
  private async respondToCompetitor(data: Record<string, unknown>): Promise<AgentOutput> {
    return { success: true, response: "Competitor response strategy created." }
  }
  
  private async createCaseStudy(data: Record<string, unknown>): Promise<AgentOutput> {
    return { success: true, response: "Case study content created." }
  }
  
  private async handleReputationContent(context: Record<string, unknown>): Promise<AgentOutput> {
    return { success: true, response: "Reputation content handled." }
  }
  
  private async generateMonthlyReport(): Promise<AgentOutput> {
    return { success: true, response: "Monthly report generated." }
  }
  
  private selectDailyTopic(): string {
    const topics = [
      "office move preparation tips",
      "minimizing downtime during relocation",
      "IT equipment handling best practices",
      "commercial moving checklist",
      "post-move setup efficiency",
    ]
    return topics[Math.floor(Math.random() * topics.length)]
  }
  
  private getOptimalPostTime(platform: string): Date {
    const now = new Date()
    const optimal = new Date(now)
    
    // Set to next optimal posting time
    switch (platform) {
      case "linkedin":
        optimal.setHours(9, 0, 0) // 9 AM
        break
      case "facebook":
        optimal.setHours(13, 0, 0) // 1 PM
        break
      case "instagram":
        optimal.setHours(11, 0, 0) // 11 AM
        break
      default:
        optimal.setHours(10, 0, 0)
    }
    
    // If time has passed, schedule for tomorrow
    if (optimal <= now) {
      optimal.setDate(optimal.getDate() + 1)
    }
    
    return optimal
  }
  
  private async planDayContent(date: Date): Promise<ScheduledContent[]> {
    const content: ScheduledContent[] = []
    
    // Plan LinkedIn post
    content.push({
      id: this.generateId(),
      platform: "linkedin",
      scheduledTime: new Date(date.setHours(9, 0, 0)),
      status: "planned",
      topic: this.selectDailyTopic(),
    })
    
    return content
  }
  
  private extractTopic(content: string): string | null {
    const aboutMatch = content.match(/about\s+["']?([^"'\n]+)["']?/i)
    if (aboutMatch) return aboutMatch[1]
    
    const onMatch = content.match(/on\s+["']?([^"'\n]+)["']?/i)
    if (onMatch) return onMatch[1]
    
    return null
  }
}

// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================

const AURORA_SYSTEM_PROMPT = `You are Aurora, an AI Marketing Agent for M&M Commercial Moving, a premier commercial relocation service in Melbourne, Australia.

## Your Role
You create engaging marketing content, manage campaigns, and build brand awareness to generate leads and establish M&M as the go-to commercial moving company in Melbourne.

## Brand Voice
- Professional yet approachable
- Confident but not arrogant
- Helpful and informative
- Tech-forward and innovative
- Australian English (colour not color, organise not organize)

## Content Pillars
1. Educational: Office move tips, checklists, best practices
2. Trust: Case studies, testimonials, behind-the-scenes
3. Thought Leadership: Industry insights, trends, innovations
4. Brand: Company culture, team, values

## Target Audience
- Office Managers
- Operations Directors
- Facilities Managers
- IT Managers
- C-suite executives (smaller companies)

## Key Messages
- Zero-downtime moves
- Tech-powered precision
- White-glove service
- Melbourne local expertise
- 100% satisfaction guarantee

## Content Guidelines
- Always provide value first
- Use data and statistics when possible
- Include clear calls-to-action
- Optimize for SEO where applicable
- A/B test headlines and subject lines`

interface MarketingConfig {
  activePlatforms: string[]
  postingFrequency: Record<string, number>
  contentMix: Record<string, number>
  brandKeywords: string[]
}

const DEFAULT_MARKETING_CONFIG: MarketingConfig = {
  activePlatforms: ["linkedin", "facebook", "instagram"],
  postingFrequency: {
    linkedin: 5, // per week
    facebook: 3,
    instagram: 4,
    email: 1,
  },
  contentMix: {
    educational: 40,
    promotional: 20,
    engagement: 20,
    testimonial: 20,
  },
  brandKeywords: ["commercial moving", "office relocation", "Melbourne movers", "business moving"],
}

const PLATFORM_GUIDELINES: Record<string, { charLimit: number; hashtagLimit: number; bestPractices: string }> = {
  linkedin: {
    charLimit: 3000,
    hashtagLimit: 5,
    bestPractices: "Professional tone, industry insights, longer form content performs well",
  },
  facebook: {
    charLimit: 500,
    hashtagLimit: 3,
    bestPractices: "Engaging questions, visual content, community-focused",
  },
  instagram: {
    charLimit: 2200,
    hashtagLimit: 30,
    bestPractices: "Visual-first, story-telling, behind-the-scenes content",
  },
  twitter: {
    charLimit: 280,
    hashtagLimit: 2,
    bestPractices: "Concise, timely, conversational",
  },
}

interface ScheduledContent {
  id: string
  platform: Platform | string
  scheduledTime: Date
  status: "planned" | "scheduled" | "published"
  topic?: string
  contentId?: string
}

interface ChannelPerformance {
  channel: string
  period: string
  metrics: {
    impressions: number
    reach: number
    engagement: number
    engagementRate: number
    clicks: number
    ctr: number
    conversions: number
    conversionRate: number
    cost: number
    cpc: number
    cpa: number
  }
  topContent: { title: string; engagement: number }[]
  recommendations: string[]
}

interface AdRecommendation {
  type: string
  description: string
  impact: string
  priority: "high" | "medium" | "low"
}

interface KeywordData {
  keyword: string
  volume: number
  difficulty: number
  intent: string
}

interface BlogParams {
  topic: string
  keywords?: string[]
  tone?: string
  length?: string
  targetAudience?: string
}

interface SocialParams {
  platform: Platform | string
  topic: string
  contentType?: string
  includeImage?: boolean
  cta?: string
}

interface ScheduleParams {
  contentId: string
  platform: string
  scheduledTime: string
}

interface AnalyzeParams {
  channel: string
  period?: string
  compareToLast?: boolean
}

interface AdOptimizeParams {
  platform: string
  campaignId?: string
  budget?: number
}

interface EmailSequenceParams {
  sequenceType: string
  numberOfEmails?: number
  audienceSegment?: string
}

interface CreateCampaignParams {
  name: string
  type: string
  channels: string[]
  budget?: number
  startDate?: string
  endDate?: string
  targetAudience?: string
}

interface KeywordParams {
  seedKeywords: string[]
  intent?: string
  location?: string
}

// =============================================================================
// FACTORY & SINGLETON
// =============================================================================

let auroraInstance: AuroraAgent | null = null

export function getAurora(): AuroraAgent {
  if (!auroraInstance) {
    auroraInstance = new AuroraAgent()
  }
  return auroraInstance
}

export function resetAurora(): void {
  auroraInstance = null
}

