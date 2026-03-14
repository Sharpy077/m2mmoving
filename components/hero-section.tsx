"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Shield, Zap, Target, Phone, MessageSquare, Award, Clock, Users } from "lucide-react"
import { QuoteAssistant } from "@/components/quote-assistant"
import { ErrorBoundary } from "@/components/error-boundary"
import { Card, CardContent } from "@/components/ui/card"

function QuoteAssistantFallback() {
  return (
    <Card className="h-[400px] sm:h-[500px] rounded-xl border shadow-lg">
      <CardContent className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-8">
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
        </div>
        <h3 className="text-lg sm:text-xl font-semibold mb-2">Get Your Free Quote</h3>
        <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-sm">
          Our quote assistant is temporarily unavailable. Please call us directly for a free quote.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button size="lg" asChild className="w-full sm:w-auto">
            <a href="tel:+61388201801" className="flex items-center justify-center gap-2">
              <Phone className="w-5 h-5" />
              03 8820 1801
            </a>
          </Button>
          <Button size="lg" variant="outline" asChild className="w-full sm:w-auto bg-transparent">
            <a href="/quote">Request Quote Online</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function HeroSection() {
  const assistantContainerRef = useRef<HTMLDivElement>(null)

  const scrollToAssistant = () => {
    assistantContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  return (
    <section
      id="quote-assistant"
      className="relative w-full min-h-screen flex flex-col pt-20 pb-8 sm:pt-24 sm:pb-12 lg:pt-28 lg:pb-16 overflow-hidden"
    >
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

      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)",
          }}
        />
      </div>

      <div className="w-full h-full flex-grow flex flex-col px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 relative z-10">
        <div className="flex flex-col gap-4 lg:gap-6 h-full flex-grow w-full">
          <div className="w-full flex-shrink-0 grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-4 lg:gap-8 items-center">
            {/* Left column - Stats (hidden on mobile, visible on lg+) */}
            <div className="hidden lg:flex flex-col gap-4 items-end">
              <div className="flex items-center gap-3 p-4 bg-card/50 border border-border/50 rounded-lg hover:border-primary/50 transition-all duration-300">
                <div className="w-12 h-12 bg-primary/20 border border-primary/50 flex items-center justify-center rounded-md">
                  <Shield className="w-6 h-6 text-primary" aria-hidden="true" />
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Fully Insured</div>
                  <div className="text-lg font-bold text-foreground">$10M+ Coverage</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-card/50 border border-border/50 rounded-lg hover:border-secondary/50 transition-all duration-300">
                <div className="w-12 h-12 bg-secondary/20 border border-secondary/50 flex items-center justify-center rounded-md">
                  <Zap className="w-6 h-6 text-secondary" aria-hidden="true" />
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Fast Turnaround</div>
                  <div className="text-lg font-bold text-foreground">24-48 Hours</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-card/50 border border-border/50 rounded-lg hover:border-accent/50 transition-all duration-300">
                <div className="w-12 h-12 bg-accent/20 border border-accent/50 flex items-center justify-center rounded-md">
                  <Target className="w-6 h-6 text-accent" aria-hidden="true" />
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Track Record</div>
                  <div className="text-lg font-bold text-foreground">$0 Damage Claims</div>
                </div>
              </div>
            </div>

            {/* Center column - Main heading */}
            <div className="flex flex-col items-center justify-center text-center">
              {/* Status badge */}
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-card border border-border mb-4 sm:mb-6 transition-all duration-300">
                <div className="w-2 h-2 bg-secondary animate-pulse" />
                <span className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground font-mono">
                  System Active // Commercial Operations Online
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold leading-tight mb-4 sm:mb-6 text-balance transition-all duration-300">
                <span className="text-foreground">Get Your Office</span>
                <br />
                <span className="text-primary">Moved Fast</span>
                <span className="text-foreground">_</span>
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto mb-4 sm:mb-6 leading-relaxed transition-all duration-300">
                Melbourne's commercial moving specialists. Office relocations, data centres, and IT equipment handled
                with precision.{" "}
                <span className="text-foreground font-semibold">Free instant quotes via AI or phone.</span>
              </p>

              {/* Mobile-only stats row */}
              <div className="flex lg:hidden flex-wrap justify-center gap-3 mb-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-card/50 border border-border/50 rounded-lg">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium">$10M+ Insured</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-card/50 border border-border/50 rounded-lg">
                  <Zap className="w-4 h-4 text-secondary" />
                  <span className="text-xs font-medium">24-48 Hours</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-card/50 border border-border/50 rounded-lg">
                  <Target className="w-4 h-4 text-accent" />
                  <span className="text-xs font-medium">$0 Claims</span>
                </div>
              </div>
            </div>

            {/* Right column - More stats (hidden on mobile, visible on lg+) */}
            <div className="hidden lg:flex flex-col gap-4 items-start">
              <div className="flex items-center gap-3 p-4 bg-card/50 border border-border/50 rounded-lg hover:border-primary/50 transition-all duration-300">
                <div className="text-left">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Commercial Moves</div>
                  <div className="text-lg font-bold text-foreground">500+ Completed</div>
                </div>
                <div className="w-12 h-12 bg-primary/20 border border-primary/50 flex items-center justify-center rounded-md">
                  <Award className="w-6 h-6 text-primary" aria-hidden="true" />
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-card/50 border border-border/50 rounded-lg hover:border-secondary/50 transition-all duration-300">
                <div className="text-left">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Customer Satisfaction</div>
                  <div className="text-lg font-bold text-foreground">98% Rating</div>
                </div>
                <div className="w-12 h-12 bg-secondary/20 border border-secondary/50 flex items-center justify-center rounded-md">
                  <Users className="w-6 h-6 text-secondary" aria-hidden="true" />
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-card/50 border border-border/50 rounded-lg hover:border-accent/50 transition-all duration-300">
                <div className="text-left">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Years Experience</div>
                  <div className="text-lg font-bold text-foreground">15+ Years</div>
                </div>
                <div className="w-12 h-12 bg-accent/20 border border-accent/50 flex items-center justify-center rounded-md">
                  <Clock className="w-6 h-6 text-accent" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>

          {/* Maya chat - full width below */}
          <div
            ref={assistantContainerRef}
            className="w-full flex-grow flex flex-col transition-all duration-300 ease-in-out"
          >
            <div className="w-full flex-grow min-h-[400px] sm:min-h-[450px] lg:min-h-[500px]">
              <ErrorBoundary fallback={<QuoteAssistantFallback />}>
                <QuoteAssistant embedded />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
