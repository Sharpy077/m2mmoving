"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Loader2, X, Home, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

interface StreetPrediction {
  place_id: string
  description: string
  structured_formatting?: {
    main_text: string
    secondary_text: string
  }
}

interface StreetAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onStreetSelect?: (data: {
    street: string
    fullAddress: string
    lat?: number
    lng?: number
    postcode?: string
    suburb?: string
    state?: string
  }) => void
  suburb?: string
  state?: string
  postcode?: string
  placeholder?: string
  className?: string
  disabled?: boolean
  autoFocus?: boolean
}

export function StreetAutocomplete({
  value,
  onChange,
  onStreetSelect,
  suburb,
  state,
  postcode,
  placeholder = "Enter street number and name (e.g. 123 Main Street)",
  className,
  disabled = false,
  autoFocus = false,
}: StreetAutocompleteProps) {
  const [predictions, setPredictions] = useState<StreetPrediction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [sessionToken] = useState(() => crypto.randomUUID())
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  const getLocationBias = useCallback(() => {
    const parts = []
    if (suburb) parts.push(suburb)
    if (state) parts.push(state)
    if (postcode) parts.push(postcode)
    return parts.join(" ")
  }, [suburb, state, postcode])

  const fetchPredictions = useCallback(
    async (input: string) => {
      if (input.length < 3) {
        setPredictions([])
        return
      }

      setIsLoading(true)
      try {
        const locationBias = getLocationBias()
        const searchQuery = locationBias ? `${input}, ${locationBias}` : input

        const response = await fetch(
          `/api/places/autocomplete?input=${encodeURIComponent(searchQuery)}&sessionToken=${sessionToken}&types=address`,
        )
        const data = await response.json()

        if (data.predictions) {
          const filtered = data.predictions.filter((p: StreetPrediction) => {
            const desc = p.description.toLowerCase()
            if (suburb) {
              return desc.includes(suburb.toLowerCase())
            }
            return true
          })
          setPredictions(filtered.length > 0 ? filtered : data.predictions.slice(0, 5))
          setShowSuggestions(true)
        } else {
          setPredictions([])
        }
      } catch (error) {
        console.error("[v0] Error fetching street predictions:", error)
        setPredictions([])
      } finally {
        setIsLoading(false)
      }
    },
    [sessionToken, getLocationBias, suburb],
  )

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      fetchPredictions(value)
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [value, fetchPredictions])

  const handleSelectPrediction = async (prediction: StreetPrediction) => {
    setIsLoading(true)
    setShowSuggestions(false)

    try {
      const response = await fetch(`/api/places/details?placeId=${prediction.place_id}&sessionToken=${sessionToken}`)
      const data = await response.json()

      if (data.result) {
        const components = data.result.address_components || []
        let streetNumber = ""
        let route = ""
        let extractedPostcode = ""
        let extractedSuburb = ""
        let extractedState = ""

        for (const component of components) {
          const types = component.types
          if (types.includes("street_number")) {
            streetNumber = component.long_name
          } else if (types.includes("route")) {
            route = component.long_name
          } else if (types.includes("postal_code")) {
            extractedPostcode = component.long_name
          } else if (types.includes("locality") || types.includes("sublocality")) {
            extractedSuburb = component.long_name
          } else if (types.includes("administrative_area_level_1")) {
            extractedState = component.short_name
          }
        }

        const streetAddress = streetNumber ? `${streetNumber} ${route}` : route
        const lat = data.result.geometry?.location?.lat
        const lng = data.result.geometry?.location?.lng

        console.log("[v0] Street selection extracted:", {
          streetAddress,
          extractedPostcode,
          extractedSuburb,
          extractedState,
        })

        onChange(streetAddress || prediction.structured_formatting?.main_text || prediction.description.split(",")[0])

        if (onStreetSelect) {
          onStreetSelect({
            street: streetAddress,
            fullAddress: data.result.formatted_address || prediction.description,
            lat,
            lng,
            postcode: extractedPostcode,
            suburb: extractedSuburb,
            state: extractedState,
          })
        }
      } else {
        const streetText = prediction.structured_formatting?.main_text || prediction.description.split(",")[0]
        const postcodeMatch = prediction.description.match(/\b(\d{4})\b/)
        const fallbackPostcode = postcodeMatch ? postcodeMatch[1] : ""

        console.log("[v0] Street selection fallback - postcode from description:", fallbackPostcode)

        onChange(streetText)
        if (onStreetSelect) {
          onStreetSelect({
            street: streetText,
            fullAddress: prediction.description,
            postcode: fallbackPostcode,
          })
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching street details:", error)
      const streetText = prediction.structured_formatting?.main_text || prediction.description.split(",")[0]
      const postcodeMatch = prediction.description.match(/\b(\d{4})\b/)
      const fallbackPostcode = postcodeMatch ? postcodeMatch[1] : ""

      onChange(streetText)
      if (onStreetSelect) {
        onStreetSelect({
          street: streetText,
          fullAddress: prediction.description,
          postcode: fallbackPostcode,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || predictions.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => (prev < predictions.length - 1 ? prev + 1 : prev))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
        break
      case "Enter":
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < predictions.length) {
          handleSelectPrediction(predictions[selectedIndex])
        }
        break
      case "Escape":
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const clearInput = () => {
    onChange("")
    setPredictions([])
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative">
        <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => predictions.length > 0 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className="pl-10 pr-10 bg-background text-foreground text-sm"
          autoComplete="off"
        />
        {isLoading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        ) : value ? (
          <button
            type="button"
            onClick={clearInput}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {showSuggestions && predictions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-auto"
        >
          {predictions.map((prediction, index) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => handleSelectPrediction(prediction)}
              className={cn(
                "w-full px-3 py-2 text-left flex items-start gap-2 hover:bg-accent transition-colors",
                index === selectedIndex && "bg-accent",
                index !== predictions.length - 1 && "border-b border-border",
              )}
            >
              <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-foreground text-sm truncate">
                  {prediction.structured_formatting?.main_text || prediction.description.split(",")[0]}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {prediction.structured_formatting?.secondary_text ||
                    prediction.description.split(",").slice(1).join(",").trim()}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
