"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X, Truck } from "lucide-react"
import Link from "next/link"

const navLinks = [
  { name: "Services", href: "/#services" },
  { name: "Technology", href: "/#technology" },
  { name: "Testimonials", href: "/#testimonials" },
  { name: "Contact", href: "/#contact" },
]

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary flex items-center justify-center">
              <Truck className="w-6 h-6 text-primary-foreground" />
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

          <div className="hidden md:block">
            <Button className="uppercase tracking-wider" asChild>
              <Link href="/quote">Get Quote</Link>
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden text-foreground" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider"
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <Button className="uppercase tracking-wider w-full mt-2" asChild>
                <Link href="/quote">Get Quote</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
