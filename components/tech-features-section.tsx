"use client"

import { Cpu, Radar, Lock, BarChart3 } from "lucide-react"
import { useEffect, useState } from "react"

const features = [
  {
    icon: Radar,
    title: "Real-Time Tracking",
    description: "Live tracking with real-time updates. Monitor your assets throughout the entire relocation process.",
    comingSoon: true,
  },
  {
    icon: Cpu,
    title: "AI Route Optimization",
    description:
      "Machine learning algorithms calculate the fastest, safest routes for your cargo. Reduce transit time by 40%.",
    comingSoon: true,
  },
  {
    icon: Lock,
    title: "Chain of Custody",
    description:
      "Blockchain-verified documentation and digital signatures ensure complete accountability at every checkpoint.",
    comingSoon: true,
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Access detailed move analytics, cost breakdowns, and performance metrics through our client portal.",
    comingSoon: true,
  },
]

interface FleetStats {
  totalVehicles: number
  activeDeployments: number
  pipelineCount: number
  trackingUptime: number
  securityBreaches: number
}

export function TechFeaturesSection() {
  const [stats, setStats] = useState<FleetStats>({
    totalVehicles: 1,
    activeDeployments: 0,
    pipelineCount: 0,
    trackingUptime: 100,
    securityBreaches: 0,
  })

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/fleet-stats")
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch (error) {
        console.error("Failed to fetch fleet stats:", error)
      }
    }
    fetchStats()
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section id="technology" className="py-16 md:py-24 bg-card border-y border-border">
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 max-w-16 bg-secondary" />
            <span className="text-xs uppercase tracking-widest text-secondary font-mono">// Technology Stack</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">TECH_INFRASTRUCTURE</h2>
          <p className="text-muted-foreground max-w-2xl">
            Cutting-edge systems powering every move. Our proprietary technology ensures precision, security, and
            transparency.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex gap-6 p-6 border border-border bg-background hover:border-secondary/50 transition-colors group relative"
            >
              {feature.comingSoon && (
                <div className="absolute top-3 right-3 px-2 py-1 bg-accent/20 border border-accent/50 text-accent text-xs font-mono uppercase tracking-wider">
                  Coming Soon
                </div>
              )}
              <div className="flex-shrink-0">
                <div
                  className={`w-14 h-14 border flex items-center justify-center transition-colors ${
                    feature.comingSoon
                      ? "bg-muted/10 border-muted/30"
                      : "bg-secondary/10 border-secondary/30 group-hover:bg-secondary/20"
                  }`}
                >
                  <feature.icon
                    className={`w-7 h-7 ${feature.comingSoon ? "text-muted-foreground" : "text-secondary"}`}
                  />
                </div>
              </div>
              <div>
                <h3
                  className={`text-lg font-bold mb-2 ${feature.comingSoon ? "text-muted-foreground" : "text-foreground"}`}
                >
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Terminal-style status - now with real-time data */}
        <div className="mt-12 p-6 bg-background border border-border font-mono text-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-primary" />
            <div className="w-3 h-3 bg-secondary" />
            <div className="w-3 h-3 bg-accent" />
            <span className="ml-2 text-muted-foreground">system_status.sh</span>
          </div>
          <div className="space-y-1 text-muted-foreground">
            <p>
              <span className="text-secondary">$</span> fleet_status --all
            </p>
            <p className="text-foreground">
              → {stats.totalVehicles} vehicle{stats.totalVehicles !== 1 ? "s" : ""} online | {stats.activeDeployments}{" "}
              active deployment{stats.activeDeployments !== 1 ? "s" : ""}
            </p>
            <p>
              <span className="text-secondary">$</span> tracking_uptime
            </p>
            <p className="text-foreground">
              → <span className="text-accent">Coming Soon</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
