"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { buildMarketingStats, calculateRelocations } from "@/lib/landing/stats"

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

  const scrollToAssistant = () => {
    document.getElementById("quote-assistant")?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  const stats = useMemo(() => buildMarketingStats(relocations), [relocations])

  return (
    <section className="py-12 bg-card border-y border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 pb-8 border-b border-border">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1">Ready to move your business?</h2>
            <p className="text-muted-foreground">Get a free, no-obligation quote in under 60 seconds</p>
          </div>
          <div className="flex gap-3">
            <Button className="uppercase tracking-wider group" onClick={scrollToAssistant}>
              <Sparkles className="w-4 h-4 mr-2" />
              Get Free Quote
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" className="uppercase tracking-wider bg-transparent" asChild>
              <a href="tel:+61388201801">Call Now</a>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div
                className={`text-3xl md:text-4xl font-bold mb-1 font-mono ${stat.highlight ? "text-secondary" : "text-primary"}`}
              >
                {stat.value}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
