import { Button } from "@/components/ui/button"
import { ArrowRight, Phone, Mail, MapPin } from "lucide-react"
import Link from "next/link"

export function CTASection() {
  return (
    <section id="contact" className="py-16 md:py-24 bg-card border-y border-border">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 max-w-16 bg-primary" />
              <span className="text-xs uppercase tracking-widest text-primary font-mono">// Initialize Contact</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              READY TO
              <br />
              <span className="text-primary">RELOCATE?</span>
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg">
              Get a custom quote for your commercial move. Our team will analyze your requirements and deliver a
              precision-engineered relocation plan.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="uppercase tracking-wider group" asChild>
                <Link href="/quote">
                  Get Quote
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="uppercase tracking-wider bg-transparent" asChild>
                <a href="tel:+61388201801">Call Now</a>
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <a
              href="tel:+61388201801"
              className="flex items-center gap-4 p-4 border border-border bg-background hover:border-primary/50 transition-colors"
            >
              <div className="w-12 h-12 bg-primary/10 border border-primary/30 flex items-center justify-center">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Direct Line</div>
                <div className="text-lg font-bold text-foreground">(03) 8820 1801</div>
              </div>
            </a>

            <a
              href="mailto:sales@m2mmoving.au"
              className="flex items-center gap-4 p-4 border border-border bg-background hover:border-secondary/50 transition-colors"
            >
              <div className="w-12 h-12 bg-secondary/10 border border-secondary/30 flex items-center justify-center">
                <Mail className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Email</div>
                <div className="text-lg font-bold text-foreground">sales@m2mmoving.au</div>
              </div>
            </a>

            <div className="flex items-center gap-4 p-4 border border-border bg-background">
              <div className="w-12 h-12 bg-accent/10 border border-accent/30 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-accent" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">HQ Location</div>
                <div className="text-lg font-bold text-foreground">Melbourne, VIC</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
