"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Zap, Target, Phone, MessageSquare } from "lucide-react"
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
      className="relative w-full pt-16 pb-12 sm:pt-20 sm:pb-16 md:pt-28 md:pb-24 overflow-hidden"
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

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
          {/* Left column - Hero content */}
          <div className="flex-1 w-full lg:max-w-xl">
            {/* Status badge */}
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-card border border-border mb-4 sm:mb-6">
              <div className="w-2 h-2 bg-secondary animate-pulse" />
              <span className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground font-mono">
                System Active // Commercial Operations Online
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4 sm:mb-6 text-balance">
              <span className="text-foreground">Get Your Office</span>
              <br />
              <span className="text-primary">Moved Fast</span>
              <span className="text-foreground">_</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-xl mb-6 sm:mb-8 leading-relaxed">
              Melbourne's commercial moving specialists. Office relocations, data centres, and IT equipment handled with
              precision. <span className="text-foreground font-semibold">Free instant quotes via AI or phone.</span>
            </p>

            {/* CTA Buttons - visible on mobile, hidden on desktop where chat is visible */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8 lg:hidden">
              <Button
                size="lg"
                className="uppercase tracking-wider group text-base sm:text-lg min-h-[48px] sm:min-h-[52px] w-full sm:w-auto px-4 sm:px-6"
                onClick={scrollToAssistant}
              >
                Get Free Quote
                <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="uppercase tracking-wider bg-transparent min-h-[48px] sm:min-h-[52px] w-full sm:w-auto px-4 sm:px-6 text-base sm:text-lg"
                asChild
              >
                <a href="tel:+61388201801" className="flex items-center justify-center gap-2">
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                  03 8820 1801
                </a>
              </Button>
            </div>

            {/* Feature badges */}
            <div className="flex flex-col xs:flex-row xs:flex-wrap gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/20 border border-primary/50 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
                    Fully Insured
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-foreground">$10M+ Coverage</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-secondary/20 border border-secondary/50 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
                    Fast Turnaround
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-foreground">24-48 Hours</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-accent/20 border border-accent/50 flex items-center justify-center flex-shrink-0">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 text-accent" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
                    Track Record
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-foreground">$0 Damage Claims</div>
                </div>
              </div>
            </div>

            {/* Stats bar */}
            <div className="pt-4 sm:pt-6 border-t border-border/50">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">500+</span>
                  <span>Commercial Moves</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">98%</span>
                  <span>Customer Satisfaction</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">15+</span>
                  <span>Years Experience</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right column - Quote Assistant */}
          <div ref={assistantContainerRef} className="w-full lg:flex-1 lg:max-w-lg xl:max-w-xl">
            <ErrorBoundary fallback={<QuoteAssistantFallback />}>
              <QuoteAssistant embedded />
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </section>
  )
}
