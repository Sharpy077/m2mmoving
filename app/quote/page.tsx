"use client"

import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { QuoteAssistant } from "@/components/quote-assistant"
import { Shield, Clock, CheckCircle2, Phone, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Breadcrumbs } from "@/components/breadcrumbs"

function QuotePageContent() {
  return (
    <main className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <Breadcrumbs items={[{ label: "Get Quote" }]} className="mb-6" />
            <div className="grid lg:grid-cols-3 gap-8 mb-8">
              <div className="lg:col-span-2">
                <div className="flex items-center gap-2 text-primary font-mono text-sm mb-2">
                  <span className="w-2 h-2 bg-primary animate-pulse" />
                  MAYA_ASSISTANT_v2.0
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
                  Chat with <span className="text-primary">Maya</span>
                </h1>
                <p className="text-muted-foreground text-lg mb-6">
                  Get your custom quote through our AI assistant Maya. She'll guide you through the entire booking
                  process - from quote to confirmation - in a natural conversation.
                </p>

                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="w-4 h-4 text-primary" />
                    <span>$10M+ Insurance</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 text-secondary" />
                    <span>24hr Response</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-accent" />
                    <span>No Obligation</span>
                  </div>
                </div>
              </div>

              <div className="border border-border bg-card p-4 space-y-3">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-3">
                  Prefer to talk?
                </p>
                <Button variant="outline" className="w-full bg-transparent mb-3" asChild>
                  <a href="tel:+61388201801" className="flex items-center justify-center gap-2">
                    <Phone className="w-4 h-4" />
                    (03) 8820 1801
                  </a>
                </Button>
                <p className="text-xs text-muted-foreground text-center">Mon-Fri 8am-6pm AEST</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                  <MapPin className="w-4 h-4" />
                  Melbourne HQ
                </div>
              </div>
            </div>

            <div className="border border-border rounded-lg overflow-hidden bg-card min-h-[600px]">
              <QuoteAssistant isOpen={true} />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}

export default function QuotePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading Maya assistant...</p>
          </div>
        </main>
      }
    >
      <QuotePageContent />
    </Suspense>
  )
}
