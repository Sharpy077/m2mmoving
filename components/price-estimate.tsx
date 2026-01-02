"use client"

import { useState, useEffect } from "react"
import { Calculator, ChevronDown, ChevronUp, Loader2, DollarSign, Info } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PriceBreakdown {
  label: string
  amount: number
  description?: string
}

interface PriceEstimateProps {
  distanceKm: number
  squareMeters?: number
  stairsFlights?: number
  specialItems?: {
    piano?: boolean
    poolTable?: boolean
    heavyItems?: number
  }
  packingHours?: number
  moveDate?: Date
  className?: string
  onPriceCalculated?: (total: number, deposit: number) => void
}

export function PriceEstimate({
  distanceKm,
  squareMeters = 0,
  stairsFlights = 0,
  specialItems = {},
  packingHours = 0,
  moveDate,
  className = "",
  onPriceCalculated,
}: PriceEstimateProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [pricing, setPricing] = useState<{
    total: number
    depositAmount: number
    breakdown: PriceBreakdown[]
    config: { name: string; baseDistanceKm: number; perKmRate: number }
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Determine if weekend/holiday
  const isWeekend = moveDate ? [0, 6].includes(moveDate.getDay()) : false

  useEffect(() => {
    if (distanceKm <= 0) return

    const calculatePrice = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/pricing/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            distanceKm,
            squareMeters,
            stairsFlights,
            specialItems,
            packingHours,
            moveDate: moveDate?.toISOString(),
            isWeekend,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to calculate price")
        }

        const data = await response.json()
        setPricing(data)

        if (onPriceCalculated) {
          onPriceCalculated(data.total, data.depositAmount)
        }
      } catch (err) {
        console.error("[v0] Price calculation error:", err)
        setError("Unable to calculate price. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    calculatePrice()
  }, [distanceKm, squareMeters, stairsFlights, specialItems, packingHours, moveDate, isWeekend, onPriceCalculated])

  if (distanceKm <= 0) {
    return null
  }

  return (
    <div className={`rounded-lg border border-border bg-card overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-primary/10 px-4 py-3 flex items-center gap-2">
        <Calculator className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Price Estimate</h3>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
            <span className="text-muted-foreground">Calculating your quote...</span>
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <p className="text-destructive text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 bg-transparent"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        ) : pricing ? (
          <div className="space-y-4">
            {/* Total Price */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Estimated Total</p>
              <div className="flex items-center justify-center gap-1">
                <DollarSign className="h-8 w-8 text-primary" />
                <span className="text-4xl font-bold text-foreground">
                  {pricing.total.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">GST inclusive</p>
            </div>

            {/* Deposit Info */}
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-sm">
                <span className="text-muted-foreground">Deposit to secure booking: </span>
                <span className="font-semibold text-foreground">
                  ${pricing.depositAmount.toLocaleString("en-AU", { minimumFractionDigits: 0 })}
                </span>
              </p>
            </div>

            {/* Breakdown Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowBreakdown(!showBreakdown)}
            >
              {showBreakdown ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Hide breakdown
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  View breakdown
                </>
              )}
            </Button>

            {/* Price Breakdown */}
            {showBreakdown && (
              <div className="space-y-2 pt-2 border-t border-border">
                {pricing.breakdown.map((item, index) => (
                  <div key={index} className="flex items-start justify-between text-sm">
                    <div className="flex-1">
                      <span className="text-foreground">{item.label}</span>
                      {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                    </div>
                    <span className="font-medium text-foreground ml-4">
                      ${item.amount.toLocaleString("en-AU", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Disclaimer */}
            <div className="flex items-start gap-2 pt-3 border-t border-border">
              <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                This is an estimate based on the information provided. Final price may vary based on actual inventory
                and conditions on moving day.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
