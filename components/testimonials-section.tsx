import { Card, CardContent } from "@/components/ui/card"
import { Quote } from "lucide-react"

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
            Verified feedback from completed operations. Our clients speak for our results.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="bg-card">
              <CardContent className="pt-6">
                <Quote className="w-8 h-8 text-primary/50 mb-4" />
                <blockquote className="text-foreground mb-6 leading-relaxed">"{testimonial.quote}"</blockquote>
                <div className="border-t border-border pt-4">
                  <div className="font-bold text-foreground">{testimonial.author}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  <div className="text-xs text-primary font-mono mt-1">@{testimonial.company}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
