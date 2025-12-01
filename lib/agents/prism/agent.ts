/**
 * PRISM - Dynamic Pricing Agent
 * Demand-based pricing, competitor analysis, and revenue optimization
 */

import { z } from "zod"
import { BaseAgent, type AgentInput, type AgentOutput } from "../base-agent"
import type { AgentIdentity, AgentConfig, InterAgentMessage } from "../types"

// =============================================================================
// PRISM AGENT
// =============================================================================

export class PrismAgent extends BaseAgent {
  private pricingConfig: PricingConfig
  private demandData: Map<string, DemandData> = new Map()
  
  constructor(config?: Partial<AgentConfig>) {
    super({
      codename: "PRISM_PRICE",
      enabled: true,
      model: "gpt-4o",
      temperature: 0.4,
      maxTokens: 1500,
      systemPrompt: PRISM_SYSTEM_PROMPT,
      tools: [
        "calculatePrice",
        "analyzeCompetitors",
        "getDemandForecast",
        "suggestDiscount",
        "optimizePricing",
        "getMarginAnalysis",
        "trackConversion",
      ],
      triggers: [
        { event: "quote_requested", action: "calculate_dynamic_price", priority: 1 },
        { event: "competitor_update", action: "analyze_market", priority: 2 },
        { event: "weekly_review", action: "optimize_pricing", priority: 3 },
      ],
      escalationRules: [
        { condition: "price_override_large", reason: "high_value_deal", priority: "medium" },
        { condition: "margin_below_threshold", reason: "compliance_issue", priority: "high" },
      ],
      rateLimits: { requestsPerMinute: 40, tokensPerDay: 200000 },
      ...config,
    })
    
    this.pricingConfig = DEFAULT_PRICING_CONFIG
    this.initializeDemandData()
  }
  
  protected getIdentity(): AgentIdentity {
    return {
      codename: "PRISM_PRICE",
      name: "Prism",
      description: "AI Pricing Agent - Dynamic pricing, competitor analysis, and revenue optimization",
      version: "1.0.0",
      capabilities: [
        "Dynamic Pricing",
        "Demand Forecasting",
        "Competitor Analysis",
        "Discount Optimization",
        "Margin Analysis",
        "Conversion Tracking",
        "Revenue Optimization",
      ],
      status: "idle",
    }
  }
  
  private initializeDemandData() {
    // Initialize with sample demand patterns
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    days.forEach((day, i) => {
      this.demandData.set(day, {
        baseMultiplier: i === 5 || i === 6 ? 1.2 : 1.0, // Weekend premium
        historicalBookings: Math.floor(Math.random() * 10) + 5,
        forecastedDemand: "normal",
      })
    })
  }
  
