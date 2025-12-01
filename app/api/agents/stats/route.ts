/**
 * Agent Statistics API
 * Returns performance metrics and stats for the AI Salesforce dashboard
 */

import { NextResponse } from "next/server"
import { getCortex, AGENT_REGISTRY } from "@/lib/agents"

export const runtime = "edge"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get("agent")
    const period = searchParams.get("period") || "24h"
    
    const cortex = getCortex()
    const status = cortex.getStatus()
    
    // Get all agent identities
    const agents = cortex.getAgentIdentities().map(identity => {
      const registryInfo = Object.values(AGENT_REGISTRY).find(
        r => r.codename === identity.codename
      )
      
      return {
        ...identity,
        category: registryInfo?.category || "unknown",
        // Simulated metrics for now - in production these come from database
        metrics: generateSimulatedMetrics(identity.codename),
      }
    })
    
    // If specific agent requested
    if (agentId) {
      const agent = agents.find(a => a.codename === agentId.toUpperCase())
      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 })
      }
      return NextResponse.json({ agent })
    }
    
    // Aggregate metrics
    const aggregatedMetrics = {
      totalConversations: agents.reduce((sum, a) => sum + a.metrics.conversations, 0),
      activeConversations: Math.floor(Math.random() * 20) + 5,
      avgResponseTime: Math.round(
        agents.reduce((sum, a) => sum + a.metrics.avgResponseTimeMs, 0) / agents.length
      ),
      successRate: Math.round(
        agents.reduce((sum, a) => sum + a.metrics.successRate, 0) / agents.length * 10
      ) / 10,
      escalations: Math.floor(Math.random() * 10) + 2,
      quotesGenerated: Math.floor(Math.random() * 50) + 30,
      leadsQualified: Math.floor(Math.random() * 30) + 15,
      revenue: Math.floor(Math.random() * 50000) + 25000,
    }
    
    return NextResponse.json({
      status,
      period,
      agents,
      metrics: aggregatedMetrics,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching agent stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch agent statistics" },
      { status: 500 }
    )
  }
}

// Simulated metrics generator - replace with real database queries in production
function generateSimulatedMetrics(codename: string) {
  // Different agents have different typical workloads
  const baseMultipliers: Record<string, number> = {
    MAYA_SALES: 1.5,
    SENTINEL_CS: 1.3,
    HUNTER_LG: 1.0,
    AURORA_MKT: 0.8,
    ORACLE_BI: 0.6,
    PHOENIX_RET: 0.7,
    ECHO_REP: 0.5,
    NEXUS_OPS: 0.9,
    PRISM_PRICE: 0.7,
    CIPHER_SEC: 0.4,
    BRIDGE_HH: 0.3,
    GUARDIAN_QA: 0.8,
  }
  
  const multiplier = baseMultipliers[codename] || 1.0
  
  return {
    conversations: Math.floor((Math.random() * 200 + 100) * multiplier),
    messagesHandled: Math.floor((Math.random() * 500 + 200) * multiplier),
    avgResponseTimeMs: Math.floor(Math.random() * 1500 + 500),
    successRate: Math.round((85 + Math.random() * 14) * 10) / 10,
    escalationRate: Math.round((Math.random() * 5) * 10) / 10,
    avgSentiment: Math.round((Math.random() * 0.6 + 0.2) * 100) / 100,
    lastActive: new Date(Date.now() - Math.random() * 3600000).toISOString(),
  }
}

