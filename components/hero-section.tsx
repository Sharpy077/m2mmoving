import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Zap, Target } from "lucide-react"
import Link from "next/link"

export function HeroSection() {
  return (
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to right, var(--primary) 1px, transparent 1px),
                              linear-gradient(to bottom, var(--primary) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)",
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl">
          {/* Status bar */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border mb-8">
            <div className="w-2 h-2 bg-secondary animate-pulse" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-mono">
              System Active // Commercial Operations Online
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 text-balance">
            <span className="text-foreground">PRECISION</span>
            <br />
            <span className="text-primary">COMMERCIAL</span>
            <br />
            <span className="text-foreground">RELOCATION_</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-8 leading-relaxed">
            Melbourne's leading tech-powered commercial moving services. We relocate offices, data centers, and
            enterprise equipment with military-grade precision and zero downtime.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Button size="lg" className="uppercase tracking-wider group" asChild>
              <Link href="/quote">
                Get Quote
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="uppercase tracking-wider bg-transparent" asChild>
              <Link href="#services">View Operations</Link>
            </Button>
          </div>

          {/* Feature badges */}
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 border border-primary/50 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Insurance</div>
                <div className="text-sm font-bold text-foreground">$10M+ Coverage</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary/20 border border-secondary/50 flex items-center justify-center">
                <Zap className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Speed</div>
                <div className="text-sm font-bold text-foreground">24hr Turnaround</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/20 border border-accent/50 flex items-center justify-center">
                <Target className="w-5 h-5 text-accent" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Precision</div>
                <div className="text-sm font-bold text-foreground">99.9% Success</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
