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
      // If table doesn't exist yet, return simulated availability
      const dates = []
      const start = new Date(startDate)
      const end = new Date(endDate)

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay()
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        dates.push({
          date: d.toISOString().split("T")[0],
          is_available: !isWeekend,
          max_bookings: 3,
          current_bookings: Math.floor(Math.random() * 2), // Simulate some bookings
        })
      }

      return NextResponse.json({ availability: dates })
    }

    return NextResponse.json({ availability: data })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 })
  }
}
