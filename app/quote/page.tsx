import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { QuoteBuilder } from "@/components/quote-builder"

export default function QuotePage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center gap-2 text-primary font-mono text-sm mb-2">
                <span className="w-2 h-2 bg-primary animate-pulse" />
                QUOTE_GENERATOR_v2.0
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
                Build Your <span className="text-primary">Quote</span>
              </h1>
              <p className="text-muted-foreground text-lg">
                Configure your commercial move specifications below. Our system will calculate an instant estimate based
                on your requirements.
              </p>
            </div>
            <QuoteBuilder />
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
