import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomQuoteForm } from "@/components/custom-quote-form"

export default function CustomQuotePage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center gap-2 text-secondary font-mono text-sm mb-2">
                <span className="w-2 h-2 bg-secondary animate-pulse" />
                CUSTOM_REQUEST_PROTOCOL
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
                Request <span className="text-secondary">Custom Quote</span>
              </h1>
              <p className="text-muted-foreground text-lg">
                For complex relocations, specialized equipment, or unique requirements. Our team will prepare a tailored
                proposal within 24 hours.
              </p>
            </div>
            <CustomQuoteForm />
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
