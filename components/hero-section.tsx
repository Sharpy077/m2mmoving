"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, Shield, Zap, Target, Phone, CheckCircle2, Clock, Building2 } from "lucide-react"
import Link from "next/link"

export function HeroSection() {
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email && !phone) return
    // Quick lead capture - redirect to full quote with prefilled data
    const params = new URLSearchParams()
    if (email) params.set("email", email)
    if (phone) params.set("phone", phone)
    window.location.href = `/quote?${params.toString()}`
  }

  return (
    <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 overflow-hidden">
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
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 mb-6">
              <Clock className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-xs uppercase tracking-widest text-primary font-mono">
                Limited Availability This Week
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-balance">
              <span className="text-foreground">Get Your Office</span>
              <br />
              <span className="text-primary">Moved Fast</span>
              <span className="text-foreground">_</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-8 leading-relaxed">
              Melbourne's commercial moving specialists. Office relocations, data centres, and IT equipment handled with
              precision. <span className="text-foreground font-semibold">Free instant quotes in 60 seconds.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button size="lg" className="uppercase tracking-wider group text-lg h-14" asChild>
                <Link href="/quote">
                  Get Free Quote
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
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

          <div className="lg:mt-0">
            <div className="border border-primary/30 bg-card/80 backdrop-blur-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-primary" />
                <span className="text-xs uppercase tracking-widest text-primary font-mono">Quick Quote Request</span>
              </div>

              <h3 className="text-xl font-bold text-foreground mb-2">Get Your Free Quote</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Enter your details and we'll send you a custom quote within 24 hours.
              </p>

              <form onSubmit={handleQuickSubmit} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Your work email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 bg-background border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div>
                  <Input
                    type="tel"
                    placeholder="Phone number (optional)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-12 bg-background border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 uppercase tracking-wider text-base"
                  disabled={!email && !phone}
                >
                  Get Instant Quote
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </form>

              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <CheckCircle2 className="w-4 h-4 text-secondary" />
                  <span>No obligation quote</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <CheckCircle2 className="w-4 h-4 text-secondary" />
                  <span>Response within 24 hours</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-secondary" />
                  <span>Price match guarantee</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
