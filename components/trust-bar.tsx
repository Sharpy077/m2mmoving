"use client"

import { Building2, CheckCircle2, Shield, Star } from "lucide-react"

const trustPoints = [
  { icon: Shield, text: "Fully Licensed & Insured" },
  { icon: CheckCircle2, text: "100% Satisfaction Rate" },
  { icon: Star, text: "5-Star Service" },
  { icon: Building2, text: "Commercial Specialists" },
]

export function TrustBar() {
  return (
    <section className="py-6 bg-primary/5 border-y border-primary/20">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {trustPoints.map((point, index) => {
            const Icon = point.icon
            return (
              <div key={index} className="flex items-center gap-2 text-sm">
                <Icon className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground font-medium">{point.text}</span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
