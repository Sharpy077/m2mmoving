"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { MapPin, Loader2, Clock, Route, AlertCircle } from "lucide-react"
import type * as L from "leaflet"

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
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const polylineRef = useRef<L.Polyline | null>(null)
  const routePolylineRef = useRef<L.Polyline | null>(null)
  const calculatedCoordsRef = useRef<string | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false)
  const [distance, setDistance] = useState<string | null>(null)
  const [distanceKm, setDistanceKm] = useState<number | null>(null)
  const [duration, setDuration] = useState<string | null>(null)
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [leafletLoaded, setLeafletLoaded] = useState(false)

  const hasOrigin = originLat !== undefined && originLng !== undefined
  const hasDestination = destinationLat !== undefined && destinationLng !== undefined
  const hasBoth = hasOrigin && hasDestination

  useEffect(() => {
    if (typeof window === "undefined") return

    if ((window as unknown as { L?: typeof L }).L) {
      setLeafletLoaded(true)
      setIsLoading(false)
      return
    }

    const cssLink = document.createElement("link")
    cssLink.rel = "stylesheet"
    cssLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    cssLink.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
    cssLink.crossOrigin = ""
    document.head.appendChild(cssLink)

    const script = document.createElement("script")
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
    script.crossOrigin = ""
    script.onload = () => {
      setLeafletLoaded(true)
      setIsLoading(false)
    }
    script.onerror = () => {
      console.error("[v0] Failed to load Leaflet")
      setIsLoading(false)
    }
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return
    if (!hasOrigin && !hasDestination) return

    const L = (window as unknown as { L: typeof import("leaflet") }).L
    if (!L) return

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: true,
      })

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapInstanceRef.current)
    }

    const map = mapInstanceRef.current

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    if (polylineRef.current) {
      polylineRef.current.remove()
      polylineRef.current = null
    }

    if (routePolylineRef.current) {
      routePolylineRef.current.remove()
      routePolylineRef.current = null
    }

    const createIcon = (color: string, label: string) => {
      return L.divIcon({
        className: "custom-marker",
        html: `<div style="
          background-color: ${color};
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        "><span style="
          transform: rotate(45deg);
          color: white;
          font-weight: bold;
          font-size: 14px;
        ">${label}</span></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      })
    }

    const bounds: L.LatLngBoundsExpression = []

    if (hasOrigin && originLat && originLng) {
      const originIcon = createIcon("#22c55e", "A")
      const originMarker = L.marker([originLat, originLng], { icon: originIcon })
        .addTo(map)
        .bindPopup(`<strong>From:</strong><br/>${originLabel}`)
      markersRef.current.push(originMarker)
      bounds.push([originLat, originLng])
    }

    if (hasDestination && destinationLat && destinationLng) {
      const destIcon = createIcon("#ef4444", "B")
      const destMarker = L.marker([destinationLat, destinationLng], { icon: destIcon })
        .addTo(map)
        .bindPopup(`<strong>To:</strong><br/>${destinationLabel}`)
      markersRef.current.push(destMarker)
      bounds.push([destinationLat, destinationLng])
    }

    if (bounds.length > 0) {
      if (bounds.length === 1) {
        map.setView(bounds[0] as L.LatLngExpression, 13)
      } else {
        map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50] })
      }
    }
  }, [
    leafletLoaded,
    hasOrigin,
    hasDestination,
    hasBoth,
    originLat,
    originLng,
    destinationLat,
    destinationLng,
    originLabel,
    destinationLabel,
  ])

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  const calculateRouteDistance = useCallback(async () => {
    if (!originLat || !originLng || !destinationLat || !destinationLng) return

    const coordsKey = `${originLat.toFixed(4)},${originLng.toFixed(4)}-${destinationLat.toFixed(4)},${destinationLng.toFixed(4)}`
    if (calculatedCoordsRef.current === coordsKey) {
      return // Already calculated, skip
    }
    calculatedCoordsRef.current = coordsKey

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

        if (data.routeGeometry && data.routeGeometry.length > 0 && mapInstanceRef.current) {
          const L = (window as unknown as { L: typeof import("leaflet") }).L
          if (L) {
            if (polylineRef.current) {
              polylineRef.current.remove()
              polylineRef.current = null
            }
            if (routePolylineRef.current) {
              routePolylineRef.current.remove()
            }
            routePolylineRef.current = L.polyline(data.routeGeometry, {
              color: "#3b82f6",
              weight: 4,
              opacity: 0.8,
            }).addTo(mapInstanceRef.current)

            mapInstanceRef.current.fitBounds(routePolylineRef.current.getBounds(), { padding: [50, 50] })
          }
        }

        onRouteStatusChange?.("success")

        if (onDistanceCalculated) {
          onDistanceCalculated({
            km: data.distanceKm,
            text: data.distanceText,
            durationMinutes: data.durationMinutes,
            durationText: data.durationText,
          })
        }
      } else {
        const d = calculateHaversineDistance(originLat, originLng, destinationLat, destinationLng)
        const mins = Math.round((d / 50) * 60)
        setDistanceKm(d)
        setDistance(`${Math.round(d)} km`)
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
      setDistance(`${Math.round(d)} km`)
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
    } finally {
      setIsCalculatingRoute(false)
    }
  }, [
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
    if (hasBoth && originLat && originLng && destinationLat && destinationLng) {
      const coordsKey = `${originLat.toFixed(4)},${originLng.toFixed(4)}-${destinationLat.toFixed(4)},${destinationLng.toFixed(4)}`
      if (calculatedCoordsRef.current !== coordsKey) {
        calculateRouteDistance()
      }
    }
  }, [hasBoth, originLat, originLng, destinationLat, destinationLng, calculateRouteDistance])

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
      <div ref={mapContainerRef} className="relative w-full h-44 bg-muted" style={{ minHeight: "176px" }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-[1000]">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>

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
