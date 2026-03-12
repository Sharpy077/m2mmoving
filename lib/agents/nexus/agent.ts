import { BaseAgent, type AgentInput, type AgentOutput } from "../base-agent"
import type { AgentIdentity, AgentConfig, InterAgentMessage } from "../types"

// =============================================================================
// NEXUS AGENT
// =============================================================================

export class NexusAgent extends BaseAgent {
  private opsConfig: OperationsConfig
  private schedule: Map<string, ScheduledJob[]> = new Map()
  private resources: ResourcePool

  constructor(config?: Partial<AgentConfig>) {
    super({
      codename: "NEXUS_OPS",
      enabled: true,
      model: "anthropic/claude-sonnet-4-20250514",
      temperature: 0.3, // Low temperature for precise scheduling
      maxTokens: 2000,
      systemPrompt: NEXUS_SYSTEM_PROMPT,
      tools: [
        "scheduleJob",
        "optimizeRoute",
        "assignCrew",
        "allocateVehicles",
        "checkCapacity",
        "sendDayOfUpdates",
        "handleContingency",
        "getScheduleOverview",
      ],
      triggers: [
        { event: "booking_confirmed", action: "schedule_job", priority: 1 },
        { event: "daily_optimization", action: "optimize_daily_schedule", priority: 2 },
        { event: "contingency_needed", action: "handle_contingency", priority: 1 },
      ],
      escalationRules: [
        { condition: "double_booking", reason: "compliance_issue", priority: "urgent" },
        { condition: "resource_shortage", reason: "high_value_deal", priority: "high" },
      ],
      rateLimits: { requestsPerMinute: 30, tokensPerDay: 300000 },
      ...config,
    })

    this.opsConfig = DEFAULT_OPS_CONFIG
    this.resources = DEFAULT_RESOURCE_POOL
  }

  protected getIdentity(): AgentIdentity {
    return {
      codename: "NEXUS_OPS",
      name: "Nexus",
      description: "AI Operations Agent - Manages scheduling, routing, crew assignment, and day-of coordination",
      version: "1.0.0",
      capabilities: [
        "Job Scheduling",
        "Route Optimization",
        "Crew Assignment",
        "Vehicle Allocation",
        "Capacity Planning",
        "Day-of Updates",
        "Contingency Handling",
        "Resource Management",
      ],
      status: "idle",
    }
  }

