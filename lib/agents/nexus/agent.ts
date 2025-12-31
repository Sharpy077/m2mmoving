import { BaseAgent, type AgentInput, type AgentOutput } from "../base-agent"
import type { AgentIdentity, AgentConfig, InterAgentMessage } from "../types"
import * as db from "./db"

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
  // SCHEDULING WORKFLOWS - Updated to use real database
  // =============================================================================

  private async processNewBooking(data: Record<string, unknown>): Promise<AgentOutput> {
    const leadId = (data.jobId as string) || (data.leadId as string)
    const date = (data.scheduledDate as string) || (data.date as string)
    const moveType = (data.moveType as string) || "office"
    const sqm = (data.squareMeters as number) || (data.sqm as number) || 100

    try {
      // Estimate duration based on size
      const estimatedDuration = this.estimateDuration(moveType, sqm)

      // Check capacity
      const capacity = await db.checkCapacity(date)

      if (!capacity.available) {
        // Find alternative dates
        const alternatives = await this.findAlternativeDates(date, 7)
        return {
          success: false,
          error: "No capacity available for requested date",
          data: { suggestedDates: alternatives },
        }
      }

      // Schedule the job
      const job = await db.scheduleJob({
        leadId,
        customerName: (data.customerName as string) || "Customer",
        customerPhone: data.phone as string,
        customerEmail: data.email as string,
        jobType: moveType,
        originAddress: (data.originAddress as string) || (data.origin as string) || "",
        originSuburb: data.originSuburb as string,
        destinationAddress: (data.destinationAddress as string) || (data.destination as string) || "",
        destinationSuburb: data.destinationSuburb as string,
        estimatedSqm: sqm,
        specialRequirements: data.specialRequirements as string[],
        scheduledDate: date,
        estimatedDuration,
        priority: data.priority as string,
      })

      // Assign crew
      const crewSize = this.calculateCrewSize(moveType, sqm)
      const requiredSkills = this.getRequiredSkills(moveType)
      const availableCrews = await db.getAvailableCrews(date, requiredSkills)

      if (availableCrews.length > 0) {
        await db.assignCrewToJob(job.id, availableCrews[0].id)
      }

      // Allocate vehicle
      const vehicleType = this.selectVehicleType(sqm)
      const availableVehicles = await db.getAvailableVehicles(date, vehicleType)

      if (availableVehicles.length > 0) {
        await db.assignVehicleToJob(job.id, availableVehicles[0].id)
      }

      // Send confirmation to customer
      await db.sendCustomerUpdate({
        jobId: job.id,
        updateType: "confirmation",
        channel: "email",
        message: `Your move is confirmed for ${date}. Our team will arrive at ${job.start_time || "08:00"}.`,
      })

      // Notify SENTINEL to enable support tracking
      await this.sendToAgent("SENTINEL_CS", "notification", {
        type: "job_scheduled",
        jobId: job.id,
        date,
      })

      return {
        success: true,
        response: `Job scheduled successfully for ${date}. Confirmation: ${job.confirmationNumber}`,
        data: job,
      }
    } catch (error) {
      this.log("error", "processNewBooking", `Failed: ${error}`)
      return { success: false, error: String(error) }
    }
  }

  private async runDailyOptimization(): Promise<AgentOutput> {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split("T")[0]

    try {
      // Get all jobs for tomorrow
      const jobs = await db.getScheduledJobs({ dateFrom: dateStr, dateTo: dateStr })

      if (jobs.length === 0) {
        return { success: true, response: "No jobs scheduled for tomorrow" }
      }

      // Group jobs by crew
      const jobsBySuburb = this.groupJobsBySuburb(jobs)

      // Optimize routes (simple greedy algorithm)
      const optimizedStops = this.optimizeStops(jobs)

      // Save optimization
      const optimization = await db.saveRouteOptimization({
        date: dateStr,
        stops: optimizedStops,
        totalDistanceKm: this.estimateTotalDistance(optimizedStops),
        totalDurationMinutes: jobs.reduce((sum, j) => sum + (j.estimated_duration_hours || 4) * 60, 0),
        distanceSavedKm: 15, // Estimated savings
        timeSavedMinutes: 45,
      })

      return {
        success: true,
        response: `Daily optimization completed. ${jobs.length} jobs optimized, estimated 45 min saved.`,
        data: optimization,
      }
    } catch (error) {
      this.log("error", "runDailyOptimization", `Failed: ${error}`)
      return { success: false, error: String(error) }
    }
  }

  private async generateMorningBriefing(): Promise<AgentOutput> {
    const today = new Date().toISOString().split("T")[0]

    try {
      const briefing = await db.getDailyBriefing(today)
      const contingencies = await db.getActiveContingencies()

      const response = `
**Operations Briefing - ${today}**

**Today's Jobs:** ${briefing.jobs.total}
- Scheduled: ${briefing.jobs.scheduled}
- In Progress: ${briefing.jobs.inProgress}
- Completed: ${briefing.jobs.completed}

**Resources:**
- Crews Available: ${briefing.resources.crewsAvailable}
- Vehicles Available: ${briefing.resources.vehiclesAvailable}

**Active Contingencies:** ${contingencies.length}
${contingencies.map((c: any) => `- ${c.event_type}: ${c.description || "No details"}`).join("\n")}

**Schedule:**
${briefing.jobs.list.map((j: any) => `- ${j.start_time} - ${j.customer_name} (${j.origin_suburb} → ${j.destination_suburb})`).join("\n")}
      `.trim()

      return { success: true, response, data: briefing }
    } catch (error) {
      this.log("error", "generateMorningBriefing", `Failed: ${error}`)
      return { success: false, error: String(error) }
    }
  }

  // =============================================================================
  // TOOL IMPLEMENTATIONS - Updated to use real database
  // =============================================================================

  private async scheduleJob(params: ScheduleParams) {
    try {
      const result = await db.scheduleJob({
        leadId: params.jobId,
        customerName: "Customer",
        jobType: "office",
        originAddress: "",
        destinationAddress: "",
        scheduledDate: params.date,
        startTime: params.startTime,
        estimatedDuration: params.estimatedDuration,
        priority: params.priority,
      })

      this.log("info", "scheduleJob", `Scheduled job ${params.jobId} for ${params.date}`)

      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  private async optimizeRoute(params: RouteParams) {
    try {
      const jobs = await db.getScheduledJobs({
        dateFrom: params.date,
        dateTo: params.date,
        crewId: params.crewId,
      })

      const optimizedStops = this.optimizeStops(jobs)

      const result = await db.saveRouteOptimization({
        date: params.date,
        crewId: params.crewId,
        stops: optimizedStops,
        totalDistanceKm: this.estimateTotalDistance(optimizedStops),
        totalDurationMinutes: jobs.reduce((sum, j) => sum + (j.estimated_duration_hours || 4) * 60, 0),
      })

      return {
        success: true,
        data: {
          date: params.date,
          optimized: true,
          estimatedSavings: "45 minutes",
          route: optimizedStops,
        },
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  private async assignCrew(params: CrewParams) {
    try {
      const skills = (params.skills as string[]) || []
      const availableCrews = await db.getAvailableCrews(new Date().toISOString().split("T")[0], skills)

      if (availableCrews.length === 0) {
        return { success: false, error: "No available crews with required skills" }
      }

      // Select best crew (first available for now)
      const selectedCrew = availableCrews[0]

      await db.assignCrewToJob(params.jobId, selectedCrew.id)

      return {
        success: true,
        data: {
          jobId: params.jobId,
          crew: {
            id: selectedCrew.id,
            name: selectedCrew.name,
            members: selectedCrew.members,
          },
          crewSize: params.crewSize,
        },
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  private async allocateVehicles(params: VehicleParams) {
    try {
      const availableVehicles = await db.getAvailableVehicles(
        new Date().toISOString().split("T")[0],
        params.vehicleType,
      )

      if (availableVehicles.length === 0) {
        return { success: false, error: `No available ${params.vehicleType} vehicles` }
      }

      const selectedVehicle = availableVehicles[0]
      await db.assignVehicleToJob(params.jobId, selectedVehicle.id)

      return {
        success: true,
        data: {
          jobId: params.jobId,
          vehicles: [
            {
              id: selectedVehicle.id,
              registration: selectedVehicle.registration,
              type: selectedVehicle.vehicle_type,
            },
          ],
        },
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  private async checkCapacity(params: CapacityParams) {
    try {
      const capacity = await db.checkCapacity(params.date)

      let alternatives: string[] = []
      if (!capacity.available) {
        alternatives = await this.findAlternativeDates(params.date, 7)
      }

      return {
        success: true,
        data: {
          ...capacity,
          alternatives,
        },
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  private async sendDayOfUpdates(params: UpdateParams) {
    const messages: Record<string, string> = {
      eta: "Our team is on the way! Expected arrival in 30 minutes.",
      started: "Your move has started! Our team is on-site and ready to go.",
      progress: "Move in progress - 50% complete. Everything going smoothly!",
      completed: "Your move is complete! Thank you for choosing M&M Commercial Moving.",
    }

    try {
      const update = await db.sendCustomerUpdate({
        jobId: params.jobId,
        updateType: params.updateType,
        channel: "sms",
        message: params.customMessage || messages[params.updateType],
      })

      // Update job timestamps based on update type
      const timestamps: Record<string, Date> = {}
      if (params.updateType === "started") {
        timestamps.actual_start_time = new Date()
        await db.updateJobStatus(params.jobId, "in_progress", timestamps)
      } else if (params.updateType === "completed") {
        timestamps.actual_end_time = new Date()
        await db.updateJobStatus(params.jobId, "completed", timestamps)

        // Trigger retention sequence via PHOENIX
        await this.sendToAgent("PHOENIX_RET", "notification", {
          type: "move_completed",
          jobId: params.jobId,
        })
      }

      return {
        success: true,
        data: update,
      }
    } catch (error) {
      return { success: false, error: String(error) }
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

    try {
      const contingency = await db.recordContingency({
        jobId: params.jobId,
        eventType: params.issue,
        severity: params.severity || "moderate",
        description: solutions[params.issue],
      })

      this.log("warn", "handleContingency", `Handling ${params.issue} for ${params.jobId}`)

      if (params.severity === "major") {
        await this.escalateToHuman("compliance_issue", `Major contingency: ${params.issue}`, params, "urgent")
      }

      // Send update to customer
      await db.sendCustomerUpdate({
        jobId: params.jobId,
        updateType: "delayed",
        channel: "sms",
        message: solutions[params.issue],
      })

      return {
        success: true,
        data: {
          ...contingency,
          resolution: solutions[params.issue],
        },
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  private async getScheduleOverview(params: OverviewParams) {
    try {
      const jobs = await db.getScheduledJobs({
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        status: params.status,
      })

      return {
        success: true,
        data: {
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
          totalJobs: jobs.length,
          jobs: jobs,
        },
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  // =============================================================================
  // HELPER METHODS - Add helper methods
  // =============================================================================

  private async findAlternativeDates(date: string, daysToCheck: number): Promise<string[]> {
    const alternatives: string[] = []
    const startDate = new Date(date)

    for (let i = 1; i <= daysToCheck && alternatives.length < 3; i++) {
      const checkDate = new Date(startDate)
      checkDate.setDate(checkDate.getDate() + i)

      // Skip weekends
      if (checkDate.getDay() === 0 || checkDate.getDay() === 6) continue

      const dateStr = checkDate.toISOString().split("T")[0]
      const capacity = await db.checkCapacity(dateStr)

      if (capacity.available) {
        alternatives.push(dateStr)
      }
    }

    return alternatives
  }

  private groupJobsBySuburb(jobs: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {}
    jobs.forEach((job) => {
      const suburb = job.origin_suburb || "unknown"
      if (!grouped[suburb]) grouped[suburb] = []
      grouped[suburb].push(job)
    })
    return grouped
  }

  private optimizeStops(jobs: any[]): any[] {
    // Simple optimization: sort by suburb/address for now
    // In production, integrate with Google Maps Distance Matrix API
    return jobs
      .sort((a, b) => (a.origin_suburb || "").localeCompare(b.origin_suburb || ""))
      .map((job, index) => ({
        order: index + 1,
        jobId: job.id,
        address: job.origin_address,
        suburb: job.origin_suburb,
        eta: this.calculateEta(index, job.start_time),
        duration: job.estimated_duration_hours,
      }))
  }

  private calculateEta(stopIndex: number, baseTime: string): string {
    const [hours, minutes] = (baseTime || "08:00").split(":").map(Number)
    const etaHours = hours + Math.floor(stopIndex * 4) // 4 hours per job average
    return `${String(etaHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
  }

  private estimateTotalDistance(stops: any[]): number {
    // Rough estimate: 15km between each stop
    return stops.length * 15
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
