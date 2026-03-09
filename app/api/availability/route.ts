import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get("start") || new Date().toISOString().split("T")[0]
  const endDate = searchParams.get("end") || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("availability")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true })

    if (error) {
      // Table not set up yet — return simulated availability with a flag so clients can distinguish
      console.warn("[availability] DB unavailable, returning simulated availability:", error.message)
      const dates = []
      const start = new Date(startDate)
      const end = new Date(endDate)

      let d = new Date(start)
      while (d <= end) {
        const dayOfWeek = d.getDay()
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        dates.push({
          date: d.toISOString().split("T")[0],
          is_available: !isWeekend,
          max_bookings: 3,
          current_bookings: 0,
        })
        d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
      }

      return NextResponse.json({ availability: dates, simulated: true })
    }

    return NextResponse.json({ availability: data })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 })
  }
}
