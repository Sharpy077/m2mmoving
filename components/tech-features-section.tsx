import { Cpu, Radar, Lock, BarChart3 } from "lucide-react"

const features = [
  {
    icon: Radar,
    title: "Real-Time Tracking",
    description:
      "GPS-enabled fleet tracking with live updates. Monitor your assets throughout the entire relocation process.",
    comingSoon: false,
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

export function TechFeaturesSection() {
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

        {/* Terminal-style status */}
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
            <p className="text-foreground">→ 47 vehicles online | 12 active deployments</p>
            <p>
              <span className="text-secondary">$</span> tracking_uptime
            </p>
            <p className="text-foreground">→ 99.99% uptime | Last 365 days</p>
            <p>
              <span className="text-secondary">$</span> security_audit
            </p>
            <p className="text-primary">→ All systems nominal | Zero breaches_</p>
          </div>
        </div>
      </div>
    </section>
  )
}
