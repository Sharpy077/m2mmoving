"use client"

import { useEffect, useRef, useState } from "react"
import { MapPin, Navigation2, Loader2 } from "lucide-react"

interface AddressMapProps {
  originLat?: number
  originLng?: number
  destinationLat?: number
  destinationLng?: number
  originLabel?: string
  destinationLabel?: string
  showRoute?: boolean
  className?: string
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
}: AddressMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [distance, setDistance] = useState<string | null>(null)
  const [duration, setDuration] = useState<string | null>(null)

  // Check if we have coordinates
  const hasOrigin = originLat !== undefined && originLng !== undefined
  const hasDestination = destinationLat !== undefined && destinationLng !== undefined
  const hasBoth = hasOrigin && hasDestination

  useEffect(() => {
    // Simulate map loading
    const timer = setTimeout(() => setIsLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  // Calculate estimated distance (simplified haversine formula for display)
  useEffect(() => {
    if (hasBoth && originLat && originLng && destinationLat && destinationLng) {
      const R = 6371 // Earth's radius in km
      const dLat = ((destinationLat - originLat) * Math.PI) / 180
      const dLon = ((destinationLng - originLng) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((originLat * Math.PI) / 180) *
          Math.cos((destinationLat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      const d = R * c

      setDistance(`${Math.round(d)} km`)
      // Rough estimate: 60km/h average speed for commercial moving
      const hours = d / 60
      if (hours < 1) {
        setDuration(`${Math.round(hours * 60)} min`)
      } else {
        setDuration(`${Math.round(hours * 10) / 10} hrs`)
      }
    }
  }, [hasBoth, originLat, originLng, destinationLat, destinationLng])

  // Generate static map URL (works without API key for basic display)
  const getMapUrl = () => {
    if (!hasOrigin && !hasDestination) return null

    const markers: string[] = []
    if (hasOrigin) {
      markers.push(`markers=color:green%7Clabel:A%7C${originLat},${originLng}`)
    }
    if (hasDestination) {
      markers.push(`markers=color:red%7Clabel:B%7C${destinationLat},${destinationLng}`)
    }

    // Use OpenStreetMap static image as fallback (no API key needed)
    if (hasBoth) {
      const centerLat = (originLat! + destinationLat!) / 2
      const centerLng = (originLng! + destinationLng!) / 2
      return `https://www.openstreetmap.org/export/embed.html?bbox=${Math.min(originLng!, destinationLng!) - 0.1}%2C${Math.min(originLat!, destinationLat!) - 0.1}%2C${Math.max(originLng!, destinationLng!) + 0.1}%2C${Math.max(originLat!, destinationLat!) + 0.1}&layer=mapnik&marker=${centerLat}%2C${centerLng}`
    } else if (hasOrigin) {
      return `https://www.openstreetmap.org/export/embed.html?bbox=${originLng! - 0.05}%2C${originLat! - 0.05}%2C${originLng! + 0.05}%2C${originLat! + 0.05}&layer=mapnik&marker=${originLat}%2C${originLng}`
    } else if (hasDestination) {
      return `https://www.openstreetmap.org/export/embed.html?bbox=${destinationLng! - 0.05}%2C${destinationLat! - 0.05}%2C${destinationLng! + 0.05}%2C${destinationLat! + 0.05}&layer=mapnik&marker=${destinationLat}%2C${destinationLng}`
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
      <div ref={mapRef} className="relative w-full h-40 bg-muted">
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
            <span className="text-foreground truncate">{originLabel}</span>
          </div>
        )}

        {hasDestination && (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-red-600">B</span>
            </div>
            <span className="text-foreground truncate">{destinationLabel}</span>
          </div>
        )}

        {/* Distance and Duration */}
        {hasBoth && showRoute && distance && duration && (
          <div className="flex items-center gap-4 pt-2 border-t border-border mt-2">
            <div className="flex items-center gap-1.5 text-sm">
              <Navigation2 className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground">{distance}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span>~{duration} drive</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
