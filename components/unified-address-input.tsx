"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { MapPin, Loader2, X, Navigation, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const CACHE_KEY = "mm_autocomplete_cache"
const CACHE_VERSION = 1
const CACHE_MAX_ENTRIES = 500 // Limit entries to prevent localStorage overflow
const CACHE_TTL_DAYS = 30

interface CacheEntry {
  predictions: Prediction[]
  timestamp: number
}

interface CacheData {
  version: number
  entries: Record<string, CacheEntry>
}

// Get cache from localStorage
function getLocalCache(): CacheData {
  if (typeof window === "undefined") return { version: CACHE_VERSION, entries: {} }

  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return { version: CACHE_VERSION, entries: {} }

    const data = JSON.parse(cached) as CacheData

    // Check version - clear cache if outdated
    if (data.version !== CACHE_VERSION) {
      localStorage.removeItem(CACHE_KEY)
      return { version: CACHE_VERSION, entries: {} }
    }

    return data
  } catch {
    return { version: CACHE_VERSION, entries: {} }
  }
}

// Save cache to localStorage
function saveLocalCache(cache: CacheData): void {
  if (typeof window === "undefined") return

  try {
    // Prune old entries if over limit
    const entries = Object.entries(cache.entries)
    if (entries.length > CACHE_MAX_ENTRIES) {
      // Sort by timestamp, keep newest
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
      cache.entries = Object.fromEntries(entries.slice(0, CACHE_MAX_ENTRIES))
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch (e) {
    // localStorage might be full - clear old data
    console.warn("[v0] localStorage cache full, clearing old entries")
    localStorage.removeItem(CACHE_KEY)
  }
}

// Check if cache entry is still valid
function isCacheValid(entry: CacheEntry): boolean {
  const maxAge = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000
  return Date.now() - entry.timestamp < maxAge
}

// Normalize search key for cache
function normalizeSearchKey(input: string): string {
  return input.toLowerCase().trim().replace(/\s+/g, " ")
}

interface AddressData {
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

interface UnifiedAddressInputProps {
  label?: string
  placeholder?: string
  onAddressConfirmed: (address: AddressData) => void
  onCancel?: () => void
  className?: string
  disabled?: boolean
  confirmButtonText?: string
}

export function UnifiedAddressInput({
  label = "Enter your address",
  placeholder = "Start typing your full address...",
  onAddressConfirmed,
  onCancel,
  className,
  disabled = false,
  confirmButtonText = "Confirm Address",
}: UnifiedAddressInputProps) {
  const [inputValue, setInputValue] = useState("")
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [sessionToken] = useState(() => crypto.randomUUID())
  const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()
  const lastQueryRef = useRef<string>("")

  const fetchPredictions = useCallback(
    async (input: string) => {
      if (input.length < 3) {
        setPredictions([])
        return
      }

      const normalizedInput = normalizeSearchKey(input)
      if (normalizedInput === lastQueryRef.current) {
        return // Skip duplicate query
      }
      lastQueryRef.current = normalizedInput

      // Check localStorage cache first
      const cache = getLocalCache()
      const cachedEntry = cache.entries[normalizedInput]

      if (cachedEntry && isCacheValid(cachedEntry)) {
        // Cache hit - use cached predictions without API call
        setPredictions(cachedEntry.predictions)
        setShowSuggestions(cachedEntry.predictions.length > 0)
        return
      }

      setIsLoading(true)
      setValidationError(null)

      try {
        const response = await fetch(
          `/api/places/autocomplete?input=${encodeURIComponent(input)}&sessionToken=${sessionToken}&types=address`,
        )
        const data = await response.json()

        if (data.predictions && data.predictions.length > 0) {
          setPredictions(data.predictions)
          setShowSuggestions(true)

          // Save to localStorage cache
          cache.entries[normalizedInput] = {
            predictions: data.predictions,
            timestamp: Date.now(),
          }
          saveLocalCache(cache)
        } else {
          setPredictions([])

          // Cache empty results too (prevents repeated failed lookups)
          cache.entries[normalizedInput] = {
            predictions: [],
            timestamp: Date.now(),
          }
          saveLocalCache(cache)
        }
      } catch (error) {
        console.error("[v0] Error fetching predictions:", error)
        setPredictions([])
      } finally {
        setIsLoading(false)
      }
    },
    [sessionToken],
  )

  // Fetch predictions when input changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (selectedAddress && inputValue !== selectedAddress.fullAddress) {
      setSelectedAddress(null)
    }

    debounceRef.current = setTimeout(() => {
      fetchPredictions(inputValue)
    }, 400)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [inputValue, fetchPredictions, selectedAddress])

  // Handle selecting a prediction
  const handleSelectPrediction = async (prediction: Prediction) => {
    setIsLoading(true)
    setShowSuggestions(false)
    setValidationError(null)

    try {
      const response = await fetch(`/api/places/details?placeId=${prediction.place_id}&sessionToken=${sessionToken}`)
      const data = await response.json()

      if (data.result) {
        const addressData = parseAddressComponents(data.result, prediction.description)
        setInputValue(addressData.fullAddress || prediction.description)
        setSelectedAddress(addressData)

        // Validate the address has required components
        if (!addressData.street) {
          setValidationError("Please include a street number and name")
        } else if (!addressData.suburb) {
          setValidationError("Could not detect suburb - please verify")
        } else if (!addressData.postcode) {
          setValidationError("Could not detect postcode - please verify")
        }
      } else {
        // Fallback parsing from description
        const fallbackAddress = parseFromDescription(prediction.description)
        setInputValue(prediction.description)
        setSelectedAddress(fallbackAddress)

        if (!fallbackAddress.street) {
          setValidationError("Please include a street number and name")
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching place details:", error)
      const fallbackAddress = parseFromDescription(prediction.description)
      setInputValue(prediction.description)
      setSelectedAddress(fallbackAddress)
    } finally {
      setIsLoading(false)
    }
  }

  // Parse Google Places address components
  const parseAddressComponents = (
    result: {
      formatted_address?: string
      geometry?: { location: { lat: number; lng: number } }
      address_components?: Array<{ long_name: string; short_name?: string; types: string[] }>
    },
    fallbackDescription: string,
  ): AddressData => {
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
      } else if (types.includes("locality") || types.includes("sublocality") || types.includes("sublocality_level_1")) {
        suburb = component.long_name
      } else if (types.includes("administrative_area_level_1")) {
        state = component.short_name || component.long_name
      } else if (types.includes("postal_code")) {
        postcode = component.long_name
      }
    }

    // If postcode not found, try to extract from formatted address
    if (!postcode) {
      const postcodeMatch = (result.formatted_address || fallbackDescription).match(/\b(\d{4})\b/)
      if (postcodeMatch) {
        postcode = postcodeMatch[1]
      }
    }

    return {
      street: streetNumber ? `${streetNumber} ${route}` : route,
      suburb,
      state,
      postcode,
      fullAddress: result.formatted_address || fallbackDescription,
      lat: result.geometry?.location?.lat,
      lng: result.geometry?.location?.lng,
    }
  }

  // Parse address from description string (fallback)
  const parseFromDescription = (description: string): AddressData => {
    const parts = description.split(",").map((p) => p.trim())
    let street = ""
    let suburb = ""
    let state = ""
    let postcode = ""

    // First part often contains street address
    if (parts.length > 0) {
      const firstPart = parts[0]
      // Check if it looks like a street address (has numbers)
      if (/^\d+/.test(firstPart) || /\d+\s+\w+/.test(firstPart)) {
        street = firstPart
      } else {
        suburb = firstPart
      }
    }

    // Look for suburb, state, postcode in remaining parts
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i]

      // Skip "Australia"
      if (part.toLowerCase() === "australia") continue

      // Match "Suburb VIC 3121" pattern
      const fullMatch = part.match(/^(.+?)\s+(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\s+(\d{4})$/i)
      if (fullMatch) {
        if (!suburb) suburb = fullMatch[1].trim()
        state = fullMatch[2].toUpperCase()
        postcode = fullMatch[3]
        continue
      }

      // Match "VIC 3121" pattern
      const statePostcodeMatch = part.match(/^(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\s+(\d{4})$/i)
      if (statePostcodeMatch) {
        state = statePostcodeMatch[1].toUpperCase()
        postcode = statePostcodeMatch[2]
        continue
      }

      // Match just state
      const stateMatch = part.match(/^(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)$/i)
      if (stateMatch) {
        state = stateMatch[1].toUpperCase()
        continue
      }

      // Match just postcode
      const postcodeMatch = part.match(/^(\d{4})$/)
      if (postcodeMatch) {
        postcode = postcodeMatch[1]
        continue
      }

      // Otherwise might be suburb
      if (!suburb && !part.toLowerCase().includes("australia")) {
        suburb = part
      }
    }

    // Extract postcode from anywhere in description if not found
    if (!postcode) {
      const postcodeInDesc = description.match(/\b(\d{4})\b/)
      if (postcodeInDesc) {
        postcode = postcodeInDesc[1]
      }
    }

    return {
      street,
      suburb,
      state,
      postcode,
      fullAddress: description,
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
    setInputValue("")
    setPredictions([])
    setShowSuggestions(false)
    setSelectedAddress(null)
    setValidationError(null)
    inputRef.current?.focus()
  }

  const handleConfirm = () => {
    if (selectedAddress && !validationError) {
      onAddressConfirmed(selectedAddress)
    }
  }

  const isAddressValid = selectedAddress && !validationError && selectedAddress.street && selectedAddress.suburb

  return (
    <div className={cn("space-y-3", className)}>
      {/* Label */}
      <label className="text-sm font-medium text-foreground block">{label}</label>

      <div className="relative">
        {/* Input Field */}
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => predictions.length > 0 && setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "pl-10 pr-10 bg-background text-foreground h-12 text-base",
              selectedAddress && isAddressValid && "border-green-500 focus-visible:ring-green-500",
              validationError && "border-amber-500 focus-visible:ring-amber-500",
            )}
            autoComplete="off"
            autoFocus
          />
          {isLoading ? (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          ) : inputValue ? (
            <button
              type="button"
              onClick={clearInput}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        {showSuggestions && predictions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-[100] w-full left-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-64 overflow-auto"
            style={{ position: "absolute" }}
          >
            {predictions.map((prediction, index) => (
              <button
                key={prediction.place_id}
                type="button"
                onClick={() => handleSelectPrediction(prediction)}
                className={cn(
                  "w-full px-4 py-3 text-left flex items-start gap-3 hover:bg-accent transition-colors",
                  index === selectedIndex && "bg-accent",
                  index !== predictions.length - 1 && "border-b border-border",
                )}
              >
                <Navigation className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                <div className="min-w-0 flex-1">
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

      {/* Helper text when empty */}
      {!inputValue && !selectedAddress && (
        <p className="text-xs text-muted-foreground">
          Type your full street address including number (e.g. "123 Main Street, Richmond VIC")
        </p>
      )}

      {/* Selected Address Summary */}
      {selectedAddress && (
        <div
          className={cn(
            "rounded-lg p-3 space-y-2",
            isAddressValid
              ? "bg-green-500/10 border border-green-500/20"
              : "bg-amber-500/10 border border-amber-500/20",
          )}
        >
          <div className="flex items-start gap-2">
            {isAddressValid ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {isAddressValid ? "Address detected:" : "Please verify:"}
              </p>
              <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                {selectedAddress.street && (
                  <p>
                    <span className="text-foreground font-medium">Street:</span> {selectedAddress.street}
                  </p>
                )}
                {selectedAddress.suburb && (
                  <p>
                    <span className="text-foreground font-medium">Suburb:</span> {selectedAddress.suburb}
                  </p>
                )}
                {selectedAddress.state && (
                  <p>
                    <span className="text-foreground font-medium">State:</span> {selectedAddress.state}
                  </p>
                )}
                {selectedAddress.postcode && (
                  <p>
                    <span className="text-foreground font-medium">Postcode:</span> {selectedAddress.postcode}
                  </p>
                )}
              </div>
            </div>
          </div>

          {validationError && <p className="text-xs text-amber-600 dark:text-amber-400 pl-6">{validationError}</p>}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} className="flex-1 bg-transparent" disabled={disabled}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleConfirm}
          className={cn("flex-1 bg-primary hover:bg-primary/90 text-primary-foreground", !onCancel && "w-full")}
          disabled={!isAddressValid || disabled}
        >
          {confirmButtonText}
        </Button>
      </div>

      {/* Help text */}
      <p className="text-xs text-center text-muted-foreground">
        Can't find your address? Type it manually and we'll help verify it.
      </p>
    </div>
  )
}
