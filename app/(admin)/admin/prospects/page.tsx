import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Target,
  Building2,
  Mail,
  Phone,
  Linkedin,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react"

async function getProspectStats() {
  const supabase = await createClient()

  const { count: total } = await supabase.from("prospects").select("*", { count: "exact", head: true })

  const { count: qualified } = await supabase
    .from("prospects")
    .select("*", { count: "exact", head: true })
    .eq("qualified", true)

  const { count: contacted } = await supabase
    .from("prospects")
    .select("*", { count: "exact", head: true })
    .eq("status", "contacted")

  const { count: converted } = await supabase
    .from("prospects")
    .select("*", { count: "exact", head: true })
    .eq("status", "converted")

  const { data: scores } = await supabase.from("prospects").select("score").gt("score", 0)

  const avgScore = scores?.length ? Math.round(scores.reduce((sum, p) => sum + p.score, 0) / scores.length) : 0

  return {
    total: total || 0,
    qualified: qualified || 0,
    contacted: contacted || 0,
    converted: converted || 0,
    avgScore,
  }
}

async function getProspects() {
  const supabase = await createClient()

  const { data, error } = await supabase.from("prospects").select("*").order("score", { ascending: false }).limit(50)

  if (error) {
    console.error("Error fetching prospects:", error)
    return []
  }

  return data || []
}

function getStatusBadge(status: string) {
  const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> =
    {
      new: { variant: "outline", label: "New" },
      enriched: { variant: "secondary", label: "Enriched" },
      qualified: { variant: "default", label: "Qualified" },
      contacted: { variant: "secondary", label: "Contacted" },
      engaged: { variant: "default", label: "Engaged" },
      meeting_scheduled: { variant: "default", label: "Meeting" },
      proposal_sent: { variant: "default", label: "Proposal" },
      converted: { variant: "default", label: "Converted" },
      lost: { variant: "destructive", label: "Lost" },
      nurture: { variant: "outline", label: "Nurture" },
    }

  const config = statusConfig[status] || { variant: "outline" as const, label: status }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-green-600 bg-green-50"
  if (score >= 60) return "text-yellow-600 bg-yellow-50"
  if (score >= 40) return "text-orange-600 bg-orange-50"
  return "text-red-600 bg-red-50"
}

export default async function ProspectsPage() {
  const [stats, prospects] = await Promise.all([getProspectStats(), getProspects()])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hunter Prospects</h1>
        <p className="text-muted-foreground">AI-identified leads and outreach management</p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Prospects</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualified</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.qualified}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contacted</CardTitle>
            <Mail className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.contacted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Converted</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.converted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgScore}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Prospects</CardTitle>
          <CardDescription>Prospects identified by the Hunter agent, sorted by lead score</CardDescription>
        </CardHeader>
        <CardContent>
          {prospects.length === 0 ? (
            <div className="text-center py-12">
              <Target className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No prospects yet</h3>
              <p className="text-muted-foreground mt-2">
                The Hunter agent will identify prospects from real estate listings, intent signals, and other sources.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {prospects.map((prospect) => {
                const enrichedData = (prospect.enriched_data as Record<string, unknown>) || {}
                const signals = (prospect.signals as any[]) || []

                return (
                  <div
                    key={prospect.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex items-center justify-center w-12 h-12 rounded-full ${getScoreColor(prospect.score)}`}
                      >
                        <span className="font-bold">{prospect.score}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{prospect.company_name}</span>
                          {getStatusBadge(prospect.status)}
                          {prospect.qualified && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Qualified
                            </Badge>
                          )}
                        </div>

                        {prospect.contact_name && (
                          <p className="text-sm text-muted-foreground">
                            {prospect.contact_name}
                            {prospect.contact_title && ` - ${prospect.contact_title}`}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {prospect.contact_email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {prospect.contact_email}
                            </span>
                          )}
                          {prospect.contact_phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {prospect.contact_phone}
                            </span>
                          )}
                          {prospect.linkedin_url && (
                            <a
                              href={prospect.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:text-blue-600"
                            >
                              <Linkedin className="h-3 w-3" />
                              LinkedIn
                            </a>
                          )}
                        </div>

                        {signals.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <AlertCircle className="h-3 w-3 text-orange-500" />
                            <span className="text-xs text-muted-foreground">
                              {signals.length} intent signal{signals.length !== 1 ? "s" : ""}
                            </span>
                            {signals.slice(0, 3).map((signal: any, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {signal.type?.replace(/_/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                          <span>Source: {prospect.source?.replace(/_/g, " ")}</span>
                          {enrichedData.industry && <span>Industry: {enrichedData.industry as string}</span>}
                          {enrichedData.employeeCount && <span>Size: {enrichedData.employeeCount as string}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {prospect.next_follow_up_date && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Follow-up: {new Date(prospect.next_follow_up_date).toLocaleDateString()}
                        </div>
                      )}
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
