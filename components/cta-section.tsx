"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, Phone, Mail, Clock, CheckCircle2, Loader2, Sparkles } from "lucide-react"
import { submitLead } from "@/app/actions/leads"

export function CTASection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const scrollToAssistant = () => {
    document.getElementById("quote-assistant")?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email) return

    setIsSubmitting(true)
    try {
      await submitLead({
        lead_type: "contact_form",
        email: formData.email,
        phone: formData.phone || undefined,
        contact_name: formData.name || undefined,
        notes: formData.message || undefined,
      })
      setSubmitted(true)
    } catch (error) {
      console.error("[v0] Contact form submission error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="contact" className="py-16 md:py-24 bg-card border-y border-border">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 max-w-16 bg-primary" />
              <span className="text-xs uppercase tracking-widest text-primary font-mono">// Get Started</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              READY TO
              <br />
              <span className="text-primary">RELOCATE?</span>
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg">
              Get a custom quote for your commercial move. Our AI assistant can help you get an instant estimate, or
              speak with our team directly.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button size="lg" className="uppercase tracking-wider group" onClick={scrollToAssistant}>
                <Sparkles className="w-4 h-4 mr-2" />
                AI Quote Assistant
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" className="uppercase tracking-wider bg-transparent" asChild>
                <a href="tel:+61388201801">
                  <Phone className="w-4 h-4 mr-2" />
                  (03) 8820 1801
                </a>
              </Button>
            </div>

            {/* Contact Info Cards */}
            <div className="space-y-4">
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
                  <Clock className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Response Time</div>
                  <div className="text-lg font-bold text-foreground">Under 24 Hours</div>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-primary/30 bg-background p-6">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="w-5 h-5 text-primary" />
              <span className="text-xs uppercase tracking-widest text-primary font-mono">Request Callback</span>
            </div>

            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto border-2 border-secondary flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-secondary" />
                </div>
                <h3 className="text-xl font-bold text-secondary mb-2">Request Received!</h3>
                <p className="text-muted-foreground">We'll call you back within the hour during business hours.</p>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-foreground mb-2">Prefer a Human?</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Leave your details and our team will contact you within the hour.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Input
                      placeholder="Your name"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      className="h-12 bg-card border-border"
                    />
                  </div>
                  <div>
                    <Input
                      type="email"
                      placeholder="Email address *"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                      className="h-12 bg-card border-border"
                    />
                  </div>
                  <div>
                    <Input
                      type="tel"
                      placeholder="Phone number"
                      value={formData.phone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                      className="h-12 bg-card border-border"
                    />
                  </div>
                  <div>
                    <textarea
                      placeholder="Tell us about your move (optional)"
                      rows={3}
                      value={formData.message}
                      onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                      className="w-full px-3 py-3 bg-card border border-border text-foreground placeholder:text-muted-foreground resize-none"
                    />
                  </div>
                  <Button type="submit" className="w-full h-12 uppercase tracking-wider" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Request Callback
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  We respect your privacy. No spam, ever.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
