"use client"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Zap, Target, Phone } from "lucide-react"
import { QuoteAssistant, type QuoteAssistantHandle } from "@/components/quote-assistant"

export function HeroSection() {
  const [showFloatingAssistant, setShowFloatingAssistant] = useState(false)
  const assistantContainerRef = useRef<HTMLDivElement>(null)
  const floatingAssistantRef = useRef<QuoteAssistantHandle>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowFloatingAssistant(!entry.isIntersecting)
      },
      { threshold: 0.1 },
    )

    if (assistantContainerRef.current) {
      observer.observe(assistantContainerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const scrollToAssistant = () => {
    assistantContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  return (
    <>
      <section id="quote-assistant" className="relative pt-20 pb-16 md:pt-28 md:pb-24 overflow-hidden">
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
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left Column - Main Content */}
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-balance">
                <span className="text-foreground">Get Your Office</span>
                <br />
                <span className="text-primary">Moved Fast</span>
                <span className="text-foreground">_</span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-8 leading-relaxed">
                Melbourne's commercial moving specialists. Office relocations, data centres, and IT equipment handled
                with precision.{" "}
                <span className="text-foreground font-semibold">Free instant quotes via AI or phone.</span>
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button size="lg" className="uppercase tracking-wider group text-lg h-14" onClick={scrollToAssistant}>
                  Get Free Quote
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="uppercase tracking-wider bg-transparent h-14 text-lg"
                  asChild
                >
                  <a href="tel:+61388201801" className="flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    (03) 8820 1801
                  </a>
                </Button>
              </div>

              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 border border-primary/50 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Fully Insured</div>
                    <div className="text-sm font-bold text-foreground">$10M+ Coverage</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-secondary/20 border border-secondary/50 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Fast Turnaround</div>
                    <div className="text-sm font-bold text-foreground">24-48 Hours</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/20 border border-accent/50 flex items-center justify-center">
                    <Target className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Track Record</div>
                    <div className="text-sm font-bold text-foreground">$0 Damage Claims</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - AI Quote Assistant */}
            <div ref={assistantContainerRef} className="lg:mt-0">
              <QuoteAssistant embedded />
            </div>
          </div>
        </div>
      </section>

      {showFloatingAssistant && <QuoteAssistant ref={floatingAssistantRef} />}
    </>
  )
}
