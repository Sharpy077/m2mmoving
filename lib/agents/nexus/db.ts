/**
 * Nexus Agent Database Layer
 * Real database queries for scheduling, routing, and operations
 */

import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// =============================================================================
// SCHEDULING
// =============================================================================

export async function scheduleJob(params: {
  leadId: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  jobType: string
  originAddress: string
  originSuburb?: string
  destinationAddress: string
  destinationSuburb?: string
  estimatedSqm?: number
  specialRequirements?: string[]
  scheduledDate: string
  startTime?: string
  estimatedDuration?: number
  priority?: string
}) {
  const { data, error } = await supabase
    .from("scheduled_jobs")
    .insert({
      lead_id: params.leadId,
      customer_name: params.customerName,
      customer_phone: params.customerPhone,
      customer_email: params.customerEmail,
      job_type: params.jobType,
      origin_address: params.originAddress,
      origin_suburb: params.originSuburb,
      destination_address: params.destinationAddress,
      destination_suburb: params.destinationSuburb,
      estimated_sqm: params.estimatedSqm,
      special_requirements: params.specialRequirements || [],
      scheduled_date: params.scheduledDate,
      start_time: params.startTime || "08:00",
      estimated_duration_hours: params.estimatedDuration || 4,
      priority: params.priority || "standard",
      status: "scheduled",
    })
    .select()
    .single()

  if (error) throw error

  // Update capacity slot
  await updateCapacitySlot(params.scheduledDate, params.estimatedDuration || 4)

  return {
    ...data,
    confirmationNumber: `SCH-${Date.now().toString(36).toUpperCase()}`,
  }
}

