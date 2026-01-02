"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { MapPin, Loader2, Clock, Route, AlertCircle } from "lucide-react"

interface AddressMapProps {
  originLat?: number
  originLng?: number
  destinationLat?: number
  destinationLng?: number
  originLabel?: string
  destinationLabel?: string
  showRoute?: boolean
  className?: string
  onDistanceCalculated?: (distance: { km: number; text: string; durationMinutes: number; durationText: string }) => void
  onRouteStatusChange?: (status: "idle" | "calculating" | "success" | "error") => void
}

export function AddressMap({
  originLat,
  originLng,
  destinationLat,
  destinationLng,
  originLabel = "From",
  destinationLabel = "To",
  showRoute = true,
  className = "",
  onDistanceCalculated,
  onRouteStatusChange,
}: AddressMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false)
  const [distance, setDistance] = useState<string | null>(null)
  const [distanceKm, setDistanceKm] = useState<number | null>(null)
  const [duration, setDuration] = useState<string | null>(null)
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null)
  const [routeError, setRouteError] = useState<string | null>(null)

  const hasOrigin = originLat !== undefined && originLng !== undefined
  const hasDestination = destinationLat !== undefined && destinationLng !== undefined
  const hasBoth = hasOrigin && hasDestination

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  const calculateRouteDistance = useCallback(async () => {
    if (!hasBoth || !originLat || !originLng || !destinationLat || !destinationLng) return

    setIsCalculatingRoute(true)
    setRouteError(null)
    onRouteStatusChange?.("calculating")

    try {
      const response = await fetch("/api/places/distance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originLat,
          originLng,
          destinationLat,
          destinationLng,
          originAddress: originLabel,
          destinationAddress: destinationLabel,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setDistanceKm(data.distanceKm)
        setDistance(data.distanceText)
        setDurationMinutes(data.durationMinutes)
        setDuration(data.durationText)
        onRouteStatusChange?.("success")

        // Notify parent component
        if (onDistanceCalculated) {
          onDistanceCalculated({
            km: data.distanceKm,
            text: data.distanceText,
            durationMinutes: data.durationMinutes,
            durationText: data.durationText,
          })
        }
      } else {
        // Fallback to haversine
        const d = calculateHaversineDistance(originLat, originLng, destinationLat, destinationLng)
        const mins = Math.round((d / 50) * 60)
        setDistanceKm(d)
        setDistance(`${Math.round(d)} km (est.)`)
        setDurationMinutes(mins)
        setDuration(formatDuration(mins))
        onRouteStatusChange?.("success")

        if (onDistanceCalculated) {
          onDistanceCalculated({
            km: d,
            text: `${Math.round(d)} km`,
            durationMinutes: mins,
            durationText: formatDuration(mins),
          })
        }
      }
    } catch (error) {
      console.error("[v0] Error calculating route:", error)
      const d = calculateHaversineDistance(originLat, originLng, destinationLat, destinationLng)
      const mins = Math.round((d / 50) * 60)
      setDistanceKm(d)
      setDistance(`${Math.round(d)} km (est.)`)
      setDurationMinutes(mins)
      setDuration(formatDuration(mins))
      onRouteStatusChange?.("error")

      if (onDistanceCalculated) {
        onDistanceCalculated({
          km: d,
          text: `${Math.round(d)} km`,
          durationMinutes: mins,
          durationText: formatDuration(mins),
        })
      }
    } finally {
      setIsCalculatingRoute(false)
    }
  }, [
    hasBoth,
    originLat,
    originLng,
    destinationLat,
    destinationLng,
    originLabel,
    destinationLabel,
    onDistanceCalculated,
    onRouteStatusChange,
  ])

  useEffect(() => {
    if (hasBoth) {
      calculateRouteDistance()
    }
  }, [hasBoth, calculateRouteDistance])

  const getMapUrl = () => {
    if (!hasOrigin && !hasDestination) return null

    if (hasBoth && showRoute) {
      const latDiff = Math.abs(originLat! - destinationLat!)
      const lngDiff = Math.abs(originLng! - destinationLng!)
      const padding = Math.max(latDiff, lngDiff) * 0.3 + 0.02
      return `https://www.openstreetmap.org/export/embed.html?bbox=${Math.min(originLng!, destinationLng!) - padding}%2C${Math.min(originLat!, destinationLat!) - padding}%2C${Math.max(originLng!, destinationLng!) + padding}%2C${Math.max(originLat!, destinationLat!) + padding}&layer=mapnik&marker=${originLat}%2C${originLng}`
    } else if (hasOrigin) {
      return `https://www.openstreetmap.org/export/embed.html?bbox=${originLng! - 0.02}%2C${originLat! - 0.02}%2C${originLng! + 0.02}%2C${originLat! + 0.02}&layer=mapnik&marker=${originLat}%2C${originLng}`
    } else if (hasDestination) {
      return `https://www.openstreetmap.org/export/embed.html?bbox=${destinationLng! - 0.02}%2C${destinationLat! - 0.02}%2C${destinationLng! + 0.02}%2C${destinationLat! + 0.02}&layer=mapnik&marker=${destinationLat}%2C${destinationLng}`
    }
    return null
  }

  if (!hasOrigin && !hasDestination) {
    return (
      <div className={`bg-muted/30 rounded-lg p-4 text-center ${className}`}>
        <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Enter addresses to see the route</p>
      </div>
    )
  }

  return (
    <div className={`rounded-lg overflow-hidden border border-border ${className}`}>
      {/* Map Display */}
      <div ref={mapRef} className="relative w-full h-44 bg-muted">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <iframe src={getMapUrl() || undefined} className="w-full h-full border-0" title="Route Map" loading="lazy" />
        )}
      </div>

      {/* Location Info */}
      <div className="p-3 bg-card space-y-2">
        {hasOrigin && (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-green-600">A</span>
            </div>
            <span className="text-foreground truncate text-xs sm:text-sm">{originLabel}</span>
          </div>
        )}

        {hasDestination && (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-red-600">B</span>
            </div>
            <span className="text-foreground truncate text-xs sm:text-sm">{destinationLabel}</span>
          </div>
        )}

        {/* Distance and Duration with loading state */}
        {hasBoth && showRoute && (
          <div className="flex items-center gap-4 pt-2 border-t border-border mt-2">
            {isCalculatingRoute ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Calculating route...</span>
              </div>
            ) : routeError ? (
              <div className="flex items-center gap-2 text-sm text-amber-500">
                <AlertCircle className="h-4 w-4" />
                <span>Route estimate pending</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5 text-sm">
                  <Route className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">{distance || "..."}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{duration ? `~${duration}` : "..."}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Haversine formula
function calculateHaversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c * 1.3
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours} hr${hours > 1 ? "s" : ""}`
  return `${hours} hr ${mins} min`
}
