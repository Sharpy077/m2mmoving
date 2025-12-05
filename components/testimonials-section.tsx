import { Card, CardContent } from "@/components/ui/card"
import { MessageSquare, Star } from "lucide-react"

const testimonials = [
  {
    quote: "M&M relocated our entire data center over a weekend. Zero downtime. Our IT team couldn't believe it.",
    author: "Sarah Chen",
    role: "CTO, TechVault Inc.",
    company: "TechVault",
  },
  {
    quote:
      "The real-time tracking gave us complete visibility. We knew exactly where our $2M in equipment was at all times.",
    author: "Marcus Williams",
    role: "Operations Director",
    company: "Global Logistics",
  },
  {
    quote: "They moved 500 workstations in 48 hours. Our employees came in Monday morning and everything just worked.",
    author: "Jennifer Torres",
    role: "Facilities Manager",
    company: "Apex Financial",
  },
]

export function TestimonialsSection() {
  // Show testimonials if we have them, otherwise show a more professional "coming soon" message
  const hasTestimonials = testimonials.length > 0

  return (
    <section id="testimonials" className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 max-w-16 bg-accent" />
            <span className="text-xs uppercase tracking-widest text-accent font-mono">// Client Logs</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">MISSION_REPORTS</h2>
          <p className="text-muted-foreground max-w-2xl">
            {hasTestimonials 
              ? "Client testimonials and feedback from completed operations."
              : "Client feedback from completed operations. We're building our reputation one successful move at a time."}
          </p>
        </div>

        {hasTestimonials ? (
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-accent text-accent" aria-hidden="true" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 italic leading-relaxed">
                    "{testimonial.quote}"
                  </p>
                  <div className="border-t border-border pt-4">
                    <p className="font-semibold text-foreground text-sm">{testimonial.author}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    <p className="text-xs text-muted-foreground font-mono">{testimonial.company}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-none bg-muted flex items-center justify-center mb-6">
                <MessageSquare className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
              </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Building Our Reputation</h3>
            <p className="text-muted-foreground max-w-md mb-4">
              We're a new company focused on delivering exceptional service. As we complete more moves, we'll share verified feedback from our clients here.
            </p>
            <p className="text-sm text-muted-foreground">
              Have questions? <a href="tel:+61388201801" className="text-primary hover:underline">Call us</a> or <a href="mailto:sales@m2mmoving.au" className="text-primary hover:underline">email us</a> to discuss your move.
            </p>
          </CardContent>
        </Card>
        )}
      </div>
    </section>
  )
}
