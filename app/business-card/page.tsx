"use client"

import { BusinessCard } from "@/components/business-card"
import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"
import { useState } from "react"
import "./print.css"

export default function BusinessCardPage() {
  const [showBack, setShowBack] = useState(false)

  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      <main className="min-h-screen bg-background py-12 px-4 no-print">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Business <span className="text-primary">Card</span>
            </h1>
            <p className="text-muted-foreground">Print-ready business cards matching your website theme</p>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4 mb-8">
            <Button onClick={() => setShowBack(false)} variant={!showBack ? "default" : "outline"}>
              Front Side
            </Button>
            <Button onClick={() => setShowBack(true)} variant={showBack ? "default" : "outline"}>
              Back Side
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              Print
            </Button>
          </div>

          {/* Card Display */}
          <div className="flex flex-col items-center gap-8">
            <BusinessCard variant={showBack ? "back" : "front"} />
          </div>

          {/* Instructions */}
          <div className="mt-12 p-6 bg-card border border-border rounded-lg">
            <h2 className="text-lg font-semibold text-foreground mb-4">Printing Instructions</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Standard business card size: 3.5" × 2"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Use cardstock paper (90-110 lb) for best results</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Print front side first, then flip and print back side</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Ensure "Fit to page" is disabled in print settings</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Use "More settings" → "Scale" → "100%" for accurate sizing</span>
              </li>
            </ul>
          </div>

          {/* Customization Note */}
          <div className="mt-6 p-4 bg-muted/50 border border-border rounded-lg">
            <p className="text-xs text-muted-foreground font-mono">
              <span className="text-primary">//</span> To customize name, title, or contact info, edit the{" "}
              <code className="text-foreground bg-background px-1 py-0.5 rounded">BusinessCard</code> component
              props in <code className="text-foreground bg-background px-1 py-0.5 rounded">/components/business-card.tsx</code>
            </p>
          </div>
        </div>
      </main>

      {/* Print Layout - Hidden on screen, visible when printing */}
      <div className="print-only">
        <div className="print-grid">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="print-card">
              <BusinessCard variant={showBack ? "back" : "front"} />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
