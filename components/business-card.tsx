"use client"

import { Truck, Phone, Mail, Globe, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

interface BusinessCardProps {
  name?: string
  title?: string
  phone?: string
  email?: string
  website?: string
  address?: string
  className?: string
  variant?: "front" | "back"
}

export function BusinessCard({
  name = "M&M Commercial Moving",
  title = "Commercial Relocation Specialists",
  phone = "03 8820 1801",
  email = "sales@m2mmoving.au",
  website = "www.m2mmoving.au",
  address,
  className,
  variant = "front",
}: BusinessCardProps) {
  if (variant === "back") {
    return (
      <div
        className={cn(
          "relative w-[350px] h-[200px] bg-card border-2 border-border rounded-lg overflow-hidden",
          "print:w-[3.5in] print:h-[2in] print:border-0",
          className
        )}
      >
        {/* Grid background pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(to right, var(--primary) 1px, transparent 1px),
                              linear-gradient(to bottom, var(--primary) 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-center items-center p-6 text-center">
          <div className="w-16 h-16 bg-primary flex items-center justify-center mb-4">
            <Truck className="w-8 h-8 text-primary-foreground" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">
            M&M<span className="text-primary">_MOVING</span>
          </h3>
          <p className="text-xs text-muted-foreground font-mono mb-4">
            Tech-Powered Business Relocation
          </p>
          <div className="w-full h-px bg-border mb-4" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Melbourne's commercial moving specialists.
            <br />
            Office relocations, data centres, and IT equipment.
            <br />
            Zero downtime. Real-time tracking.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative w-[350px] h-[200px] bg-card border-2 border-border rounded-lg overflow-hidden",
        "print:w-[3.5in] print:h-[2in] print:border-0",
        className
      )}
    >
      {/* Grid background pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(to right, var(--primary) 1px, transparent 1px),
                            linear-gradient(to bottom, var(--primary) 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
      />

      {/* Accent lines */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
      <div className="absolute bottom-0 left-0 w-24 h-1 bg-primary" />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary flex items-center justify-center flex-shrink-0">
              <Truck className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground leading-tight">
                M&M<span className="text-primary">_MOVING</span>
              </h2>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mt-0.5">
                {title}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="w-2 h-2 bg-secondary animate-pulse" />
            <span className="text-[8px] text-muted-foreground font-mono uppercase">Online</span>
          </div>
        </div>

        {/* Contact Info */}
        <div className="flex-1 flex flex-col justify-end gap-2">
          {name && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-accent/20 border border-accent/50 flex items-center justify-center flex-shrink-0">
                <div className="w-1.5 h-1.5 bg-accent" />
              </div>
              <span className="text-sm font-semibold text-foreground">{name}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <a
              href={`tel:+${phone.replace(/\s/g, "")}`}
              className="text-xs text-muted-foreground font-mono hover:text-primary transition-colors"
            >
              {phone}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-secondary flex-shrink-0" />
            <a
              href={`mailto:${email}`}
              className="text-xs text-muted-foreground font-mono hover:text-secondary transition-colors break-all"
            >
              {email}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-accent flex-shrink-0" />
            <a
              href={`https://${website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground font-mono hover:text-accent transition-colors"
            >
              {website}
            </a>
          </div>
          {address && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground font-mono">{address}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
