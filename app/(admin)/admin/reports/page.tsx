import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart3, TrendingUp, AlertTriangle, FileText, Calendar, Lightbulb, Target } from "lucide-react"

export const dynamic = "force-dynamic"

async function safeQuery<T>(queryFn: () => Promise<{ data: T | null; error: unknown }>): Promise<T | null> {
  try {
    const { data, error } = await queryFn()
    if (error) return null
    return data
  } catch {
    return null
  }
}

export default async function ReportsPage() {
  const supabase = await createClient()

  const snapshots = await safeQuery(() =>
    supabase.from("analytics_snapshots").select("*").order("snapshot_date", { ascending: false }).limit(7),
  )

  const insights = await safeQuery(() =>
    supabase
      .from("analytics_insights")
      .select("*")
      .eq("status", "new")
      .order("priority", { ascending: false })
      .limit(10),
  )

  const forecasts = await safeQuery(() =>
    supabase.from("revenue_forecasts").select("*").order("forecast_date", { ascending: false }).limit(3),
  )

  const anomalies = await safeQuery(() =>
    supabase
      .from("detected_anomalies")
      .select("*")
      .eq("status", "open")
      .order("severity", { ascending: false })
      .limit(5),
  )

  const scheduledReports = await safeQuery(() =>
    supabase.from("scheduled_reports").select("*").eq("is_active", true).order("next_send_at", { ascending: true }),
  )

  const latestSnapshot = snapshots?.[0]

  if (!snapshots && !insights && !forecasts && !anomalies && !scheduledReports) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Reports</h1>
          <p className="text-muted-foreground">Oracle Agent - Business Intelligence Dashboard</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
            <h3 className="text-lg font-semibold mb-2">Database Setup Required</h3>
            <p className="text-muted-foreground">
              The analytics tables have not been created yet. Please run SQL migration 008 to enable this feature.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const priorityColors: Record<string, string> = {
    critical: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-yellow-500",
    low: "bg-blue-500",
  }

  const severityColors: Record<string, string> = {
    critical: "bg-red-100 text-red-800",
    high: "bg-orange-100 text-orange-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-blue-100 text-blue-800",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Reports</h1>
          <p className="text-muted-foreground">Oracle Agent - Business Intelligence Dashboard</p>
        </div>
        <Button>
          <FileText className="mr-2 h-4 w-4" />
          Generate Report
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestSnapshot?.leads_total || 0}</div>
            <p className="text-xs text-muted-foreground">{latestSnapshot?.leads_new || 0} new this period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestSnapshot?.lead_conversion_rate || 0}%</div>
            <p className="text-xs text-muted-foreground">{latestSnapshot?.leads_converted || 0} converted</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${((latestSnapshot?.revenue_pipeline || 0) / 1000).toFixed(0)}k</div>
            <p className="text-xs text-muted-foreground">Active opportunities</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue Closed</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${((latestSnapshot?.revenue_closed || 0) / 1000).toFixed(0)}k</div>
            <p className="text-xs text-muted-foreground">{latestSnapshot?.revenue_growth_percent || 0}% growth</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Active Insights
            </CardTitle>
            <CardDescription>AI-generated recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights && insights.length > 0 ? (
                insights.map((insight: any) => (
                  <div key={insight.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <div className={`h-2 w-2 mt-2 rounded-full ${priorityColors[insight.priority] || "bg-gray-500"}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{insight.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {insight.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No active insights. Oracle is analyzing your data...
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Anomalies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Detected Anomalies
            </CardTitle>
            <CardDescription>Unusual patterns requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {anomalies && anomalies.length > 0 ? (
                anomalies.map((anomaly: any) => (
                  <div key={anomaly.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <Badge className={severityColors[anomaly.severity] || "bg-gray-100"}>{anomaly.severity}</Badge>
                    <div className="flex-1">
                      <div className="font-medium">{anomaly.metric_name}</div>
                      <p className="text-sm text-muted-foreground">
                        Value: {anomaly.metric_value} (expected: {anomaly.expected_value})
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {anomaly.deviation_percent}% deviation - {anomaly.anomaly_type}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No anomalies detected. All metrics are within normal range.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Forecasts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue Forecasts
            </CardTitle>
            <CardDescription>Predicted revenue by scenario</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {forecasts && forecasts.length > 0 ? (
                forecasts.map((forecast: any) => (
                  <div key={forecast.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="font-medium capitalize">{forecast.scenario} Scenario</div>
                      <p className="text-sm text-muted-foreground">{forecast.horizon} horizon</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">${(forecast.total_forecast / 1000).toFixed(0)}k</div>
                      <p className="text-sm text-muted-foreground">{forecast.confidence_percent}% confidence</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No forecasts generated yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Scheduled Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Scheduled Reports
            </CardTitle>
            <CardDescription>Automated report delivery</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scheduledReports && scheduledReports.length > 0 ? (
                scheduledReports.map((report: any) => (
                  <div key={report.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="font-medium">{report.name}</div>
                      <p className="text-sm text-muted-foreground">
                        {report.report_type} - {report.frequency}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{report.format}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Next:{" "}
                        {report.next_send_at ? new Date(report.next_send_at).toLocaleDateString() : "Not scheduled"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No scheduled reports configured.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