export async function getScheduledJobs(params: {
  dateFrom?: string
  dateTo?: string
  status?: string
  crewId?: string
}) {
  let query = supabase
    .from("scheduled_jobs")
    .select(`
      *,
      crews:assigned_crew_id (id, name, members),
      vehicles:assigned_vehicle_id (id, name, registration)
    `)
    .order("scheduled_date", { ascending: true })
    .order("start_time", { ascending: true })

  if (params.dateFrom) {
    query = query.gte("scheduled_date", params.dateFrom)
  }
  if (params.dateTo) {
    query = query.lte("scheduled_date", params.dateTo)
  }
  if (params.status) {
    query = query.eq("status", params.status)
  }
  if (params.crewId) {
    query = query.eq("assigned_crew_id", params.crewId)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function updateJobStatus(jobId: string, status: string, timestamps?: Record<string, Date>) {
  const updateData: any = { status, updated_at: new Date().toISOString() }

  if (timestamps) {
    Object.entries(timestamps).forEach(([key, value]) => {
      updateData[key] = value.toISOString()
    })
  }

  const { data, error } = await supabase.from("scheduled_jobs").update(updateData).eq("id", jobId).select().single()

  if (error) throw error
  return data
}

// =============================================================================
// CREW MANAGEMENT
// =============================================================================

export async function getAvailableCrews(date: string, requiredSkills?: string[]) {
  const query = supabase.from("crews").select("*").eq("status", "available")

  const { data, error } = await query
  if (error) throw error

  // Filter by skills if required
  if (requiredSkills && requiredSkills.length > 0) {
    return (
      data?.filter((crew) => {
        const crewSkills = crew.skills || []
        return requiredSkills.every((skill) => crewSkills.includes(skill))
      }) || []
    )
  }

  return data || []
}

export async function assignCrewToJob(jobId: string, crewId: string) {
  // Update the job
  const { data: job, error: jobError } = await supabase
    .from("scheduled_jobs")
    .update({ assigned_crew_id: crewId })
    .eq("id", jobId)
    .select()
    .single()

  if (jobError) throw jobError

  // Update crew status
  await supabase.from("crews").update({ current_job_id: jobId, status: "assigned" }).eq("id", crewId)

  return job
}

export async function releaseCrewFromJob(crewId: string) {
  const { data, error } = await supabase
    .from("crews")
    .update({ current_job_id: null, status: "available" })
    .eq("id", crewId)
    .select()
    .single()

  if (error) throw error
  return data
}

// =============================================================================
// VEHICLE ALLOCATION
// =============================================================================

export async function getAvailableVehicles(date: string, vehicleType?: string) {
  let query = supabase.from("vehicles").select("*").eq("status", "available")

  if (vehicleType) {
    query = query.eq("vehicle_type", vehicleType)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function assignVehicleToJob(jobId: string, vehicleId: string) {
  const { data, error } = await supabase
    .from("scheduled_jobs")
    .update({ assigned_vehicle_id: vehicleId })
    .eq("id", jobId)
    .select()
    .single()

  if (error) throw error

  // Update vehicle status
  await supabase.from("vehicles").update({ status: "assigned" }).eq("id", vehicleId)

  return data
}

// =============================================================================
// CAPACITY MANAGEMENT
// =============================================================================

export async function checkCapacity(date: string) {
  const { data, error } = await supabase.from("capacity_slots").select("*").eq("slot_date", date).single()

  if (error && error.code !== "PGRST116") throw error

  if (!data) {
    // Create default capacity slot
    const { data: newSlot } = await supabase
      .from("capacity_slots")
      .insert({
        slot_date: date,
        total_crew_hours: 40,
        booked_crew_hours: 0,
        trucks_available: 5,
        trucks_booked: 0,
        vans_available: 3,
        vans_booked: 0,
        jobs_count: 0,
      })
      .select()
      .single()

    return {
      date,
      available: true,
      slotsRemaining: 10,
      bookedHours: 0,
      maxCapacity: 40,
      trucksAvailable: 5,
      vansAvailable: 3,
    }
  }

  return {
    date,
    available: !data.is_blocked && data.available_crew_hours > 4,
    slotsRemaining: Math.floor(data.available_crew_hours / 4),
    bookedHours: data.booked_crew_hours,
    maxCapacity: data.total_crew_hours,
    trucksAvailable: data.trucks_available - data.trucks_booked,
    vansAvailable: data.vans_available - data.vans_booked,
    isBlocked: data.is_blocked,
    blockReason: data.block_reason,
  }
}

export async function updateCapacitySlot(date: string, hoursBooked: number) {
  // First check if slot exists
  const { data: existing } = await supabase.from("capacity_slots").select("*").eq("slot_date", date).single()

  if (!existing) {
    // Create new slot
    await supabase.from("capacity_slots").insert({
      slot_date: date,
      booked_crew_hours: hoursBooked,
      jobs_count: 1,
    })
  } else {
    // Update existing slot
    await supabase
      .from("capacity_slots")
      .update({
        booked_crew_hours: existing.booked_crew_hours + hoursBooked,
        jobs_count: existing.jobs_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("slot_date", date)
  }
}

export async function getCapacityOverview(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("capacity_slots")
    .select("*")
    .gte("slot_date", startDate)
    .lte("slot_date", endDate)
    .order("slot_date", { ascending: true })

  if (error) throw error
  return data || []
}

// =============================================================================
// ROUTE OPTIMIZATION
// =============================================================================

export async function saveRouteOptimization(params: {
  date: string
  crewId?: string
  stops: any[]
  totalDistanceKm?: number
  totalDurationMinutes?: number
  distanceSavedKm?: number
  timeSavedMinutes?: number
}) {
  const { data, error } = await supabase
    .from("route_optimizations")
    .insert({
      optimization_date: params.date,
      crew_id: params.crewId,
      stops: params.stops,
      total_distance_km: params.totalDistanceKm,
      total_duration_minutes: params.totalDurationMinutes,
      distance_saved_km: params.distanceSavedKm,
      time_saved_minutes: params.timeSavedMinutes,
      traffic_data_used: false,
      optimization_algorithm: "greedy",
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// =============================================================================
// CUSTOMER UPDATES
// =============================================================================

export async function sendCustomerUpdate(params: {
  jobId: string
  updateType: string
  channel: string
  message: string
  etaTime?: Date
  etaWindowMinutes?: number
}) {
  const { data, error } = await supabase
    .from("customer_updates")
    .insert({
      job_id: params.jobId,
      update_type: params.updateType,
      channel: params.channel,
      message: params.message,
      eta_time: params.etaTime?.toISOString(),
      eta_window_minutes: params.etaWindowMinutes,
      sent_at: new Date().toISOString(),
      delivery_status: "sent",
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getJobUpdates(jobId: string) {
  const { data, error } = await supabase
    .from("customer_updates")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true })

  if (error) throw error
  return data || []
}

// =============================================================================
// CONTINGENCY HANDLING
// =============================================================================

export async function recordContingency(params: {
  jobId: string
  eventType: string
  severity: string
  description?: string
  delayMinutes?: number
  jobsAffected?: string[]
}) {
  const { data, error } = await supabase
    .from("contingency_events")
    .insert({
      job_id: params.jobId,
      event_type: params.eventType,
      severity: params.severity,
      description: params.description,
      delay_minutes: params.delayMinutes,
      jobs_affected: params.jobsAffected || [],
      status: "active",
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function resolveContingency(contingencyId: string, resolution: string, resolvedBy: string) {
  const { data, error } = await supabase
    .from("contingency_events")
    .update({
      status: "resolved",
      resolution_action: resolution,
      resolved_at: new Date().toISOString(),
      resolved_by: resolvedBy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contingencyId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getActiveContingencies() {
  const { data, error } = await supabase
    .from("contingency_events")
    .select(`
      *,
      scheduled_jobs:job_id (customer_name, scheduled_date, origin_suburb, destination_suburb)
    `)
    .eq("status", "active")
    .order("severity", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

// =============================================================================
// DAILY OPERATIONS
// =============================================================================

export async function getDailyBriefing(date: string) {
  const jobs = await getScheduledJobs({ dateFrom: date, dateTo: date })
  const capacity = await checkCapacity(date)
  const contingencies = await getActiveContingencies()

  // Get available crews
  const { data: crews } = await supabase.from("crews").select("*").eq("status", "available")

  // Get available vehicles
  const { data: vehicles } = await supabase.from("vehicles").select("*").eq("status", "available")

  return {
    date,
    jobs: {
      total: jobs.length,
      scheduled: jobs.filter((j) => j.status === "scheduled").length,
      inProgress: jobs.filter((j) => j.status === "in_progress").length,
      completed: jobs.filter((j) => j.status === "completed").length,
      list: jobs,
    },
    resources: {
      crewsAvailable: crews?.length || 0,
      vehiclesAvailable: vehicles?.length || 0,
      capacity,
    },
    contingencies: contingencies.filter((c) => new Date(c.created_at).toISOString().split("T")[0] === date),
  }
}