  protected registerTools(): void {
    this.registerTool({
      name: "calculatePrice",
      description: "Calculate dynamic price for a move",
      parameters: {
        type: "object",
        properties: {
          moveType: { type: "string", enum: ["office", "datacenter", "warehouse", "retail", "it"], description: "Type of move" },
          squareMeters: { type: "number", description: "Size in sqm" },
          origin: { type: "string", description: "Origin suburb" },
          destination: { type: "string", description: "Destination suburb" },
          date: { type: "string", description: "Move date" },
          additionalServices: { type: "array", description: "Extra services" },
        },
        required: ["moveType", "squareMeters", "origin", "destination"],
      },
      handler: async (params) => this.calculatePrice(params as PriceParams),
    })
    
    this.registerTool({
      name: "analyzeCompetitors",
      description: "Analyze competitor pricing",
      parameters: {
        type: "object",
        properties: {
          region: { type: "string", description: "Region to analyze" },
          moveType: { type: "string", description: "Type of move" },
        },
        required: [],
      },
      handler: async (params) => this.analyzeCompetitors(params as CompetitorParams),
    })
    
    this.registerTool({
      name: "getDemandForecast",
      description: "Get demand forecast for a period",
      parameters: {
        type: "object",
        properties: {
          startDate: { type: "string", description: "Start date" },
          endDate: { type: "string", description: "End date" },
          region: { type: "string", description: "Region" },
        },
        required: [],
      },
      handler: async (params) => this.getDemandForecast(params as ForecastParams),
    })
    
    this.registerTool({
      name: "suggestDiscount",
      description: "Suggest optimal discount for a deal",
      parameters: {
        type: "object",
        properties: {
          leadId: { type: "string", description: "Lead ID" },
          currentPrice: { type: "number", description: "Current quoted price" },
          dealValue: { type: "number", description: "Deal lifetime value" },
          urgency: { type: "string", enum: ["low", "medium", "high"], description: "Deal urgency" },
        },
        required: ["leadId", "currentPrice"],
      },
      handler: async (params) => this.suggestDiscount(params as DiscountParams),
    })
    
    this.registerTool({
      name: "optimizePricing",
      description: "Optimize pricing strategy",
      parameters: {
        type: "object",
        properties: {
          objective: { type: "string", enum: ["revenue", "volume", "margin", "market_share"], description: "Optimization objective" },
          constraints: { type: "array", description: "Constraints to consider" },
        },
        required: ["objective"],
      },
      handler: async (params) => this.optimizePricing(params as OptimizeParams),
    })
    
    this.registerTool({
      name: "getMarginAnalysis",
      description: "Get margin analysis for recent jobs",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["week", "month", "quarter"], description: "Analysis period" },
          byCategory: { type: "boolean", description: "Break down by category" },
        },
        required: [],
      },
      handler: async (params) => this.getMarginAnalysis(params as MarginParams),
    })
    
    this.registerTool({
      name: "trackConversion",
      description: "Track quote-to-booking conversion",
      parameters: {
        type: "object",
        properties: {
          quoteId: { type: "string", description: "Quote ID" },
          outcome: { type: "string", enum: ["converted", "lost", "pending"], description: "Outcome" },
          lostReason: { type: "string", description: "Reason if lost" },
        },
        required: ["quoteId", "outcome"],
      },
      handler: async (params) => this.trackConversion(params as ConversionParams),
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
      case "quote_requested":
        return await this.handleQuoteRequest(event.data)
      case "competitor_update":
        return await this.handleCompetitorUpdate(event.data)
      default:
        return { success: false, error: `Unknown event: ${event.name}` }
    }
  }
  
  private async handleScheduledTask(input: AgentInput): Promise<AgentOutput> {
    const taskType = input.metadata?.taskType as string
    if (taskType === "weekly_review") return await this.runWeeklyReview()
    return { success: false, error: "Unknown task" }
  }
  
  private async handleHandoffInput(input: AgentInput): Promise<AgentOutput> {
    // Handle pricing requests from MAYA
    if (input.handoff?.fromAgent === "MAYA_SALES") {
      return await this.handleQuoteRequest(input.handoff.context)
    }
    return { success: true, response: "Handoff received" }
  }
  
  public async handleInterAgentMessage(message: InterAgentMessage): Promise<void> {
    this.log("info", "handleInterAgentMessage", `From ${message.from}`)
  }
  
  // =============================================================================
  // PRICING WORKFLOWS
  // =============================================================================
  
  private async handleQuoteRequest(data: Record<string, unknown>): Promise<AgentOutput> {
    const priceResult = await this.calculatePrice({
      moveType: data.moveType as string,
      squareMeters: data.squareMeters as number,
      origin: data.origin as string,
      destination: data.destination as string,
      date: data.date as string,
      additionalServices: data.additionalServices as string[],
    })
    
    return {
      success: true,
      response: "Price calculated",
      data: priceResult.data,
    }
  }
  
  private async handleCompetitorUpdate(data: Record<string, unknown>): Promise<AgentOutput> {
    const analysis = await this.analyzeCompetitors({
      region: data.region as string,
      moveType: data.moveType as string,
    })
    
    // If competitors are significantly cheaper, alert
    if ((analysis.data as any)?.marketPosition === "above_market") {
      await this.sendToAgent("ORACLE_BI", "notification", {
        type: "competitor_alert",
        analysis: analysis.data,
      })
    }
    
    return { success: true, response: "Competitor analysis updated" }
  }
  
  private async runWeeklyReview(): Promise<AgentOutput> {
    const margin = await this.getMarginAnalysis({ period: "week" })
    const optimization = await this.optimizePricing({ objective: "margin" })
    
    return {
      success: true,
      response: "Weekly pricing review completed",
      data: { margin: margin.data, recommendations: optimization.data },
    }
  }
  
  // =============================================================================
  // TOOL IMPLEMENTATIONS
  // =============================================================================
  
  private async calculatePrice(params: PriceParams) {
    // Base rate per sqm
    const baseRates: Record<string, number> = {
      office: 45,
      datacenter: 120,
      warehouse: 35,
      retail: 40,
      it: 80,
    }
    
    const baseRate = baseRates[params.moveType] || 45
    let price = params.squareMeters * baseRate
    
    // Distance modifier (simplified)
    const distanceMultiplier = this.calculateDistanceMultiplier(params.origin, params.destination)
    price *= distanceMultiplier
    
    // Day-of-week demand modifier
    if (params.date) {
      const dayOfWeek = new Date(params.date).toLocaleDateString("en-US", { weekday: "lowercase" })
      const demandInfo = this.demandData.get(dayOfWeek)
      if (demandInfo) {
        price *= demandInfo.baseMultiplier
      }
    }
    
    // Additional services
    const servicePrices: Record<string, number> = {
      packing: 500,
      furniture_disassembly: 300,
      it_cabling: 800,
      after_hours: 400,
      weekend: 300,
      storage: 200,
    }
    
    let additionalCost = 0
    if (params.additionalServices) {
      params.additionalServices.forEach(service => {
        additionalCost += servicePrices[service] || 0
      })
    }
    
    const subtotal = price + additionalCost
    const gst = subtotal * 0.1
    const total = subtotal + gst
    
    // Calculate margin
    const estimatedCost = subtotal * 0.65
    const margin = ((subtotal - estimatedCost) / subtotal) * 100
    
    this.log("info", "calculatePrice", `Quote: $${total.toFixed(2)} for ${params.squareMeters}sqm ${params.moveType} move`)
    
    return {
      success: true,
      data: {
        quoteId: `Q-${Date.now()}`,
        breakdown: {
          basePrice: Math.round(price),
          additionalServices: additionalCost,
          subtotal: Math.round(subtotal),
          gst: Math.round(gst),
          total: Math.round(total),
        },
        deposit: Math.round(total * 0.5),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        margin: margin.toFixed(1),
        demandLevel: this.getDemandLevel(params.date),
      },
    }
  }
  
  private async analyzeCompetitors(params: CompetitorParams) {
    // In production, would integrate with competitor monitoring tools
    const competitors = [
      { name: "Metro Movers", avgPrice: 42, rating: 4.2 },
      { name: "CBD Relocations", avgPrice: 55, rating: 4.5 },
      { name: "Office Movers Plus", avgPrice: 48, rating: 4.0 },
    ]
    
    const ourAvgPrice = 45
    const marketAvg = competitors.reduce((sum, c) => sum + c.avgPrice, 0) / competitors.length
    
    return {
      success: true,
      data: {
        region: params.region || "Melbourne",
        competitors,
        marketAverage: marketAvg,
        ourPosition: ourAvgPrice < marketAvg ? "below_market" : ourAvgPrice > marketAvg * 1.1 ? "above_market" : "market_rate",
        recommendation: ourAvgPrice > marketAvg * 1.1 ? "Consider promotional pricing" : "Pricing competitive",
      },
    }
  }
  
  private async getDemandForecast(params: ForecastParams) {
    // Generate 14-day forecast
    const forecast = []
    const startDate = new Date(params.startDate || Date.now())
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      const dayName = date.toLocaleDateString("en-US", { weekday: "lowercase" })
      const demandInfo = this.demandData.get(dayName)
      
      // Add seasonal and random variation
      const monthFactor = this.getSeasonalFactor(date.getMonth())
      const randomVariation = 0.9 + Math.random() * 0.2
      
      forecast.push({
        date: date.toISOString().split("T")[0],
        demandLevel: demandInfo?.forecastedDemand || "normal",
        priceMultiplier: ((demandInfo?.baseMultiplier || 1) * monthFactor * randomVariation).toFixed(2),
        recommendedCapacity: Math.ceil((demandInfo?.historicalBookings || 5) * monthFactor),
      })
    }
    
    return { success: true, data: { forecast } }
  }
  
  private async suggestDiscount(params: DiscountParams) {
    let maxDiscount = this.pricingConfig.maxDiscount
    let suggestedDiscount = 0
    
    // High urgency = willing to discount more
    if (params.urgency === "high") {
      suggestedDiscount = maxDiscount * 0.8
    } else if (params.urgency === "medium") {
      suggestedDiscount = maxDiscount * 0.5
    } else {
      suggestedDiscount = maxDiscount * 0.25
    }
    
    // If high lifetime value, allow more discount
    if (params.dealValue && params.dealValue > params.currentPrice * 3) {
      suggestedDiscount = Math.min(suggestedDiscount * 1.5, maxDiscount)
    }
    
    const discountAmount = Math.round(params.currentPrice * (suggestedDiscount / 100))
    const newPrice = params.currentPrice - discountAmount
    
    return {
      success: true,
      data: {
        leadId: params.leadId,
        originalPrice: params.currentPrice,
        suggestedDiscount: Math.round(suggestedDiscount),
        discountAmount,
        newPrice,
        approvalRequired: suggestedDiscount > 10,
      },
    }
  }
  
  private async optimizePricing(params: OptimizeParams) {
    const objectives: Record<string, any> = {
      revenue: { adjustment: "+5%", rationale: "Increase prices on high-demand days" },
      volume: { adjustment: "-5%", rationale: "Reduce prices to capture more bookings" },
      margin: { adjustment: "Maintain", rationale: "Current pricing optimal for margins" },
      market_share: { adjustment: "-10%", rationale: "Aggressive pricing to gain market share" },
    }
    
    return {
      success: true,
      data: {
        objective: params.objective,
        recommendation: objectives[params.objective],
        affectedServices: ["office", "datacenter"],
        implementationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
    }
  }
  
  private async getMarginAnalysis(params: MarginParams) {
    return {
      success: true,
      data: {
        period: params.period || "month",
        averageMargin: 32.5,
        targetMargin: 35,
        marginByCategory: params.byCategory ? {
          office: 35.2,
          datacenter: 42.1,
          warehouse: 28.5,
          retail: 31.8,
          it: 38.9,
        } : undefined,
        trend: "+2.3% vs previous period",
        recommendation: "Increase warehouse rates by 5% to improve margin",
      },
    }
  }
  
  private async trackConversion(params: ConversionParams) {
    this.log("info", "trackConversion", `Quote ${params.quoteId}: ${params.outcome}`)
    
    return {
      success: true,
      data: {
        quoteId: params.quoteId,
        outcome: params.outcome,
        lostReason: params.lostReason,
        recordedAt: new Date(),
      },
    }
  }
  
  // =============================================================================
  // HELPER METHODS
  // =============================================================================
  
  private calculateDistanceMultiplier(origin: string, destination: string): number {
    // Simplified distance calculation
    // In production, use Google Maps Distance Matrix API
    const innerSuburbs = ["cbd", "richmond", "south yarra", "prahran", "fitzroy", "carlton"]
    const outerSuburbs = ["dandenong", "frankston", "werribee", "ringwood", "eltham"]
    
    const originInner = innerSuburbs.some(s => origin?.toLowerCase().includes(s))
    const destInner = innerSuburbs.some(s => destination?.toLowerCase().includes(s))
    const originOuter = outerSuburbs.some(s => origin?.toLowerCase().includes(s))
    const destOuter = outerSuburbs.some(s => destination?.toLowerCase().includes(s))
    
    if (originOuter && destOuter) return 1.3 // Both outer
    if (originOuter || destOuter) return 1.15 // One outer
    if (originInner && destInner) return 1.0 // Both inner
    return 1.1 // Mixed
  }
  
  private getSeasonalFactor(month: number): number {
    // Higher demand at end/start of financial year and December
    const seasonalFactors = [1.1, 1.0, 1.0, 0.9, 1.0, 1.2, 1.1, 0.9, 0.9, 1.0, 1.1, 1.2]
    return seasonalFactors[month]
  }
  
  private getDemandLevel(date?: string): string {
    if (!date) return "normal"
    const dayOfWeek = new Date(date).getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) return "high"
    const month = new Date(date).getMonth()
    if (month === 5 || month === 11) return "high" // June, December
    return "normal"
  }
}

