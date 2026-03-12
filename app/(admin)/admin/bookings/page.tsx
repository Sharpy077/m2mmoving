import { Suspense } from "react"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { Calendar, Truck, MapPin, Clock, CheckCircle2, User, Building2 } from "lucide-react"

export const metadata: Metadata = {
  title: "Bookings | M&M Admin",
  description: "Manage confirmed bookings",
}

async function BookingsCalendar() {
  const supabase = await createClient()

  const { data: bookings, error } = await supabase
    .from("leads")
    .select("*")
    .eq("deposit_paid", true)
    .order("target_move_date", { ascending: true })

  if (error) {
    console.error("[v0] Error fetching bookings:", error)
    return <div className="text-red-400">Error loading bookings</div>
  }

  // Group bookings by date
  const groupedBookings: Record<string, typeof bookings> = {}
  bookings?.forEach((booking) => {
    const date = booking.target_move_date || booking.scheduled_date || "unscheduled"
    if (!groupedBookings[date]) {
      groupedBookings[date] = []
    }
    groupedBookings[date].push(booking)
  })

  const statusColors: Record<string, string> = {
    confirmed: "border-l-emerald-500 bg-emerald-500/5",
    in_progress: "border-l-cyan-500 bg-cyan-500/5",
    completed: "border-l-green-500 bg-green-500/5",
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedBookings).map(([date, dateBookings]) => (
        <div key={date}>
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold">
              {date === "unscheduled"
                ? "Unscheduled"
                : new Date(date).toLocaleDateString("en-AU", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
            </h3>
            <span className="text-sm text-white/40">({dateBookings.length} moves)</span>
          </div>

          <div className="space-y-3">
            {dateBookings.map((booking) => (
              <div
                key={booking.id}
                className={`p-4 rounded-xl border border-white/10 border-l-4 ${statusColors[booking.status] || "border-l-white/20"}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-white/5">
                      <Truck className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-white/40" />
                        <span className="font-semibold">{booking.company_name || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-white/60">
                        <User className="w-3 h-3" />
                        <span>{booking.contact_name}</span>
                        {booking.phone && <span>• {booking.phone}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-400">
                      ${booking.estimated_total?.toLocaleString() || "TBC"}
                    </div>
                    <div className="text-xs text-white/40">
                      Deposit: ${booking.deposit_amount || Math.round((booking.estimated_total || 0) * 0.5)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-white/40" />
                    <span>{booking.origin_suburb}</span>
                    <span className="text-white/20">→</span>
                    <span>{booking.destination_suburb}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/40">
                    <Clock className="w-4 h-4" />
                    <span>{booking.move_type || "Commercial"}</span>
                  </div>
                  <span
                    className={`ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      booking.status === "confirmed"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-white/10 text-white/60"
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {booking.status || "Confirmed"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {(!bookings || bookings.length === 0) && (
        <div className="text-center py-12 text-white/40">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p>No confirmed bookings yet</p>
        </div>
      )}
    </div>
  )
}

function BookingsSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-6 w-48 bg-white/5 rounded" />
          <div className="h-32 bg-white/5 rounded-xl" />
        </div>
      ))}
    </div>
  )
}

export default function BookingsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Bookings</h1>
          <p className="text-white/50 mt-1">Confirmed moves and schedule</p>
        </div>
      </div>

      <Suspense fallback={<BookingsSkeleton />}>
        <BookingsCalendar />
      </Suspense>
    </div>
  )
}
