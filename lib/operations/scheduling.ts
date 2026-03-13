/**
 * Crew Scheduling System (Nexus Agent)
 * Job creation, crew assignment, vehicle allocation
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"

let supabaseClient: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    supabaseClient = createClient(url, key, { auth: { persistSession: false } })
  }
  return supabaseClient
}

export interface ScheduleJobParams {
  leadId: string
  crewId?: string
  vehicleIds?: string[]
  scheduledDate: string
  startTime?: string
  estimatedHours?: number
  originAddress: string
  destinationAddress: string
  notes?: string
}

export async function scheduleJob(params: ScheduleJobParams): Promise<{ id: string }> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      lead_id: params.leadId,
      crew_id: params.crewId || null,
      vehicle_ids: params.vehicleIds || [],
      scheduled_date: params.scheduledDate,
      start_time: params.startTime || null,
      estimated_duration_hours: params.estimatedHours || null,
      origin_address: params.originAddress,
      destination_address: params.destinationAddress,
      status: "scheduled",
      notes: params.notes || null,
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(`Failed to schedule job: ${error.message}`)
  }

  return { id: data.id }
}

export async function assignCrew(jobId: string, crewId: string): Promise<void> {
  const supabase = getSupabase()

  const { error } = await supabase
    .from("jobs")
    .update({
      crew_id: crewId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)

  if (error) {
    throw new Error(`Failed to assign crew: ${error.message}`)
  }
}

export async function getJobsByDate(date: string): Promise<any[]> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("jobs")
    .select("*, crews(*)")
    .eq("scheduled_date", date)
    .order("start_time", { ascending: true })

  if (error) {
    throw new Error(`Failed to get jobs: ${error.message}`)
  }

  return data || []
}

export async function updateJobStatus(
  jobId: string,
  status: "scheduled" | "in_progress" | "completed" | "cancelled"
): Promise<void> {
  const supabase = getSupabase()

  const { error } = await supabase
    .from("jobs")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", jobId)

  if (error) {
    throw new Error(`Failed to update job status: ${error.message}`)
  }
}
