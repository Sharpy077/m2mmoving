import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, Truck, Users, AlertTriangle, Clock, MapPin, CheckCircle2 } from "lucide-react"

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

export default async function OperationsPage() {
  const supabase = await createClient()

  const today = new Date().toISOString().split("T")[0]
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  const jobs = await safeQuery(() =>
    supabase
      .from("scheduled_jobs")
      .select(`*, crews:assigned_crew_id (id, name), vehicles:assigned_vehicle_id (id, name, registration)`)
      .gte("scheduled_date", today)
      .order("scheduled_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(50),
  )

  const crews = await safeQuery(() => supabase.from("crews").select("*").order("name"))

  const contingencies = await safeQuery(() =>
    supabase.from("contingency_events").select("*").eq("status", "active").order("created_at", { ascending: false }),
  )

  const capacity = await safeQuery(() =>
    supabase
      .from("capacity_slots")
      .select("*")
      .gte("slot_date", today)
      .order("slot_date", { ascending: true })
      .limit(14),
  )

  const todayJobs = jobs?.filter((j: any) => j.scheduled_date === today) || []
  const tomorrowJobs = jobs?.filter((j: any) => j.scheduled_date === tomorrow) || []
  const upcomingJobs = jobs?.filter((j: any) => j.scheduled_date > tomorrow) || []

  const availableCrews = crews?.filter((c: any) => c.status === "available").length || 0
  const onJobCrews = crews?.filter((c: any) => c.status === "on_job").length || 0

  if (!jobs && !crews && !contingencies && !capacity) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Operations Dashboard</h1>
          <p className="text-muted-foreground">Manage scheduling, crews, and day-of operations</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
            <h3 className="text-lg font-semibold mb-2">Database Setup Required</h3>
            <p className="text-muted-foreground">
              The operations tables have not been created yet. Please run the SQL migrations (008 and 009) to enable
              this feature.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Operations Dashboard</h1>
        <p className="text-muted-foreground">Manage scheduling, crews, and day-of operations</p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{"Today's Jobs"}</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayJobs.length}</div>
            <p className="text-xs text-muted-foreground">
              {todayJobs.filter((j: any) => j.status === "completed").length} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Crews Available</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableCrews}</div>
            <p className="text-xs text-muted-foreground">{onJobCrews} currently on jobs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{"Tomorrow's Jobs"}</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tomorrowJobs.length}</div>
            <p className="text-xs text-muted-foreground">
              {tomorrowJobs.filter((j: any) => j.assigned_crew_id).length} crews assigned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contingencies?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Contingencies */}
      {contingencies && contingencies.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Active Contingencies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {contingencies.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={c.severity === "major" ? "destructive" : "outline"}>{c.severity}</Badge>
                      <span className="font-medium">{c.event_type?.replace("_", " ")}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{c.description}</p>
                  </div>
                  <Button size="sm" variant="outline">
                    Resolve
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="today" className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">Today ({todayJobs.length})</TabsTrigger>
          <TabsTrigger value="tomorrow">Tomorrow ({tomorrowJobs.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcomingJobs.length})</TabsTrigger>
          <TabsTrigger value="crews">Crews ({crews?.length || 0})</TabsTrigger>
          <TabsTrigger value="capacity">Capacity</TabsTrigger>
        </TabsList>

        {/* Today's Jobs */}
        <TabsContent value="today" className="space-y-4">
          {todayJobs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">No jobs scheduled for today</CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {todayJobs.map((job: any) => (
                <Card key={job.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{job.start_time}</span>
                          <Badge
                            variant={
                              job.status === "completed"
                                ? "default"
                                : job.status === "in_progress"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {job.status}
                          </Badge>
                          {job.priority === "vip" && <Badge variant="destructive">VIP</Badge>}
                        </div>
                        <h3 className="font-semibold">{job.customer_name}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {job.origin_suburb} → {job.destination_suburb}
                        </div>
                        <div className="flex gap-4 text-sm">
                          <span>Crew: {job.crews?.name || "Unassigned"}</span>
                          <span>Vehicle: {job.vehicles?.registration || "Unassigned"}</span>
                          <span>{job.estimated_sqm} sqm</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {job.status === "scheduled" && <Button size="sm">Start Job</Button>}
                        {job.status === "in_progress" && (
                          <Button size="sm" variant="outline">
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tomorrow's Jobs */}
        <TabsContent value="tomorrow" className="space-y-4">
          {tomorrowJobs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No jobs scheduled for tomorrow
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {tomorrowJobs.map((job: any) => (
                <Card key={job.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{job.start_time}</span>
                          <Badge variant="outline">{job.status}</Badge>
                        </div>
                        <h3 className="font-semibold">{job.customer_name}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {job.origin_suburb} → {job.destination_suburb}
                        </div>
                        <div className="flex gap-4 text-sm">
                          <span>Crew: {job.crews?.name || "Unassigned"}</span>
                          <span>Vehicle: {job.vehicles?.registration || "Unassigned"}</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Assign Resources
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Upcoming Jobs */}
        <TabsContent value="upcoming" className="space-y-4">
          {upcomingJobs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">No upcoming jobs scheduled</CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {upcomingJobs.map((job: any) => (
                <Card key={job.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{job.scheduled_date}</span>
                          <span className="text-muted-foreground">{job.start_time}</span>
                        </div>
                        <h3 className="font-semibold">{job.customer_name}</h3>
                        <div className="text-sm text-muted-foreground">
                          {job.origin_suburb} → {job.destination_suburb}
                        </div>
                      </div>
                      <Badge variant="outline">{job.job_type}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Crews */}
        <TabsContent value="crews" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {crews?.map((crew: any) => (
              <Card key={crew.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{crew.name}</CardTitle>
                    <Badge
                      variant={
                        crew.status === "available" ? "default" : crew.status === "on_job" ? "secondary" : "outline"
                      }
                    >
                      {crew.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Lead: </span>
                      {crew.crew_lead_name || "Not assigned"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Members: </span>
                      {Array.isArray(crew.members) ? crew.members.length : 0}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Skills: </span>
                      {Array.isArray(crew.skills) ? crew.skills.slice(0, 3).join(", ") : "General"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Shift: </span>
                      {crew.shift_start} - {crew.shift_end}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) || (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center text-muted-foreground">No crews configured</CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Capacity */}
        <TabsContent value="capacity" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-7">
            {capacity?.map((slot: any) => {
              const date = new Date(slot.slot_date)
              const utilizationPercent =
                slot.total_crew_hours > 0 ? Math.round((slot.booked_crew_hours / slot.total_crew_hours) * 100) : 0

              return (
                <Card key={slot.id} className={slot.is_blocked ? "opacity-50" : ""}>
                  <CardHeader className="pb-2 text-center">
                    <CardDescription>{date.toLocaleDateString("en-AU", { weekday: "short" })}</CardDescription>
                    <CardTitle className="text-lg">{date.getDate()}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    {slot.is_blocked ? (
                      <Badge variant="destructive">Blocked</Badge>
                    ) : (
                      <>
                        <div className="text-2xl font-bold">{slot.jobs_count}</div>
                        <div className="text-xs text-muted-foreground">jobs</div>
                        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${utilizationPercent > 80 ? "bg-destructive" : "bg-primary"}`}
                            style={{ width: `${utilizationPercent}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{utilizationPercent}% utilized</div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )
            }) || (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center text-muted-foreground">No capacity data available</CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
