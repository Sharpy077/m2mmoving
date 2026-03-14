"use client"

import { useState } from "react"
import { Calendar, Truck, Users, Clock, MapPin } from "lucide-react"

interface Job {
  id: string
  leadCompany: string
  crewName: string
  scheduledDate: string
  startTime: string
  estimatedHours: number
  origin: string
  destination: string
  status: "scheduled" | "in_progress" | "completed" | "cancelled"
}

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function SchedulingClient() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [jobs] = useState<Job[]>(generateSampleJobs())

  const weekDates = getWeekDates(new Date(selectedDate))

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
            Crew Scheduling
          </h1>
          <p className="text-white/50 mt-1">Manage daily job assignments and crew allocation</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-blue-500/30 bg-gradient-to-b from-blue-500/20 to-blue-500/5 text-blue-400">
          <Calendar className="w-5 h-5 mb-2 opacity-60" />
          <div className="text-2xl font-bold">{jobs.length}</div>
          <div className="text-xs text-white/40">Jobs This Week</div>
        </div>
        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/20 to-emerald-500/5 text-emerald-400">
          <Users className="w-5 h-5 mb-2 opacity-60" />
          <div className="text-2xl font-bold">3</div>
          <div className="text-xs text-white/40">Active Crews</div>
        </div>
        <div className="p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-500/20 to-cyan-500/5 text-cyan-400">
          <Truck className="w-5 h-5 mb-2 opacity-60" />
          <div className="text-2xl font-bold">5</div>
          <div className="text-xs text-white/40">Vehicles Available</div>
        </div>
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/20 to-amber-500/5 text-amber-400">
          <Clock className="w-5 h-5 mb-2 opacity-60" />
          <div className="text-2xl font-bold">42h</div>
          <div className="text-xs text-white/40">Total Hours</div>
        </div>
      </div>

      {/* Weekly Calendar */}
      <div className="bg-white/[0.02] rounded-2xl border border-white/10 overflow-hidden">
        <div className="grid grid-cols-6 border-b border-white/10">
          {weekDates.map((date, i) => (
            <div key={i} className="p-4 text-center border-r border-white/10 last:border-r-0">
              <div className="text-sm font-semibold">{DAYS_OF_WEEK[i]}</div>
              <div className="text-xs text-white/40">{date}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-6 min-h-[400px]">
          {weekDates.map((date, i) => {
            const dayJobs = jobs.filter((j) => j.scheduledDate === date)
            return (
              <div key={i} className="p-2 border-r border-white/10 last:border-r-0 space-y-2">
                {dayJobs.map((job) => (
                  <div
                    key={job.id}
                    className={`p-2 rounded-lg text-xs border ${
                      job.status === "completed"
                        ? "border-emerald-500/30 bg-emerald-500/10"
                        : job.status === "in_progress"
                        ? "border-cyan-500/30 bg-cyan-500/10"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="font-semibold truncate">{job.leadCompany}</div>
                    <div className="text-white/40 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {job.startTime} ({job.estimatedHours}h)
                    </div>
                    <div className="text-white/40 flex items-center gap-1">
                      <Users className="w-3 h-3" /> {job.crewName}
                    </div>
                    <div className="text-white/40 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3" /> {job.origin.split(",")[0]}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function getWeekDates(date: Date): string[] {
  const day = date.getDay()
  const monday = new Date(date)
  monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1))

  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().split("T")[0]
  })
}

function generateSampleJobs(): Job[] {
  const today = new Date()
  const dates = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() + i - 1)
    return d.toISOString().split("T")[0]
  })

  return [
    { id: "job_1", leadCompany: "Acme Corp", crewName: "Alpha", scheduledDate: dates[0], startTime: "08:00", estimatedHours: 6, origin: "123 Collins St, Melbourne", destination: "456 Bourke St, Melbourne", status: "completed" },
    { id: "job_2", leadCompany: "TechStart AU", crewName: "Bravo", scheduledDate: dates[1], startTime: "07:30", estimatedHours: 8, origin: "789 Lonsdale St", destination: "101 Flinders St", status: "in_progress" },
    { id: "job_3", leadCompany: "CBD Lawyers", crewName: "Alpha", scheduledDate: dates[2], startTime: "09:00", estimatedHours: 4, origin: "200 Queen St", destination: "300 King St", status: "scheduled" },
    { id: "job_4", leadCompany: "DataVault", crewName: "Charlie", scheduledDate: dates[3], startTime: "06:00", estimatedHours: 10, origin: "Data Center Rd", destination: "New Data Center", status: "scheduled" },
    { id: "job_5", leadCompany: "GreenOffice", crewName: "Bravo", scheduledDate: dates[4], startTime: "08:30", estimatedHours: 5, origin: "50 Spencer St", destination: "75 Exhibition St", status: "scheduled" },
  ]
}
