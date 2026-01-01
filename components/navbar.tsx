"use client"

import { useState, useEffect } from "react"
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
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleNavClick = (href: string) => {
    setIsOpen(false)

    if (href.startsWith("#")) {
      setTimeout(() => {
        const element = document.querySelector(href)
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      }, 100)
    }
  }

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-background/95 backdrop-blur-md border-b border-border shadow-sm"
          : "bg-background/80 backdrop-blur-sm border-b border-transparent",
      )}
    >
      <div className="container mx-auto px-3 sm:px-4 lg:px-6">
        <nav className="flex items-center justify-between h-14 sm:h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary flex items-center justify-center">
              <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" aria-hidden="true" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              M&M<span className="text-primary">_MOVING</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
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

          <div className="hidden md:flex items-center gap-3 lg:gap-4">
            <a
              href="tel:+61388201801"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Phone className="w-4 h-4" aria-hidden="true" />
              <span className="font-mono hidden lg:inline">03 8820 1801</span>
            </a>
            <Button className="uppercase tracking-wider text-xs sm:text-sm" asChild>
              <Link href="/quote">Free Quote</Link>
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-foreground p-2 -mr-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
          </button>
        </nav>

        <div
          className={cn(
            "md:hidden overflow-hidden transition-all duration-300 ease-in-out",
            isOpen ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <div className="py-4 border-t border-border">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors uppercase tracking-wider px-3 py-3 rounded-lg"
                  onClick={(e) => {
                    if (link.href.startsWith("#")) {
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
                className="flex items-center gap-2 text-sm font-medium text-primary px-3 py-3 rounded-lg hover:bg-muted/50 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Phone className="w-4 h-4" aria-hidden="true" />
                03 8820 1801
              </a>
              <div className="mt-3 px-3">
                <Button className="uppercase tracking-wider w-full" asChild>
                  <Link href="/quote" onClick={() => setIsOpen(false)}>
                    Get Free Quote
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
