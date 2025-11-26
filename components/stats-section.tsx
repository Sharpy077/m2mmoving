const stats = [
  { value: "2,500+", label: "Relocations Complete" },
  { value: "$0", label: "Damage Claims" },
  { value: "48hrs", label: "Avg. Project Time" },
  { value: "100%", label: "Client Retention" },
]

export function StatsSection() {
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
