"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Phone, Calculator } from "lucide-react"

export function FloatingCTA() {
  const [isVisible, setIsVisible] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling 300px
      setIsVisible(window.scrollY > 300)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToAssistant = () => {
    document.getElementById("quote-assistant")?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  if (!isVisible) return null

  return (
    <>
      {/* Desktop Floating Widget */}
      <div className="hidden md:block fixed bottom-6 right-6 z-50">
        {isExpanded ? (
          <div className="bg-card border border-primary/30 shadow-lg w-72 animate-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="text-xs uppercase tracking-widest text-primary font-mono">Quick Actions</span>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {/* Placeholder for icon */}
              </button>
            </div>
            <div className="p-4 space-y-3">
              <Button className="w-full justify-start gap-3" onClick={scrollToAssistant}>
                <Calculator className="w-4 h-4" />
                Get Instant Quote
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 bg-transparent" asChild>
                <a href="tel:+61388201801">{/* Placeholder for icon */}</a>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 bg-transparent" asChild>
                <a href="mailto:sales@m2mmoving.au">{/* Placeholder for icon */}</a>
              </Button>
            </div>
            <div className="px-4 pb-4">
              <p className="text-xs text-muted-foreground text-center">Typically respond within 2 hours</p>
            </div>
          </div>
        ) : (
          <Button onClick={() => setIsExpanded(true)} size="lg" className="h-14 px-6 shadow-lg group">
            <span className="uppercase tracking-wider">Get Quote</span>
            {/* Placeholder for icon */}
          </Button>
        )}
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border p-3 flex gap-2">
        <Button className="flex-1 h-12" onClick={scrollToAssistant}>
          <Calculator className="w-4 h-4 mr-2" />
          Get Quote
        </Button>
        <Button variant="outline" className="h-12 px-4 bg-transparent" asChild>
          <a href="tel:+61388201801">
            <Phone className="w-5 h-5" />
          </a>
        </Button>
      </div>
    </>
  )
}
