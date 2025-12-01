"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X, Truck, Phone } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const navLinks = [
  { name: "Services", href: "/#services" },
  { name: "Technology", href: "/#technology" },
  { name: "Contact", href: "/#contact" },
]

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  const handleNavClick = (href: string) => {
    setIsOpen(false)
    
    if (href.startsWith('#')) {
      // Small delay to allow menu to close before scrolling
      setTimeout(() => {
        const element = document.querySelector(href)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary flex items-center justify-center">
              <Truck className="w-6 h-6 text-primary-foreground" aria-hidden="true" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              M&M<span className="text-primary">_MOVING</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider"
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <a
              href="tel:+61388201801"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Phone className="w-4 h-4" aria-hidden="true" />
              <span className="font-mono">03 8820 1801</span>
            </a>
            <Button className="uppercase tracking-wider" asChild>
              <Link href="/quote">Free Quote</Link>
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden text-foreground" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
            {isOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
          </button>
        </nav>

        {/* Mobile Navigation */}
        <div className={cn(
          "md:hidden overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}>
          <div className="py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider"
                  onClick={(e) => {
                    if (link.href.startsWith('#')) {
                      e.preventDefault()
                      handleNavClick(link.href)
                    } else {
                      setIsOpen(false)
                    }
                  }}
                >
                  {link.name}
                </Link>
              ))}
              <a
                href="tel:+61388201801"
                className="flex items-center gap-2 text-sm font-medium text-primary"
                onClick={() => setIsOpen(false)}
              >
                <Phone className="w-4 h-4" aria-hidden="true" />
                03 8820 1801
              </a>
              <Button className="uppercase tracking-wider w-full mt-2" asChild>
                <Link href="/quote" onClick={() => setIsOpen(false)}>Get Free Quote</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
