"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { MapPin, Loader2, X, Navigation } from "lucide-react"
import { cn } from "@/lib/utils"

interface AddressComponents {
  street: string
  suburb: string
  state: string
  postcode: string
  fullAddress: string
  lat?: number
  lng?: number
}

interface Prediction {
  place_id: string
  description: string
  structured_formatting?: {
    main_text: string
    secondary_text: string
  }
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onAddressSelect: (address: AddressComponents) => void
  placeholder?: string
  label?: string
  className?: string
  disabled?: boolean
}

export function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Start typing an address...",
  label,
  className,
  disabled = false,
}: AddressAutocompleteProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [sessionToken] = useState(() => crypto.randomUUID())
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // Fetch predictions when input changes
  const fetchPredictions = useCallback(
    async (input: string) => {
      if (input.length < 3) {
        setPredictions([])
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(
          `/api/places/autocomplete?input=${encodeURIComponent(input)}&sessionToken=${sessionToken}`,
        )
        const data = await response.json()

        if (data.predictions) {
          setPredictions(data.predictions)
          setShowSuggestions(true)
        }
      } catch (error) {
        console.error("Error fetching predictions:", error)
      } finally {
        setIsLoading(false)
      }
    },
    [sessionToken],
  )

  // Debounced input handler
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

  // Handle selecting a prediction
  const handleSelectPrediction = async (prediction: Prediction) => {
    setIsLoading(true)
    setShowSuggestions(false)
    onChange(prediction.description)

    try {
      const response = await fetch(`/api/places/details?placeId=${prediction.place_id}&sessionToken=${sessionToken}`)
      const data = await response.json()

      if (data.result) {
        const components = parseAddressComponents(data.result)
        onAddressSelect(components)
      }
    } catch (error) {
      console.error("Error fetching place details:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Parse Google Places address components into our format
  const parseAddressComponents = (result: {
    formatted_address?: string
    geometry?: { location: { lat: number; lng: number } }
    address_components?: Array<{ long_name: string; short_name?: string; types: string[] }>
  }): AddressComponents => {
    const components = result.address_components || []
    let streetNumber = ""
    let route = ""
    let suburb = ""
    let state = ""
    let postcode = ""

    for (const component of components) {
      const types = component.types
      if (types.includes("street_number")) {
        streetNumber = component.long_name
      } else if (types.includes("route")) {
        route = component.long_name
      } else if (types.includes("locality") || types.includes("sublocality")) {
        suburb = component.long_name
      } else if (types.includes("administrative_area_level_1")) {
        state = component.short_name || component.long_name
      } else if (types.includes("postal_code")) {
        postcode = component.long_name
      }
    }

    return {
      street: streetNumber ? `${streetNumber} ${route}` : route,
      suburb,
      state,
      postcode,
      fullAddress: result.formatted_address || "",
      lat: result.geometry?.location?.lat,
      lng: result.geometry?.location?.lng,
    }
  }

  // Keyboard navigation
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

  // Close suggestions when clicking outside
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
      {label && <label className="text-sm font-medium text-foreground mb-1.5 block">{label}</label>}

      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => predictions.length > 0 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-10 pr-10 bg-background text-foreground"
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

      {/* Suggestions Dropdown */}
      {showSuggestions && predictions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {predictions.map((prediction, index) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => handleSelectPrediction(prediction)}
              className={cn(
                "w-full px-3 py-2.5 text-left flex items-start gap-2 hover:bg-accent transition-colors",
                index === selectedIndex && "bg-accent",
                index !== predictions.length - 1 && "border-b border-border",
              )}
            >
              <Navigation className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-foreground text-sm truncate">
                  {prediction.structured_formatting?.main_text || prediction.description.split(",")[0]}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {prediction.structured_formatting?.secondary_text ||
                    prediction.description.split(",").slice(1).join(",")}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showSuggestions && value.length >= 3 && predictions.length === 0 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg p-3 text-center text-sm text-muted-foreground">
          No addresses found. Try a different search.
        </div>
      )}
    </div>
  )
}
