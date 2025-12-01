"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Activity,
  Bot,
  Brain,
  Shield,
  TrendingUp,
  Users,
  Zap,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  RefreshCw,
  Settings,
  Play,
  Pause,
  Eye,
} from "lucide-react"
import { AGENT_REGISTRY } from "@/lib/agents"

// =============================================================================
// TYPES
// =============================================================================

interface AgentStatus {
  codename: string
  name: string
  status: "active" | "idle" | "busy" | "error"
  category: string
  lastActivity: Date
  messagesHandled: number
  avgResponseTime: number
  successRate: number
}

interface DashboardMetrics {
  totalConversations: number
  activeConversations: number
  avgResponseTime: number
  successRate: number
  escalations: number
  quotesGenerated: number
  leadsQualified: number
  revenue: number
}

interface ActivityItem {
  id: string
  agent: string
  action: string
  detail: string
  timestamp: Date
  type: "success" | "info" | "warning" | "error"
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AgentDashboard() {
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(true)
  const [timeRange, setTimeRange] = useState<"1h" | "24h" | "7d" | "30d">("24h")

  // Simulated data loading
  useEffect(() => {
    loadDashboardData()
    
    if (isLive) {
      const interval = setInterval(loadDashboardData, 5000)
      return () => clearInterval(interval)
    }
  }, [isLive])

  const loadDashboardData = () => {
    // Initialize agent statuses from registry
    const agentStatuses: AgentStatus[] = Object.entries(AGENT_REGISTRY)
      .filter(([key]) => key !== "CORTEX")
      .map(([_, info]) => ({
        codename: info.codename,
        name: info.name,
        status: randomStatus(),
        category: info.category,
        lastActivity: new Date(Date.now() - Math.random() * 3600000),
        messagesHandled: Math.floor(Math.random() * 500) + 50,
        avgResponseTime: Math.random() * 2 + 0.5,
        successRate: 85 + Math.random() * 14,
      }))
    
    setAgents(agentStatuses)
    
    // Simulated metrics
    setMetrics({
      totalConversations: Math.floor(Math.random() * 200) + 800,
      activeConversations: Math.floor(Math.random() * 20) + 5,
      avgResponseTime: Math.random() * 1.5 + 0.8,
      successRate: 92 + Math.random() * 6,
      escalations: Math.floor(Math.random() * 10) + 2,
      quotesGenerated: Math.floor(Math.random() * 50) + 30,
      leadsQualified: Math.floor(Math.random() * 30) + 15,
      revenue: Math.floor(Math.random() * 50000) + 25000,
    })
    
    // Simulated activity
    setActivity(generateActivity())
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <DashboardHeader isLive={isLive} setIsLive={setIsLive} onRefresh={loadDashboardData} />
      
      {/* Key Metrics */}
      {metrics && <MetricsGrid metrics={metrics} />}
      
      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Agent Grid */}
        <div className="xl:col-span-2">
          <AgentGrid 
            agents={agents} 
            selectedAgent={selectedAgent}
            onSelectAgent={setSelectedAgent}
          />
        </div>
        
        {/* Activity Feed */}
        <div>
          <ActivityFeed activity={activity} />
        </div>
      </div>
      
      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceChart timeRange={timeRange} />
        <AgentComparisonChart agents={agents} />
      </div>
      
      {/* Agent Detail Modal */}
      <AnimatePresence>
        {selectedAgent && (
          <AgentDetailModal 
            agent={agents.find(a => a.codename === selectedAgent)!}
            onClose={() => setSelectedAgent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// =============================================================================
// HEADER
// =============================================================================

function DashboardHeader({ 
  isLive, 
  setIsLive, 
  onRefresh 
}: { 
  isLive: boolean
  setIsLive: (live: boolean) => void
  onRefresh: () => void
}) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
          AI Salesforce Command Center
        </h1>
        <p className="text-white/50 mt-1">
          Monitor and manage your autonomous AI agents
        </p>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Live Toggle */}
        <button
          onClick={() => setIsLive(!isLive)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all
            ${isLive 
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
              : "bg-white/5 text-white/60 border border-white/10"
            }
          `}
        >
          {isLive ? <Activity className="w-4 h-4 animate-pulse" /> : <Pause className="w-4 h-4" />}
          {isLive ? "Live" : "Paused"}
        </button>
        
        {/* Refresh */}
        <button
          onClick={onRefresh}
          className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
        
        {/* Settings */}
        <button className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// METRICS GRID
// =============================================================================

function MetricsGrid({ metrics }: { metrics: DashboardMetrics }) {
  const cards = [
    {
      label: "Total Conversations",
      value: metrics.totalConversations.toLocaleString(),
      icon: MessageSquare,
      color: "cyan",
      change: "+12%",
    },
    {
      label: "Active Now",
      value: metrics.activeConversations.toString(),
      icon: Users,
      color: "emerald",
      change: null,
      pulse: true,
    },
    {
      label: "Avg Response Time",
      value: `${metrics.avgResponseTime.toFixed(1)}s`,
      icon: Zap,
      color: "violet",
      change: "-0.3s",
    },
    {
      label: "Success Rate",
      value: `${metrics.successRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: "fuchsia",
      change: "+2.1%",
    },
    {
      label: "Quotes Generated",
      value: metrics.quotesGenerated.toString(),
      icon: BarChart3,
      color: "amber",
      change: "+8",
    },
    {
      label: "Leads Qualified",
      value: metrics.leadsQualified.toString(),
      icon: CheckCircle2,
      color: "blue",
      change: "+5",
    },
    {
      label: "Escalations",
      value: metrics.escalations.toString(),
      icon: AlertTriangle,
      color: "orange",
      change: "-2",
    },
    {
      label: "Revenue Influenced",
      value: `$${(metrics.revenue / 1000).toFixed(0)}K`,
      icon: TrendingUp,
      color: "green",
      change: "+$12K",
    },
  ]

  const colorMap: Record<string, string> = {
    cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-400",
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400",
    violet: "from-violet-500/20 to-violet-500/5 border-violet-500/30 text-violet-400",
    fuchsia: "from-fuchsia-500/20 to-fuchsia-500/5 border-fuchsia-500/30 text-fuchsia-400",
    amber: "from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400",
    blue: "from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400",
    orange: "from-orange-500/20 to-orange-500/5 border-orange-500/30 text-orange-400",
    green: "from-green-500/20 to-green-500/5 border-green-500/30 text-green-400",
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`
            relative p-4 rounded-2xl border bg-gradient-to-b overflow-hidden
            ${colorMap[card.color]}
          `}
        >
          {card.pulse && (
            <div className="absolute top-3 right-3">
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>
          )}
          
          <card.icon className="w-5 h-5 mb-2 opacity-60" />
          <div className="text-2xl font-bold">{card.value}</div>
          <div className="text-xs text-white/40 mt-1">{card.label}</div>
          
          {card.change && (
            <div className={`text-xs mt-2 ${card.change.startsWith("+") ? "text-emerald-400" : "text-rose-400"}`}>
              {card.change}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  )
}

// =============================================================================
// AGENT GRID
// =============================================================================

function AgentGrid({ 
  agents, 
  selectedAgent,
  onSelectAgent 
}: { 
  agents: AgentStatus[]
  selectedAgent: string | null
  onSelectAgent: (codename: string) => void
}) {
  const categoryColors: Record<string, string> = {
    sales: "border-cyan-500/30 bg-cyan-500/10",
    support: "border-emerald-500/30 bg-emerald-500/10",
    lead_gen: "border-violet-500/30 bg-violet-500/10",
    marketing: "border-fuchsia-500/30 bg-fuchsia-500/10",
    analytics: "border-amber-500/30 bg-amber-500/10",
    retention: "border-rose-500/30 bg-rose-500/10",
    reputation: "border-indigo-500/30 bg-indigo-500/10",
    operations: "border-blue-500/30 bg-blue-500/10",
    pricing: "border-orange-500/30 bg-orange-500/10",
    security: "border-red-500/30 bg-red-500/10",
    handoff: "border-teal-500/30 bg-teal-500/10",
    quality: "border-lime-500/30 bg-lime-500/10",
  }

  const statusColors: Record<string, string> = {
    active: "bg-emerald-500",
    idle: "bg-amber-500",
    busy: "bg-cyan-500",
    error: "bg-rose-500",
  }

  return (
    <div className="bg-white/[0.02] rounded-2xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5 text-cyan-400" />
          Agent Fleet
        </h2>
        <span className="text-sm text-white/40">
          {agents.filter(a => a.status === "active" || a.status === "busy").length} / {agents.length} Active
        </span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {agents.map((agent, i) => (
          <motion.button
            key={agent.codename}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => onSelectAgent(agent.codename)}
            className={`
              relative p-4 rounded-xl border text-left transition-all
              hover:scale-[1.02] hover:border-white/30
              ${categoryColors[agent.category] || "border-white/10 bg-white/5"}
              ${selectedAgent === agent.codename ? "ring-2 ring-cyan-500" : ""}
            `}
          >
            {/* Status Indicator */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${statusColors[agent.status]}`} />
              <span className="text-xs text-white/40 capitalize">{agent.status}</span>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-white/10">
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{agent.name}</div>
                <div className="text-xs text-white/40 capitalize">{agent.category.replace("_", " ")}</div>
              </div>
            </div>
            
            {/* Mini Stats */}
            <div className="grid grid-cols-2 gap-2 mt-4 text-center">
              <div className="bg-white/5 rounded-lg p-2">
                <div className="text-sm font-semibold">{agent.messagesHandled}</div>
                <div className="text-[10px] text-white/30">Messages</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <div className="text-sm font-semibold">{agent.successRate.toFixed(0)}%</div>
                <div className="text-[10px] text-white/30">Success</div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// ACTIVITY FEED
// =============================================================================

function ActivityFeed({ activity }: { activity: ActivityItem[] }) {
  const typeIcons: Record<string, any> = {
    success: CheckCircle2,
    info: MessageSquare,
    warning: AlertTriangle,
    error: AlertTriangle,
  }

  const typeColors: Record<string, string> = {
    success: "text-emerald-400 bg-emerald-500/10",
    info: "text-cyan-400 bg-cyan-500/10",
    warning: "text-amber-400 bg-amber-500/10",
    error: "text-rose-400 bg-rose-500/10",
  }

  return (
    <div className="bg-white/[0.02] rounded-2xl border border-white/10 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-violet-400" />
          Live Activity
        </h2>
      </div>
      
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
        {activity.map((item, i) => {
          const Icon = typeIcons[item.type]
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
            >
              <div className={`p-1.5 rounded-lg ${typeColors[item.type]}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{item.agent}</span>
                  <span className="text-xs text-white/30">
                    {formatTimeAgo(item.timestamp)}
                  </span>
                </div>
                <div className="text-sm text-white/60">{item.action}</div>
                <div className="text-xs text-white/40 truncate">{item.detail}</div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// =============================================================================
// CHARTS
// =============================================================================

function PerformanceChart({ timeRange }: { timeRange: string }) {
  // Simulated chart data
  const data = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    conversations: Math.floor(Math.random() * 50) + 20,
    success: Math.floor(Math.random() * 45) + 18,
  }))

  return (
    <div className="bg-white/[0.02] rounded-2xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-amber-400" />
          Performance Over Time
        </h2>
        <div className="flex gap-2">
          {["1h", "24h", "7d", "30d"].map((range) => (
            <button
              key={range}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors
                ${timeRange === range 
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" 
                  : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
                }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      
      {/* Simple bar chart visualization */}
      <div className="h-48 flex items-end gap-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div 
              className="w-full bg-gradient-to-t from-cyan-500/50 to-cyan-400/30 rounded-t"
              style={{ height: `${(d.conversations / 70) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-xs text-white/30">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>Now</span>
      </div>
    </div>
  )
}

function AgentComparisonChart({ agents }: { agents: AgentStatus[] }) {
  const sortedAgents = [...agents].sort((a, b) => b.messagesHandled - a.messagesHandled).slice(0, 6)
  const maxMessages = Math.max(...sortedAgents.map(a => a.messagesHandled))

  return (
    <div className="bg-white/[0.02] rounded-2xl border border-white/10 p-6">
      <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-fuchsia-400" />
        Agent Performance
      </h2>
      
      <div className="space-y-4">
        {sortedAgents.map((agent) => (
          <div key={agent.codename} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{agent.name}</span>
              <span className="text-white/40">{agent.messagesHandled} msgs</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(agent.messagesHandled / maxMessages) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// AGENT DETAIL MODAL
// =============================================================================

function AgentDetailModal({ 
  agent, 
  onClose 
}: { 
  agent: AgentStatus
  onClose: () => void 
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0f0f18] rounded-2xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/10">
                <Bot className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{agent.name}</h2>
                <p className="text-white/50">{agent.codename}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center gap-4">
            <span className={`
              px-3 py-1 rounded-full text-sm font-medium
              ${agent.status === "active" ? "bg-emerald-500/20 text-emerald-400" : ""}
              ${agent.status === "idle" ? "bg-amber-500/20 text-amber-400" : ""}
              ${agent.status === "busy" ? "bg-cyan-500/20 text-cyan-400" : ""}
              ${agent.status === "error" ? "bg-rose-500/20 text-rose-400" : ""}
            `}>
              {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
            </span>
            <span className="text-white/40">
              Category: {agent.category.replace("_", " ")}
            </span>
          </div>
          
          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-3xl font-bold text-cyan-400">{agent.messagesHandled}</div>
              <div className="text-sm text-white/40">Messages Handled</div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-3xl font-bold text-violet-400">{agent.avgResponseTime.toFixed(1)}s</div>
              <div className="text-sm text-white/40">Avg Response Time</div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-3xl font-bold text-emerald-400">{agent.successRate.toFixed(1)}%</div>
              <div className="text-sm text-white/40">Success Rate</div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3">
            <button className="flex-1 py-3 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-medium hover:bg-cyan-500/30 transition-colors flex items-center justify-center gap-2">
              <Eye className="w-4 h-4" />
              View Logs
            </button>
            <button className="flex-1 py-3 rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30 font-medium hover:bg-violet-500/30 transition-colors flex items-center justify-center gap-2">
              <Settings className="w-4 h-4" />
              Configure
            </button>
            <button className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 border border-white/10 font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
              {agent.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {agent.status === "active" ? "Pause" : "Resume"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// =============================================================================
// HELPERS
// =============================================================================

function randomStatus(): "active" | "idle" | "busy" | "error" {
  const statuses: Array<"active" | "idle" | "busy" | "error"> = ["active", "active", "active", "idle", "busy"]
  return statuses[Math.floor(Math.random() * statuses.length)]
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

function generateActivity(): ActivityItem[] {
  const actions = [
    { agent: "Maya", action: "Quote generated", detail: "Office move - 200sqm", type: "success" as const },
    { agent: "Hunter", action: "Lead qualified", detail: "Tech startup expansion", type: "info" as const },
    { agent: "Sentinel", action: "Support ticket resolved", detail: "Booking confirmation", type: "success" as const },
    { agent: "Aurora", action: "Campaign launched", detail: "Q1 email sequence", type: "info" as const },
    { agent: "Phoenix", action: "Review request sent", detail: "NPS score: 9", type: "success" as const },
    { agent: "Echo", action: "New review detected", detail: "Google - 5 stars", type: "success" as const },
    { agent: "Nexus", action: "Job scheduled", detail: "Tomorrow 8am - Richmond", type: "info" as const },
    { agent: "Oracle", action: "Report generated", detail: "Weekly performance", type: "info" as const },
    { agent: "Bridge", action: "Escalation created", detail: "Complex pricing query", type: "warning" as const },
    { agent: "Guardian", action: "QA audit completed", detail: "Score: 94/100", type: "success" as const },
  ]
  
  return actions.map((a, i) => ({
    ...a,
    id: `activity-${Date.now()}-${i}`,
    timestamp: new Date(Date.now() - i * 180000),
  }))
}
