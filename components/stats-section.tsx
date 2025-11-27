"use client"

import { useEffect, useState } from "react"

// First relocation: ~3 months ago, Second: ~2 weeks ago
// We simulate gradual growth based on business trajectory
function calculateRelocations(): number {
  const startDate = new Date("2025-08-26") // ~3 months ago - first relocation
  const secondRelocationDate = new Date("2025-11-12") // ~2 weeks ago
  const now = new Date()

  // Base count is 2 (the completed ones)
  let count = 2

  // If we're before the second relocation date, only count 1
  if (now < secondRelocationDate) {
    count = 1
  }

  return count
}

export function StatsSection() {
  const [relocations, setRelocations] = useState(2)

  useEffect(() => {
    // Calculate on mount
    setRelocations(calculateRelocations())

    // Update every hour in case date changes
    const interval = setInterval(() => {
      setRelocations(calculateRelocations())
    }, 3600000)

    return () => clearInterval(interval)
  }, [])

  const stats = [
    { value: relocations.toString(), label: "Relocations Complete" },
    { value: "$0", label: "Damage Claims" },
    { value: "48hrs", label: "Avg. Project Time" },
    { value: "100%", label: "Client Retention" },
  ]

  return (
    <section className="py-12 bg-card border-y border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-1 font-mono">{stat.value}</div>
              <div className="text-xs md:text-sm text-muted-foreground uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
