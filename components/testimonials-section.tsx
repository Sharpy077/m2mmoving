import { Card, CardContent } from "@/components/ui/card"
import { MessageSquare } from "lucide-react"

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
          <p className="text-muted-foreground max-w-2xl">Client testimonials and feedback from completed operations.</p>
        </div>

        <Card className="bg-card border-dashed border-2 border-border">
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-none bg-muted flex items-center justify-center mb-6">
              <MessageSquare className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="inline-block px-3 py-1 bg-accent/20 text-accent text-xs font-mono uppercase tracking-wider mb-4">
              Coming Soon
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Client Testimonials</h3>
            <p className="text-muted-foreground max-w-md">
              We're currently completing our first missions. Check back soon for verified feedback from our clients.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