  protected registerTools(): void {
    this.registerTool({
      name: "scheduleJob",
      description: "Schedule a moving job",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string", description: "Job ID" },
          date: { type: "string", description: "Scheduled date" },
          startTime: { type: "string", description: "Start time" },
          estimatedDuration: { type: "number", description: "Duration in hours" },
          priority: { type: "string", enum: ["standard", "priority", "vip"], description: "Priority level" },
        },
        required: ["jobId", "date"],
      },
      handler: async (params) => this.scheduleJob(params as ScheduleParams),
    })

    this.registerTool({
      name: "optimizeRoute",
      description: "Optimize route for multiple stops",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date to optimize" },
          crewId: { type: "string", description: "Crew to optimize for" },
          considerTraffic: { type: "boolean", description: "Consider traffic patterns" },
        },
        required: ["date"],
      },
      handler: async (params) => this.optimizeRoute(params as RouteParams),
    })

    this.registerTool({
      name: "assignCrew",
      description: "Assign crew to a job",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string", description: "Job ID" },
          crewSize: { type: "number", description: "Required crew size" },
          skills: { type: "array", description: "Required skills" },
          preferredCrew: { type: "array", description: "Preferred crew members" },
        },
        required: ["jobId", "crewSize"],
      },
      handler: async (params) => this.assignCrew(params as CrewParams),
    })

    this.registerTool({
      name: "allocateVehicles",
      description: "Allocate vehicles for a job",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string", description: "Job ID" },
          vehicleType: {
            type: "string",
            enum: ["van", "truck_small", "truck_medium", "truck_large"],
            description: "Vehicle type",
          },
          quantity: { type: "number", description: "Number of vehicles" },
        },
        required: ["jobId", "vehicleType"],
      },
      handler: async (params) => this.allocateVehicles(params as VehicleParams),
    })

    this.registerTool({
      name: "checkCapacity",
      description: "Check available capacity for a date",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date to check" },
          jobType: { type: "string", description: "Type of job" },
          duration: { type: "number", description: "Estimated duration" },
        },
        required: ["date"],
      },
      handler: async (params) => this.checkCapacity(params as CapacityParams),
    })

    this.registerTool({
      name: "sendDayOfUpdates",
      description: "Send day-of status updates to customer",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string", description: "Job ID" },
          updateType: { type: "string", enum: ["eta", "started", "progress", "completed"], description: "Update type" },
          customMessage: { type: "string", description: "Custom message" },
        },
        required: ["jobId", "updateType"],
      },
      handler: async (params) => this.sendDayOfUpdates(params as UpdateParams),
    })

    this.registerTool({
      name: "handleContingency",
      description: "Handle scheduling contingencies",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string", description: "Affected job ID" },
          issue: {
            type: "string",
            enum: ["weather", "traffic", "crew_sick", "vehicle_breakdown", "customer_delay"],
            description: "Issue type",
          },
          severity: { type: "string", enum: ["minor", "moderate", "major"], description: "Impact severity" },
        },
        required: ["jobId", "issue"],
      },
      handler: async (params) => this.handleContingency(params as ContingencyParams),
    })

    this.registerTool({
      name: "getScheduleOverview",
      description: "Get overview of scheduled jobs",
      parameters: {
        type: "object",
        properties: {
          dateFrom: { type: "string", description: "Start date" },
          dateTo: { type: "string", description: "End date" },
          status: { type: "string", description: "Filter by status" },
        },
        required: [],
      },
      handler: async (params) => this.getScheduleOverview(params as OverviewParams),
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
    const content = input.content || ""

    if (content.includes("schedule") || content.includes("book")) {
      return await this.handleSchedulingRequest(content, input.metadata)
    }
    if (content.includes("capacity") || content.includes("available")) {
      return await this.handleCapacityRequest(content, input.metadata)
    }

    const response = await this.generateResponse(input.messages || [])
    return { success: true, response }
  }

  private async handleEvent(input: AgentInput): Promise<AgentOutput> {
    const event = input.event
    if (!event) return { success: false, error: "No event" }

    switch (event.name) {
      case "booking_confirmed":
        return await this.processNewBooking(event.data)
      case "job_started":
        return await this.handleJobStarted(event.data)
      case "job_completed":
        return await this.handleJobCompleted(event.data)
      case "contingency_needed":
        return await this.processContingency(event.data)
      default:
        return { success: false, error: `Unknown event: ${event.name}` }
    }
  }

  private async handleScheduledTask(input: AgentInput): Promise<AgentOutput> {
    const taskType = input.metadata?.taskType as string

    switch (taskType) {
      case "daily_optimization":
        return await this.runDailyOptimization()
      case "morning_briefing":
        return await this.generateMorningBriefing()
      default:
        return { success: false, error: "Unknown task" }
    }
  }

  private async handleHandoffInput(input: AgentInput): Promise<AgentOutput> {
    const handoff = input.handoff
    if (!handoff) return { success: false, error: "No handoff" }

    // Handle booking handoff from MAYA
    if (handoff.fromAgent === "MAYA_SALES") {
      return await this.processNewBooking(handoff.context)
    }

    return { success: true, response: "Handoff received" }
  }

  public async handleInterAgentMessage(message: InterAgentMessage): Promise<void> {
    this.log("info", "handleInterAgentMessage", `From ${message.from}`)
  }

  // =============================================================================
  // SCHEDULING WORKFLOWS
  // =============================================================================

  private async processNewBooking(data: Record<string, unknown>): Promise<AgentOutput> {
    const jobId = (data.jobId as string) || (data.leadId as string)
    const date = data.scheduledDate as string
    const moveType = data.moveType as string
    const sqm = (data.squareMeters as number) || 100

    // Estimate duration based on size
    const estimatedDuration = this.estimateDuration(moveType, sqm)

    // Check capacity
    const capacity = await this.checkCapacity({ date, duration: estimatedDuration })

    if (!(capacity.data as any)?.available) {
      return {
        success: false,
        error: "No capacity available for requested date",
        data: { suggestedDates: (capacity.data as any)?.alternatives },
      }
    }

    // Schedule the job
    const scheduleResult = await this.scheduleJob({
      jobId,
      date,
      estimatedDuration,
    })

    // Assign crew
    const crewSize = this.calculateCrewSize(moveType, sqm)
    await this.assignCrew({ jobId, crewSize, skills: this.getRequiredSkills(moveType) })

    // Allocate vehicle
    const vehicleType = this.selectVehicleType(sqm)
    await this.allocateVehicles({ jobId, vehicleType, quantity: 1 })

    // Notify SENTINEL to enable support
    await this.sendToAgent("SENTINEL_CS", "notification", {
      type: "job_scheduled",
      jobId,
      date,
    })

    return {
      success: true,
      response: "Job scheduled successfully",
      data: scheduleResult.data,
    }
  }

  private async runDailyOptimization(): Promise<AgentOutput> {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split("T")[0]

    // Optimize routes for all crews
    const routeResult = await this.optimizeRoute({ date: dateStr, considerTraffic: true })

    return {
      success: true,
      response: "Daily optimization completed",
      data: routeResult.data,
    }
  }

  private async generateMorningBriefing(): Promise<AgentOutput> {
    const today = new Date().toISOString().split("T")[0]
    const overview = await this.getScheduleOverview({ dateFrom: today, dateTo: today })

    const jobs = (overview.data as any)?.jobs || []

    const briefing = `
📋 **Operations Briefing - ${today}**

**Today's Jobs:** ${jobs.length}
**Crews Active:** ${this.resources.crews.filter((c: any) => c.status === "available").length}
**Vehicles Available:** ${this.resources.vehicles.filter((v: any) => v.status === "available").length}

${jobs.map((j: any) => `• ${j.time} - ${j.customer} (${j.type})`).join("\n")}

**Weather:** Clear, 22°C
**Traffic:** Normal conditions expected
`

    return { success: true, response: briefing, data: overview.data }
  }

  private async handleSchedulingRequest(content: string, metadata?: Record<string, unknown>): Promise<AgentOutput> {
    return { success: true, response: "I can help with scheduling. What date are you looking at?" }
  }

  private async handleCapacityRequest(content: string, metadata?: Record<string, unknown>): Promise<AgentOutput> {
    const today = new Date()
    const results = []

    for (let i = 1; i <= 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      const capacity = await this.checkCapacity({ date: date.toISOString().split("T")[0] })
      results.push({ date: date.toISOString().split("T")[0], ...capacity.data })
    }

    return {
      success: true,
      response: "Here's our availability for the next 7 days",
      data: { availability: results },
    }
  }

  private async handleJobStarted(data: Record<string, unknown>): Promise<AgentOutput> {
    await this.sendDayOfUpdates({ jobId: data.jobId as string, updateType: "started" })
    return { success: true, response: "Job start notification sent" }
  }

  private async handleJobCompleted(data: Record<string, unknown>): Promise<AgentOutput> {
    await this.sendDayOfUpdates({ jobId: data.jobId as string, updateType: "completed" })

    // Trigger retention sequence via PHOENIX
    await this.sendToAgent("PHOENIX_RET", "notification", {
      type: "move_completed",
      ...data,
    })

    return { success: true, response: "Job completion processed" }
  }

  private async processContingency(data: Record<string, unknown>): Promise<AgentOutput> {
    return await this.handleContingency({
      jobId: data.jobId as string,
      issue: data.issue as string,
      severity: (data.severity as string) || "moderate",
    })
  }

  // =============================================================================
  // TOOL IMPLEMENTATIONS
  // =============================================================================

  private async scheduleJob(params: ScheduleParams) {
    const slot: ScheduledJob = {
      id: params.jobId,
      date: params.date,
      startTime: params.startTime || "08:00",
      duration: params.estimatedDuration || 4,
      status: "scheduled",
      priority: params.priority || "standard",
    }

    const dateJobs = this.schedule.get(params.date) || []
    dateJobs.push(slot)
    this.schedule.set(params.date, dateJobs)

    this.log("info", "scheduleJob", `Scheduled job ${params.jobId} for ${params.date}`)

    return {
      success: true,
      data: { ...slot, confirmationNumber: `SCH-${Date.now()}` },
    }
  }

  private async optimizeRoute(params: RouteParams) {
    // In production, integrate with Google Maps/OSRM for actual routing
    return {
      success: true,
      data: {
        date: params.date,
        optimized: true,
        estimatedSavings: "45 minutes",
        route: [
          { stop: 1, location: "Richmond", eta: "08:00" },
          { stop: 2, location: "South Yarra", eta: "12:00" },
          { stop: 3, location: "Prahran", eta: "15:00" },
        ],
      },
    }
  }

  private async assignCrew(params: CrewParams) {
    const available = this.resources.crews.filter((c: any) => c.status === "available")
    const assigned = available.slice(0, params.crewSize)

    return {
      success: true,
      data: {
        jobId: params.jobId,
        crew: assigned.map((c: any) => ({ id: c.id, name: c.name, role: c.role })),
        crewSize: assigned.length,
      },
    }
  }

  private async allocateVehicles(params: VehicleParams) {
    const available = this.resources.vehicles.filter(
      (v: any) => v.status === "available" && v.type === params.vehicleType,
    )

    return {
      success: true,
      data: {
        jobId: params.jobId,
        vehicles: available.slice(0, params.quantity || 1).map((v: any) => ({
          id: v.id,
          registration: v.registration,
          type: v.type,
        })),
      },
    }
  }

  private async checkCapacity(params: CapacityParams) {
    const dateJobs = this.schedule.get(params.date) || []
    const totalBooked = dateJobs.reduce((sum, j) => sum + j.duration, 0)
    const maxCapacity = this.opsConfig.dailyCapacity
    const available = totalBooked < maxCapacity

    return {
      success: true,
      data: {
        date: params.date,
        available,
        slotsRemaining: Math.floor((maxCapacity - totalBooked) / 4),
        bookedHours: totalBooked,
        maxCapacity,
        alternatives: available ? [] : this.findAlternativeDates(params.date),
      },
    }
  }

  private async sendDayOfUpdates(params: UpdateParams) {
    const messages: Record<string, string> = {
      eta: "Our team is on the way! Expected arrival in 30 minutes.",
      started: "Your move has started! Our team is on-site and ready to go.",
      progress: "Move in progress - 50% complete. Everything going smoothly!",
      completed: "Your move is complete! Thank you for choosing M&M Commercial Moving.",
    }

    this.log("info", "sendDayOfUpdates", `Sending ${params.updateType} update for ${params.jobId}`)

    return {
      success: true,
      data: {
        jobId: params.jobId,
        updateType: params.updateType,
        message: params.customMessage || messages[params.updateType],
        sentAt: new Date(),
      },
    }
  }

  private async handleContingency(params: ContingencyParams) {
    const solutions: Record<string, string> = {
      weather: "Monitoring conditions. Will contact customer if reschedule needed.",
      traffic: "Re-routing crew. Updated ETA sent to customer.",
      crew_sick: "Backup crew assigned. No delay expected.",
      vehicle_breakdown: "Replacement vehicle dispatched. 30-minute delay.",
      customer_delay: "Adjusting schedule. Next job notified of potential delay.",
    }

    this.log("warn", "handleContingency", `Handling ${params.issue} for ${params.jobId}`)

    if (params.severity === "major") {
      await this.escalateToHuman("compliance_issue", `Major contingency: ${params.issue}`, params, "urgent")
    }

    return {
      success: true,
      data: {
        jobId: params.jobId,
        issue: params.issue,
        resolution: solutions[params.issue] || "Investigating issue",
        status: "handled",
      },
    }
  }

  private async getScheduleOverview(params: OverviewParams) {
    const dateFrom = params.dateFrom || new Date().toISOString().split("T")[0]
    const jobs: any[] = []

    this.schedule.forEach((dateJobs, date) => {
      if (date >= dateFrom && (!params.dateTo || date <= params.dateTo)) {
        jobs.push(...dateJobs.map((j) => ({ ...j, date })))
      }
    })

    return {
      success: true,
      data: {
        dateFrom,
        dateTo: params.dateTo,
        totalJobs: jobs.length,
        jobs: jobs.sort((a, b) => a.date.localeCompare(b.date)),
      },
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private estimateDuration(moveType: string, sqm: number): number {
    const baseHours: Record<string, number> = {
      office: 4,
      datacenter: 8,
      warehouse: 6,
      retail: 4,
      it: 3,
    }
    const base = baseHours[moveType] || 4
    const sqmFactor = Math.ceil(sqm / 100)
    return Math.min(base + sqmFactor, 12) // Cap at 12 hours
  }

  private calculateCrewSize(moveType: string, sqm: number): number {
    if (moveType === "datacenter") return 4
    if (sqm > 500) return 4
    if (sqm > 200) return 3
    return 2
  }

  private getRequiredSkills(moveType: string): string[] {
    if (moveType === "datacenter") return ["it_specialist", "heavy_lifting"]
    if (moveType === "it") return ["it_specialist"]
    return ["general"]
  }

  private selectVehicleType(sqm: number): string {
    if (sqm > 300) return "truck_large"
    if (sqm > 150) return "truck_medium"
    if (sqm > 50) return "truck_small"
    return "van"
  }

  private findAlternativeDates(date: string): string[] {
    const alternatives: string[] = []
    const baseDate = new Date(date)

    for (let i = 1; i <= 5; i++) {
      const altDate = new Date(baseDate)
      altDate.setDate(baseDate.getDate() + i)
      if (altDate.getDay() !== 0 && altDate.getDay() !== 6) {
        alternatives.push(altDate.toISOString().split("T")[0])
      }
    }

    return alternatives.slice(0, 3)
  }
}

// =============================================================================
// TYPES & CONFIG
// =============================================================================

const NEXUS_SYSTEM_PROMPT = `You are Nexus, an AI Operations Agent for M&M Commercial Moving.

## Your Role
- Schedule and optimize moving jobs
- Assign crews and vehicles
- Handle day-of coordination
- Manage contingencies
- Ensure operational efficiency

## Scheduling Principles
- Never double-book resources
- Allow buffer time between jobs
- Match crew skills to job requirements
- Optimize routes to minimize travel
- Weather-check for outdoor moves

## Communication
- Keep customers informed
- Proactive updates, not reactive
- Clear ETAs and status updates
- Professional, reassuring tone`

interface OperationsConfig {
  dailyCapacity: number // hours
  bufferTime: number // minutes between jobs
  maxJobsPerDay: number
  workingHours: { start: string; end: string }
}

const DEFAULT_OPS_CONFIG: OperationsConfig = {
  dailyCapacity: 24, // 3 crews x 8 hours
  bufferTime: 30,
  maxJobsPerDay: 6,
  workingHours: { start: "07:00", end: "18:00" },
}

interface ResourcePool {
  crews: any[]
  vehicles: any[]
}

const DEFAULT_RESOURCE_POOL: ResourcePool = {
  crews: [
    { id: "crew-1", name: "Alpha Team", role: "lead", skills: ["general", "it_specialist"], status: "available" },
    { id: "crew-2", name: "Mike S", role: "mover", skills: ["general", "heavy_lifting"], status: "available" },
    { id: "crew-3", name: "Sam T", role: "mover", skills: ["general"], status: "available" },
    { id: "crew-4", name: "Chris L", role: "driver", skills: ["general", "it_specialist"], status: "available" },
  ],
  vehicles: [
    { id: "v-1", registration: "ABC-123", type: "truck_large", capacity: 50, status: "available" },
    { id: "v-2", registration: "XYZ-789", type: "truck_medium", capacity: 30, status: "available" },
    { id: "v-3", registration: "DEF-456", type: "van", capacity: 10, status: "available" },
  ],
}

interface ScheduledJob {
  id: string
  date: string
  startTime: string
  duration: number
  status: string
  priority: string
  crew?: string[]
  vehicle?: string
}

interface ScheduleParams {
  jobId: string
  date: string
  startTime?: string
  estimatedDuration?: number
  priority?: string
}
interface RouteParams {
  date: string
  crewId?: string
  considerTraffic?: boolean
}
interface CrewParams {
  jobId: string
  crewSize: number
  skills?: string[]
  preferredCrew?: string[]
}
interface VehicleParams {
  jobId: string
  vehicleType: string
  quantity?: number
}
interface CapacityParams {
  date: string
  jobType?: string
  duration?: number
}
interface UpdateParams {
  jobId: string
  updateType: string
  customMessage?: string
}
interface ContingencyParams {
  jobId: string
  issue: string
  severity?: string
}
interface OverviewParams {
  dateFrom?: string
  dateTo?: string
  status?: string
}

// =============================================================================
// FACTORY
// =============================================================================

let nexusInstance: NexusAgent | null = null

export function getNexus(): NexusAgent {
  if (!nexusInstance) nexusInstance = new NexusAgent()
  return nexusInstance
}

export function resetNexus(): void {
  nexusInstance = null
}