// =============================================================================
// TYPES & CONFIG
// =============================================================================

const PRISM_SYSTEM_PROMPT = `You are Prism, an AI Pricing Agent for M&M Commercial Moving.

## Your Role
- Calculate dynamic, optimized pricing
- Monitor competitor rates
- Forecast demand and adjust pricing
- Suggest strategic discounts
- Maximize revenue while maintaining margins

## Pricing Principles
- Base pricing on move complexity, not just size
- Premium for urgent/weekend bookings
- Discounts for advance bookings
- Value-based pricing for specialized services
- Always maintain minimum margin

## Never:
- Go below cost
- Price below minimum margins without approval
- Ignore competitor moves`

interface PricingConfig {
  minMargin: number
  maxDiscount: number
  urgentPremium: number
  weekendPremium: number
}

const DEFAULT_PRICING_CONFIG: PricingConfig = {
  minMargin: 25,
  maxDiscount: 15,
  urgentPremium: 25,
  weekendPremium: 20,
}

interface DemandData {
  baseMultiplier: number
  historicalBookings: number
  forecastedDemand: string
}

interface PriceParams { moveType: string; squareMeters: number; origin: string; destination: string; date?: string; additionalServices?: string[] }
interface CompetitorParams { region?: string; moveType?: string }
interface ForecastParams { startDate?: string; endDate?: string; region?: string }
interface DiscountParams { leadId: string; currentPrice: number; dealValue?: number; urgency?: string }
interface OptimizeParams { objective: string; constraints?: string[] }
interface MarginParams { period?: string; byCategory?: boolean }
interface ConversionParams { quoteId: string; outcome: string; lostReason?: string }

// =============================================================================
// FACTORY
// =============================================================================

let prismInstance: PrismAgent | null = null

export function getPrism(): PrismAgent {
  if (!prismInstance) prismInstance = new PrismAgent()
  return prismInstance
}

export function resetPrism(): void {
  prismInstance = null
}
