/**
 * Business Intelligence (Oracle Agent)
 * Dashboard metrics, pipeline analysis, insights generation
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

export interface DashboardMetrics {
  totalLeads: number
  conversionRate: number
  avgDealSize: number
  revenueThisMonth: number
  activeConversations: number
  pendingQuotes: number
  wonDeals: number
  lostDeals: number
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = getSupabase()

  // Get lead counts by status
  const { data: leads } = await supabase
    .from("leads")
    .select("status, estimated_total, deal_stage")

  const allLeads = leads || []
  const wonLeads = allLeads.filter((l: any) => l.status === "won" || l.deal_stage === "won")
  const lostLeads = allLeads.filter((l: any) => l.status === "lost" || l.deal_stage === "lost")
  const quotedLeads = allLeads.filter((l: any) => l.status === "quoted" || l.deal_stage === "quoted")

  const totalRevenue = wonLeads.reduce((sum: number, l: any) => sum + (l.estimated_total || 0), 0)
  const avgDeal = wonLeads.length > 0 ? totalRevenue / wonLeads.length : 0
  const conversionRate = allLeads.length > 0 ? wonLeads.length / allLeads.length : 0

  return {
    totalLeads: allLeads.length,
    conversionRate: Math.round(conversionRate * 100) / 100,
    avgDealSize: Math.round(avgDeal),
    revenueThisMonth: Math.round(totalRevenue),
    activeConversations: 0,
    pendingQuotes: quotedLeads.length,
    wonDeals: wonLeads.length,
    lostDeals: lostLeads.length,
  }
}

export interface InsightParams {
  type: "trend" | "anomaly" | "recommendation" | "forecast" | "win_loss_analysis"
  title: string
  summary: string
  data?: Record<string, unknown>
  severity?: "info" | "warning" | "critical" | "positive"
}

export async function generateInsight(params: InsightParams): Promise<{ id: string }> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("agent_insights")
    .insert({
      agent_codename: "ORACLE_ANL",
      insight_type: params.type,
      title: params.title,
      summary: params.summary,
      data: params.data || {},
      severity: params.severity || "info",
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(`Failed to create insight: ${error.message}`)
  }

  return { id: data.id }
}

export async function getRecentInsights(limit: number = 10): Promise<any[]> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("agent_insights")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to get insights: ${error.message}`)
  }

  return data || []
}
