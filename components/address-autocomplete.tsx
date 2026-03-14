"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { MapPin, Loader2, X, Navigation, Search, AlertCircle } from "lucide-react"
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
  placeholder = "Start typing suburb or postcode...",
  label,
  className,
  disabled = false,
}: AddressAutocompleteProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [sessionToken] = useState(() => crypto.randomUUID())
  const [dataSource, setDataSource] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // Fetch predictions when input changes
  const fetchPredictions = useCallback(
    async (input: string) => {
      if (input.length < 2) {
        setPredictions([])
        setDataSource(null)
        setApiError(null)
        return
      }

      setIsLoading(true)
      setApiError(null)
      try {
        const response = await fetch(
          `/api/places/autocomplete?input=${encodeURIComponent(input)}&sessionToken=${sessionToken}`,
        )
        const data = await response.json()

        // Track data source for debugging
        if (data._source) {
          setDataSource(data._source)
        }
        if (data._apiError) {
          setApiError(data._apiError)
          console.warn("[v0] API Error:", data._apiError)
        }

        if (data.predictions) {
          setPredictions(data.predictions)
          setShowSuggestions(true)
        } else {
          setPredictions([])
        }
      } catch (error) {
        console.error("[v0] Error fetching predictions:", error)
        setPredictions([])
        setApiError("Network error - please check your connection")
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

    onChange("Loading address details...")

    try {
      const response = await fetch(`/api/places/details?placeId=${prediction.place_id}&sessionToken=${sessionToken}`)
      const data = await response.json()

      if (data.result) {
        const components = parseAddressComponents(data.result)
        const displayText = components.suburb
          ? `${components.suburb}${components.state ? `, ${components.state}` : ""}${components.postcode ? ` ${components.postcode}` : ""}`
          : prediction.description
        onChange(displayText)
        onAddressSelect(components)
      } else {
        // If no details available, parse from prediction description
        const fallbackComponents = parseFromDescription(prediction.description)
        onChange(prediction.description)
        onAddressSelect(fallbackComponents)
      }
    } catch (error) {
      console.error("[v0] Error fetching place details:", error)
      // Fallback: parse from description
      const fallbackComponents = parseFromDescription(prediction.description)
      onChange(prediction.description)
      onAddressSelect(fallbackComponents)
    } finally {
      setIsLoading(false)
    }
  }

  const parseFromDescription = (description: string): AddressComponents => {
    console.log("[v0] parseFromDescription input:", description)

    const parts = description.split(",").map((p) => p.trim())
    console.log("[v0] parsed parts:", parts)

    // Australian addresses typically: "Suburb State Postcode, Australia" or "Suburb, State Postcode, Australia"
    let suburb = ""
    let state = ""
    let postcode = ""

    // First, try to extract from the first part which often contains "Suburb State Postcode"
    const firstPart = parts[0] || ""

    // Pattern 1: "Forest Hill VIC 3131" - suburb followed by state and postcode
    const suburbStatePostcodeMatch = firstPart.match(/^(.+?)\s+(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\s+(\d{4})$/i)
    if (suburbStatePostcodeMatch) {
      suburb = suburbStatePostcodeMatch[1].trim()
      state = suburbStatePostcodeMatch[2].toUpperCase()
      postcode = suburbStatePostcodeMatch[3]
      console.log("[v0] Pattern 1 matched:", { suburb, state, postcode })
    }
    // Pattern 2: "Suburb VIC" - suburb followed by state only
    else {
      const suburbStateMatch = firstPart.match(/^(.+?)\s+(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)$/i)
      if (suburbStateMatch) {
        suburb = suburbStateMatch[1].trim()
        state = suburbStateMatch[2].toUpperCase()
        console.log("[v0] Pattern 2 matched:", { suburb, state })
      } else {
        // Pattern 3: Just suburb name, state/postcode in other parts
        suburb = firstPart
        console.log("[v0] Pattern 3 - just suburb:", suburb)
      }
    }

    // Look through remaining parts for state and postcode if not found
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i]

      // Skip "Australia"
      if (part.toLowerCase() === "australia") continue

      const postcodeFirstMatch = part.match(/^(\d{4})\s*(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)?$/i)
      if (postcodeFirstMatch) {
        if (!postcode) postcode = postcodeFirstMatch[1]
        if (postcodeFirstMatch[2] && !state) state = postcodeFirstMatch[2].toUpperCase()
        console.log("[v0] Postcode first pattern matched:", { postcode, state })
        continue
      }

      // Match patterns like "VIC 3121", "NSW", "Victoria 3000"
      const statePostcodeMatch = part.match(
        /^(VIC|NSW|QLD|SA|WA|TAS|NT|ACT|Victoria|New South Wales|Queensland|South Australia|Western Australia|Tasmania|Northern Territory|Australian Capital Territory)\s*(\d{4})?$/i,
      )
      if (statePostcodeMatch) {
        const stateMap: Record<string, string> = {
          victoria: "VIC",
          "new south wales": "NSW",
          queensland: "QLD",
          "south australia": "SA",
          "western australia": "WA",
          tasmania: "TAS",
          "northern territory": "NT",
          "australian capital territory": "ACT",
        }
        if (!state) {
          state = stateMap[statePostcodeMatch[1].toLowerCase()] || statePostcodeMatch[1].toUpperCase()
        }
        if (statePostcodeMatch[2] && !postcode) {
          postcode = statePostcodeMatch[2]
        }
        console.log("[v0] State/postcode pattern matched:", { state, postcode })
      }

      // Check for standalone postcode
      const postcodeOnly = part.match(/^(\d{4})$/)
      if (postcodeOnly && !postcode) {
        postcode = postcodeOnly[1]
        console.log("[v0] Standalone postcode matched:", postcode)
      }
    }

    if (!postcode) {
      const postcodeInDescription = description.match(/\b(\d{4})\b/)
      if (postcodeInDescription) {
        postcode = postcodeInDescription[1]
        console.log("[v0] Extracted postcode from description:", postcode)
      }
    }

    console.log("[v0] Final parsed result:", { suburb, state, postcode })

    return {
      street: "",
      suburb,
      state,
      postcode,
      fullAddress: description,
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
    setDataSource(null)
    setApiError(null)
    inputRef.current?.focus()
  }

  return (
    <div className={cn("relative w-full", className)}>
      {label && <label className="text-sm font-medium text-foreground mb-1.5 block">{label}</label>}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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

      {/* Guidance text when empty */}
      {!value && (
        <div className="mt-2 p-2 bg-muted/50 rounded-md">
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Tip:</strong> Enter your suburb name or postcode first for best results.
              <br />
              <span className="text-[10px]">Examples: "Richmond", "3121", "Mount Gambier SA"</span>
            </span>
          </p>
        </div>
      )}

      {/* API error indicator - only shown in development */}
      {apiError && process.env.NODE_ENV === "development" && (
        <div className="mt-1 p-2 bg-destructive/10 rounded text-xs text-destructive flex items-start gap-1.5">
          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>API Issue: {apiError}</span>
        </div>
      )}

      {/* Data source indicator - only shown in development */}
      {dataSource && process.env.NODE_ENV === "development" && predictions.length > 0 && (
        <div className="absolute right-0 -top-5 text-[10px] text-muted-foreground">Data: {dataSource}</div>
      )}

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
      {showSuggestions && value.length >= 2 && predictions.length === 0 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg p-4">
          <p className="text-sm text-muted-foreground text-center mb-2">No locations found</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Try a suburb name (e.g. "Richmond")</li>
            <li>• Try a postcode (e.g. "3121")</li>
            <li>• Add state for clarity (e.g. "Mount Gambier SA")</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-border text-center">
            Can&apos;t find your location? Type it in the chat and we&apos;ll help.
          </p>
        </div>
      )}
    </div>
  )
}
