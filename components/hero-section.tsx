"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Shield, Zap, Target, Phone, MessageSquare } from "lucide-react"
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
      className="relative w-full min-h-screen pt-20 pb-8 sm:pt-24 sm:pb-12 lg:pt-28 lg:pb-16 overflow-hidden"
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

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 relative z-10 h-full">
        <div className="flex flex-col gap-6 lg:gap-8 h-full">
          {/* Hero content - full width on desktop, uses grid for better space utilization */}
          <div className="w-full max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto lg:mx-0 text-center lg:text-left">
            {/* Status badge */}
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-card border border-border mb-4 sm:mb-6 transition-all duration-300">
              <div className="w-2 h-2 bg-secondary animate-pulse" />
              <span className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground font-mono">
                System Active // Commercial Operations Online
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight mb-4 sm:mb-6 text-balance transition-all duration-300">
              <span className="text-foreground">Get Your Office</span>
              <br />
              <span className="text-primary">Moved Fast</span>
              <span className="text-foreground">_</span>
            </h1>

            <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-muted-foreground max-w-xl lg:max-w-2xl mx-auto lg:mx-0 mb-4 sm:mb-6 leading-relaxed transition-all duration-300">
              Melbourne's commercial moving specialists. Office relocations, data centres, and IT equipment handled with
              precision. <span className="text-foreground font-semibold">Free instant quotes via AI or phone.</span>
            </p>

            <div className="flex flex-wrap justify-center lg:justify-start gap-4 sm:gap-6 lg:gap-8 mb-4 transition-all duration-300">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-primary/20 border border-primary/50 flex items-center justify-center transition-all duration-300">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-primary" aria-hidden="true" />
                </div>
                <div className="text-left">
                  <div className="text-[9px] sm:text-xs lg:text-sm text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    Fully Insured
                  </div>
                  <div className="text-xs sm:text-sm lg:text-base font-bold text-foreground whitespace-nowrap">
                    $10M+ Coverage
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-secondary/20 border border-secondary/50 flex items-center justify-center transition-all duration-300">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-secondary" aria-hidden="true" />
                </div>
                <div className="text-left">
                  <div className="text-[9px] sm:text-xs lg:text-sm text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    Fast Turnaround
                  </div>
                  <div className="text-xs sm:text-sm lg:text-base font-bold text-foreground whitespace-nowrap">
                    24-48 Hours
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-accent/20 border border-accent/50 flex items-center justify-center transition-all duration-300">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-accent" aria-hidden="true" />
                </div>
                <div className="text-left">
                  <div className="text-[9px] sm:text-xs lg:text-sm text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    Track Record
                  </div>
                  <div className="text-xs sm:text-sm lg:text-base font-bold text-foreground whitespace-nowrap">
                    $0 Damage Claims
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            ref={assistantContainerRef}
            className="w-full max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto lg:mx-0 flex-grow transition-all duration-300 ease-in-out"
          >
            <div className="w-full h-full min-h-[50vh] sm:min-h-[450px] lg:min-h-[500px] xl:min-h-[550px]">
              <ErrorBoundary fallback={<QuoteAssistantFallback />}>
                <QuoteAssistant embedded />
              </ErrorBoundary>
            </div>
          </div>

          <div className="hidden sm:block w-full max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto lg:mx-0 pt-4 border-t border-border/50 transition-all duration-300">
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 lg:gap-8 text-xs sm:text-sm lg:text-base text-muted-foreground">
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
      </div>
    </section>
  )
}
