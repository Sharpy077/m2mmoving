"use client"

import type React from "react"
import {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useCallback,
  lazy,
  Suspense,
} from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Send,
  Building2,
  Warehouse,
  Server,
  ShoppingBag,
  Monitor,
  Stethoscope,
  Truck,
  CalendarIcon,
  Clock,
  MapPin,
  Search,
  CreditCard,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react"
import { createCheckoutSession } from "@/app/actions/create-checkout-session"
import { sendBookingConfirmation } from "@/app/actions/send-confirmation"
import { formatDate } from "@/utils/date-utils" // Import formatDate function
import { AddressAutocomplete } from "@/components/address-autocomplete"
import { AddressMap } from "@/components/address-map"
import { PriceEstimate } from "./price-estimate"
import { StreetAutocomplete } from "@/components/street-autocomplete"

const M2M_PHONE = "03 8820 1801"
const M2M_PHONE_LINK = "tel:0388201801"

const StripeCheckoutWrapper = lazy(() => import("@/components/stripe-checkout-wrapper"))

// Service options for the picker
const serviceOptions = [
  { id: "office", label: "Office Relocation", icon: Building2 },
  { id: "warehouse", label: "Warehouse Move", icon: Warehouse },
  { id: "datacentre", label: "Data Centre", icon: Server },
  { id: "retail", label: "Retail Fit-out", icon: ShoppingBag },
  { id: "it-equipment", label: "IT Equipment", icon: Monitor },
  { id: "medical", label: "Medical & Lab", icon: Stethoscope },
]

// Types
interface BusinessInfo {
  name: string
  abn: string
  acn?: string
  tradingName?: string
  entityType?: string
  status?: string
  state?: string
  postcode?: string
  gstRegistered?: boolean
  score?: number
}

interface AddressInfo {
  street: string
  suburb: string
  state: string
  postcode: string
}

interface AddressInfoWithCoords extends AddressInfo {
  fullAddress?: string
  lat?: number
  lng?: number
}

interface BookingData {
  serviceType: string
  business: BusinessInfo | null
  originAddress: AddressInfoWithCoords | null
  destinationAddress: AddressInfoWithCoords | null
  preferredDate: Date | null
  preferredTime: string
  inventory: string
  specialRequirements: string
  contactName: string
  contactEmail: string
  contactPhone: string
  quoteAmount: number
  quoteReference: string
  estimatedTotal?: number
  depositAmount?: number
  squareMeters?: number
}

export interface QuoteAssistantRef {
  open: () => void
  close: () => void
}

interface QuoteAssistantProps {
  isOpen?: boolean
  onClose?: () => void
}

// Helper to extract text from message
function getTextFromMessage(message: { parts?: Array<{ type: string; text?: string }> }): string {
  if (!message?.parts || !Array.isArray(message.parts)) return ""
  const textPart = message.parts.find((p) => p.type === "text")
  return textPart && "text" in textPart ? textPart.text || "" : ""
}

const QuoteAssistant = forwardRef<QuoteAssistantRef, QuoteAssistantProps>(({ isOpen = true, onClose }, ref) => {
  const [isVisible, setIsVisible] = useState(isOpen)
  const [input, setInput] = useState("")
  const [showServicePicker, setShowServicePicker] = useState(true)
  const [bookingData, setBookingData] = useState<BookingData>({
    serviceType: "",
    business: null,
    originAddress: null,
    destinationAddress: null,
    preferredDate: null,
    preferredTime: "",
    inventory: "",
    specialRequirements: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    quoteAmount: 0,
    quoteReference: "",
  })

  // UI State for interactive components
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [showABNLookup, setShowABNLookup] = useState(false)
  const [showAddressInput, setShowAddressInput] = useState<"origin" | "destination" | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [abnSearchQuery, setAbnSearchQuery] = useState("")
  const [abnSearchResults, setAbnSearchResults] = useState<BusinessInfo[]>([])
  const [isSearchingABN, setIsSearchingABN] = useState(false)
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // Address input state
  const [addressInput, setAddressInput] = useState<AddressInfoWithCoords>({
    street: "",
    suburb: "",
    state: "VIC",
    postcode: "",
    fullAddress: "",
    lat: undefined,
    lng: undefined,
  })

  const [addressSearchQuery, setAddressSearchQuery] = useState("")

  const [originCoords, setOriginCoords] = useState<{ lat?: number; lng?: number; label?: string }>({})
  const [destCoords, setDestCoords] = useState<{ lat?: number; lng?: number; label?: string }>({})

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // State for distance and price tracking
  const [routeDistance, setRouteDistance] = useState<{
    km: number
    text: string
    durationMinutes: number
    durationText: string
  } | null>(null)
  const [estimatedPrice, setEstimatedPrice] = useState<{ total: number; deposit: number } | null>(null)

  // Memoize transport to prevent recreation
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/quote-assistant",
      }),
    [],
  )

  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport,
    onError: (err) => {
      console.error("[v0] Chat error:", err)
    },
  })

  const isLoading = status === "streaming" || status === "submitted"

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [messages, isLoading])

  useEffect(() => {
    if (
      !showServicePicker &&
      isVisible &&
      !showABNLookup &&
      !showAddressInput &&
      !showDatePicker &&
      !showTimePicker &&
      !showPayment &&
      !showConfirmation
    ) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [
    showServicePicker,
    isVisible,
    showABNLookup,
    showAddressInput,
    showDatePicker,
    showTimePicker,
    showPayment,
    showConfirmation,
  ])

  useEffect(() => {
    const handleViewportResize = () => {
      // Scroll messages into view when keyboard opens
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" })
      }
    }

    // Listen for visual viewport changes (mobile keyboard)
    if (typeof window !== "undefined" && window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportResize)
      window.visualViewport.addEventListener("scroll", handleViewportResize)
    }

    return () => {
      if (typeof window !== "undefined" && window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleViewportResize)
        window.visualViewport.removeEventListener("scroll", handleViewportResize)
      }
    }
  }, [])

  useImperativeHandle(ref, () => ({
    open: () => setIsVisible(true),
    close: () => {
      setIsVisible(false)
      onClose?.()
    },
  }))

  // Handle service selection
  const handleServiceSelect = useCallback(
    (serviceId: string, serviceLabel: string) => {
      setShowServicePicker(false)
      setBookingData((prev) => ({ ...prev, serviceType: serviceId }))
      sendMessage({ text: `I need help with ${serviceLabel}` })
      // Show ABN lookup after service selection
      setTimeout(() => setShowABNLookup(true), 1000)
    },
    [sendMessage],
  )

  // ABN Lookup
  const handleABNSearch = async () => {
    if (!abnSearchQuery.trim()) return
    setIsSearchingABN(true)
    try {
      const searchType = /^\d+$/.test(abnSearchQuery.replace(/\s/g, "")) ? "abn" : "name"
      const response = await fetch(`/api/business-lookup?q=${encodeURIComponent(abnSearchQuery)}&type=${searchType}`)
      const data = await response.json()
      setAbnSearchResults(data.results || [])
    } catch (err) {
      console.error("ABN lookup failed:", err)
    } finally {
      setIsSearchingABN(false)
    }
  }

  const handleSelectBusiness = (business: BusinessInfo) => {
    setBookingData((prev) => ({ ...prev, business }))
    setShowABNLookup(false)
    setAbnSearchResults([])
    setAbnSearchQuery("")
    sendMessage({ text: `My business is ${business.name}, ABN: ${business.abn}` })
    // Show address input after business selection
    setTimeout(() => setShowAddressInput("origin"), 1000)
  }

  // Address handling
  const handleAddressSubmit = (type: "origin" | "destination") => {
    const address = { ...addressInput }
    const fullAddress = `${address.street}, ${address.suburb} ${address.state} ${address.postcode}`

    if (type === "origin") {
      setBookingData((prev) => ({ ...prev, originAddress: address }))
      // Store coordinates for map
      setOriginCoords({ lat: address.lat, lng: address.lng, label: fullAddress })
      sendMessage(`Moving FROM: ${fullAddress}`)
      setShowAddressInput("destination")
    } else {
      setBookingData((prev) => ({ ...prev, destinationAddress: address }))
      // Store coordinates for map
      setDestCoords({ lat: address.lat, lng: address.lng, label: fullAddress })
      sendMessage(`Moving TO: ${fullAddress}`)
      setShowAddressInput(null)
      setTimeout(() => setShowDatePicker(true), 500)
    }
    // Reset for next input
    setAddressInput({
      street: "",
      suburb: "",
      state: "VIC",
      postcode: "",
      fullAddress: "",
      lat: undefined,
      lng: undefined,
    })
    setAddressSearchQuery("")
  }

  const handleAddressAutoComplete = (address: {
    street: string
    suburb: string
    state: string
    postcode: string
    fullAddress: string
    lat?: number
    lng?: number
  }) => {
    console.log("[v0] handleAddressAutoComplete received:", address)

    // Update the address input state with all components
    setAddressInput({
      street: address.street,
      suburb: address.suburb,
      state: address.state || "VIC",
      postcode: address.postcode,
      fullAddress: address.fullAddress,
      lat: address.lat,
      lng: address.lng,
    })

    if (address.suburb) {
      setAddressSearchQuery(address.suburb)
    }

    console.log("[v0] Updated addressInput with postcode:", address.postcode)
  }

  // Date/Time handling
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setBookingData((prev) => ({ ...prev, preferredDate: date }))
      setShowDatePicker(false)
      setShowTimePicker(true)
    }
  }

  const handleTimeSelect = (time: string) => {
    setBookingData((prev) => ({ ...prev, preferredTime: time }))
    setShowTimePicker(false)
    const dateStr = bookingData.preferredDate ? formatDate(bookingData.preferredDate, "full") : ""
    sendMessage({ text: `I'd like to book for ${dateStr} at ${time}` })
  }

  // Payment handling
  const initiatePayment = async () => {
    if (isProcessingPayment) return // Prevent duplicate calls
    setIsProcessingPayment(true)
    // Calculate 50% deposit - if quoteAmount is 0, default to minimum $500 quote = $250 deposit
    const quoteTotal = bookingData.quoteAmount > 0 ? bookingData.quoteAmount : 500
    const depositAmount = Math.round(quoteTotal * 0.5 * 100) // 50% in cents

    const result = await createCheckoutSession({
      amount: depositAmount,
      description: `M&M Moving 50% Deposit - ${bookingData.serviceType} (Total Quote: $${quoteTotal})`,
      metadata: {
        serviceType: bookingData.serviceType,
        businessName: bookingData.business?.name || "",
        contactEmail: bookingData.contactEmail,
        quoteTotal: quoteTotal.toString(),
        depositPercent: "50",
      },
    })

    if (result.clientSecret) {
      setPaymentClientSecret(result.clientSecret)
      setShowPayment(true)
    }
  }

  const handlePaymentComplete = async () => {
    const quoteTotal = bookingData.quoteAmount > 0 ? bookingData.quoteAmount : 500
    const depositPaid = quoteTotal * 0.5

    // Generate quote reference
    const quoteRef = `MM-${Date.now().toString(36).toUpperCase()}`
    setBookingData((prev) => ({ ...prev, quoteReference: quoteRef }))

    // Send confirmation email and SMS
    try {
      await sendBookingConfirmation({
        quoteReference: quoteRef,
        customerName: bookingData.contactName || "Customer",
        customerEmail: bookingData.contactEmail,
        customerPhone: bookingData.contactPhone,
        businessName: bookingData.business?.name || "",
        businessABN: bookingData.business?.abn || "",
        serviceType: bookingData.serviceType,
        originAddress: bookingData.originAddress
          ? `${bookingData.originAddress.street}, ${bookingData.originAddress.suburb} ${bookingData.originAddress.state} ${bookingData.originAddress.postcode}`
          : "",
        destinationAddress: bookingData.destinationAddress
          ? `${bookingData.destinationAddress.street}, ${bookingData.destinationAddress.suburb} ${bookingData.destinationAddress.state} ${bookingData.destinationAddress.postcode}`
          : "",
        moveDate: bookingData.preferredDate ? formatDate(bookingData.preferredDate, "short") : "",
        moveTime: bookingData.preferredTime,
        quoteAmount: quoteTotal,
        depositPaid: depositPaid,
      })
    } catch (error) {
      console.error("Failed to send confirmations:", error)
    }

    setShowPayment(false)
    setShowConfirmation(true)
  }

  // Handler for distance calculation callback
  const handleDistanceCalculated = (distance: {
    km: number
    text: string
    durationMinutes: number
    durationText: string
  }) => {
    setRouteDistance(distance)
  }

  // Handler for price calculation callback
  const handlePriceCalculated = (total: number, deposit: number) => {
    setEstimatedPrice({ total, deposit })
    // Update booking data with the price
    setBookingData((prev) => ({
      ...prev,
      estimatedTotal: total,
      depositAmount: deposit,
    }))
  }

  // Render service picker
  const renderServicePicker = () => (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
          <Truck className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Maya</p>
          <p className="text-sm text-muted-foreground">M&M Moving Assistant</p>
        </div>
      </div>
      <p className="text-foreground mb-4">
        Hi! I'm Maya, your commercial moving specialist. What type of move can I help you with today?
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {serviceOptions.map((service) => (
          <button
            key={service.id}
            className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-border/50 hover:border-primary hover:bg-primary/5 transition-all duration-200 text-left group"
            onClick={() => handleServiceSelect(service.id, service.label)}
          >
            <service.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0 group-hover:scale-110 transition-transform" />
            <span className="text-sm sm:text-base font-medium text-foreground">{service.label}</span>
          </button>
        ))}
      </div>
    </div>
  )

  // Render ABN Lookup
  const renderABNLookup = () => (
    <Card className="m-4 border-primary/30 bg-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Search className="h-5 w-5 text-primary" />
          <p className="font-medium text-foreground">Business Lookup</p>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Search by ABN (11 digits) or business name to find your company
        </p>
        <div className="flex gap-2 mb-3">
          <Input
            value={abnSearchQuery}
            onChange={(e) => setAbnSearchQuery(e.target.value)}
            placeholder="e.g. 71661027309 or Acme Pty Ltd"
            onKeyDown={(e) => e.key === "Enter" && handleABNSearch()}
            className="bg-background text-foreground placeholder:text-muted-foreground border-input"
          />
          <Button
            onClick={handleABNSearch}
            disabled={isSearchingABN}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isSearchingABN ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {/* Search Results */}
        {abnSearchResults.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <p className="text-xs text-muted-foreground mb-2">
              {abnSearchResults.length} result{abnSearchResults.length !== 1 ? "s" : ""} found - click to select
            </p>
            {abnSearchResults.map((biz, idx) => (
              <div
                key={idx}
                className="p-3 bg-muted rounded-lg border border-border cursor-pointer hover:border-primary hover:bg-muted/80 transition-colors"
                onClick={() => handleSelectBusiness(biz)}
              >
                {/* Business Name & Trading Name */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{biz.name}</p>
                    {biz.tradingName && biz.tradingName !== biz.name && (
                      <p className="text-xs text-muted-foreground truncate">Trading as: {biz.tradingName}</p>
                    )}
                  </div>
                  {/* Status Badge */}
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${
                      biz.status === "Active" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {biz.status || "Unknown"}
                  </span>
                </div>

                {/* ABN & ACN Row */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div>
                    <span className="text-muted-foreground">ABN: </span>
                    <span className="text-foreground font-mono">
                      {biz.abn.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, "$1 $2 $3 $4")}
                    </span>
                  </div>
                  {biz.acn && (
                    <div>
                      <span className="text-muted-foreground">ACN: </span>
                      <span className="text-foreground font-mono">
                        {biz.acn.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Entity Type & Location Row */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-1">
                  {biz.entityType && (
                    <div>
                      <span className="text-muted-foreground">Type: </span>
                      <span className="text-foreground">{biz.entityType}</span>
                    </div>
                  )}
                  {(biz.state || biz.postcode) && (
                    <div>
                      <span className="text-muted-foreground">Location: </span>
                      <span className="text-foreground">{[biz.state, biz.postcode].filter(Boolean).join(" ")}</span>
                    </div>
                  )}
                </div>

                {/* GST Status */}
                {biz.gstRegistered !== undefined && (
                  <div className="text-xs mt-1">
                    <span className="text-muted-foreground">GST: </span>
                    <span className={biz.gstRegistered ? "text-green-400" : "text-muted-foreground"}>
                      {biz.gstRegistered ? "Registered" : "Not Registered"}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* No Results Message */}
        {abnSearchResults.length === 0 && abnSearchQuery.length > 2 && !isSearchingABN && (
          <p className="text-sm text-muted-foreground text-center py-2">
            No businesses found. Try a different search term.
          </p>
        )}

        <Button
          variant="ghost"
          className="mt-3 text-sm text-muted-foreground hover:text-foreground w-full"
          onClick={() => {
            setShowABNLookup(false)
            sendMessage({ text: "I'll provide my business details manually" })
          }}
        >
          Skip - Enter manually
        </Button>
      </CardContent>
    </Card>
  )

  // Render Address Input
  const renderAddressInput = () => (
    <div className="mx-2 sm:mx-4 my-2 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="h-5 w-5 text-blue-500 flex-shrink-0" />
        <p className="font-medium text-foreground text-sm sm:text-base">
          {showAddressInput === "origin" ? "Moving FROM" : "Moving TO"}
        </p>
      </div>

      {/* Address Autocomplete Search */}
      <AddressAutocomplete
        value={addressSearchQuery}
        onChange={setAddressSearchQuery}
        onAddressSelect={handleAddressAutoComplete}
        placeholder={
          showAddressInput === "origin" ? "Start typing suburb or postcode..." : "Start typing suburb or postcode..."
        }
        className="w-full"
      />

      {/* Selected Location */}
      {(addressInput.suburb || addressInput.fullAddress) && (
        <div className="bg-muted/50 rounded-lg p-3 mb-3">
          <p className="text-xs text-muted-foreground mb-1">Selected location:</p>
          <p className="text-sm font-medium text-foreground">
            {addressInput.suburb
              ? `${addressInput.suburb}, ${addressInput.state || ""}${addressInput.postcode ? `, ${addressInput.postcode}` : ""}`
              : addressInput.fullAddress}
          </p>
        </div>
      )}

      {/* Street Address Dropdown */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Street Address <span className="text-destructive">*</span>
        </label>
        <StreetAutocomplete
          value={addressInput.street}
          onChange={(street) => setAddressInput((prev) => ({ ...prev, street }))}
          onStreetSelect={(street, fullAddress, lat, lng) => {
            setAddressInput((prev) => ({
              ...prev,
              street,
              fullAddress: fullAddress || prev.fullAddress,
              lat: lat ?? prev.lat,
              lng: lng ?? prev.lng,
            }))
          }}
          suburb={addressInput.suburb}
          state={addressInput.state}
          postcode={addressInput.postcode}
          placeholder="Start typing your street address..."
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          Type your street number and name - suggestions will appear as you type
        </p>
      </div>

      {/* State Dropdown */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">State</label>
        <select
          value={addressInput.state}
          onChange={(e) => setAddressInput((prev) => ({ ...prev, state: e.target.value }))}
          className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
        >
          <option value="VIC">VIC</option>
          <option value="NSW">NSW</option>
          <option value="QLD">QLD</option>
          <option value="SA">SA</option>
          <option value="WA">WA</option>
          <option value="TAS">TAS</option>
          <option value="NT">NT</option>
          <option value="ACT">ACT</option>
        </select>
      </div>

      {/* Postcode Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Postcode</label>
        <Input
          value={addressInput.postcode}
          onChange={(e) => setAddressInput((prev) => ({ ...prev, postcode: e.target.value }))}
          placeholder="Postcode"
          maxLength={4}
          className="bg-background text-foreground text-sm"
        />
      </div>

      {/* Submit Button */}
      <Button
        onClick={() => handleAddressSubmit(showAddressInput!)}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!addressInput.street || !addressInput.suburb}
      >
        {showAddressInput === "origin" ? "Confirm Pickup Address" : "Confirm Delivery Address"}
      </Button>

      {/* Street Address Input Validation */}
      {!addressInput.street && (
        <p className="text-xs text-center text-amber-500">Please enter your street address above to continue</p>
      )}

      {/* Address Not Found Message */}
      <p className="text-xs text-center text-muted-foreground">
        Can't find your address? Type it in the search box and we'll help you.
      </p>
    </div>
  )

  // Render Date Picker
  const renderDatePicker = () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]
    const dayNames = ["S", "M", "T", "W", "T", "F", "S"]

    const days: (number | null)[] = []
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }

    const handlePrevMonth = () => {
      if (currentMonth === 0) {
        setCurrentMonth(11)
        setCurrentYear(currentYear - 1)
      } else {
        setCurrentMonth(currentMonth - 1)
      }
    }

    const handleNextMonth = () => {
      if (currentMonth === 11) {
        setCurrentMonth(0)
        setCurrentYear(currentYear + 1)
      } else {
        setCurrentMonth(currentMonth + 1)
      }
    }

    const isDateDisabled = (day: number) => {
      const date = new Date(currentYear, currentMonth, day)
      return date < new Date()
    }

    const handleDayClick = (day: number) => {
      if (!isDateDisabled(day)) {
        const selectedDate = new Date(currentYear, currentMonth, day)
        handleDateSelect(selectedDate)
      }
    }

    return (
      <div className="mx-2 my-2 p-3 rounded-lg border border-primary/30 bg-card">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <CalendarIcon className="h-4 w-4 text-primary flex-shrink-0" />
          <p className="font-medium text-sm text-foreground">Select Move Date</p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-2 px-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium text-sm">
            {monthNames[currentMonth]} {currentYear}
          </span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Day Names Header */}
        <div className="grid grid-cols-7 mb-1">
          {dayNames.map((day, idx) => (
            <div key={idx} className="text-center text-xs text-muted-foreground py-1 font-medium">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px">
          {days.map((day, index) => (
            <div key={index} className="flex items-center justify-center">
              {day ? (
                <button
                  className={`w-8 h-8 text-sm rounded-md transition-colors ${
                    isDateDisabled(day)
                      ? "text-muted-foreground/40 cursor-not-allowed"
                      : "hover:bg-primary/20 text-foreground cursor-pointer"
                  }`}
                  onClick={() => handleDayClick(day)}
                  disabled={isDateDisabled(day)}
                >
                  {day}
                </button>
              ) : (
                <div className="w-8 h-8" />
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Render Time Picker
  const renderTimePicker = () => (
    <div className="mx-2 my-2 p-3 rounded-lg border border-primary/30 bg-card">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="h-4 w-4 text-primary flex-shrink-0" />
        <p className="font-medium text-sm text-foreground">Select Time Slot</p>
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        {bookingData.preferredDate && formatDate(bookingData.preferredDate, "short")}
      </p>
      <div className="flex flex-wrap gap-2">
        {["7:00 AM - 12:00 PM", "12:00 PM - 5:00 PM", "Custom Time"].map((time) => (
          <Button
            key={time}
            variant="outline"
            size="sm"
            className="text-xs bg-transparent"
            onClick={() => handleTimeSelect(time)}
          >
            {time}
          </Button>
        ))}
      </div>
    </div>
  )

  // Render Payment
  const renderPayment = () => {
    const quoteTotal = bookingData.quoteAmount > 0 ? bookingData.quoteAmount : 500
    const depositAmount = quoteTotal * 0.5

    return (
      <Card className="m-4 border-purple-200 bg-purple-50 dark:bg-purple-950/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="h-5 w-5 text-purple-500" />
            <p className="font-medium text-foreground">Secure Payment</p>
          </div>
          <div className="bg-white dark:bg-background rounded-lg p-3 mb-4 border">
            <div className="flex justify-between text-sm mb-1">
              <span>Quote Total:</span>
              <span className="font-medium">${quoteTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span>Deposit Required (50%):</span>
              <span className="font-semibold text-purple-600">${depositAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Balance Due on Move Day:</span>
              <span>${depositAmount.toFixed(2)}</span>
            </div>
          </div>
          {paymentClientSecret ? (
            <Suspense
              fallback={
                <div className="text-center py-4">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500" />
                  <p className="text-sm text-muted-foreground mt-2">Loading payment form...</p>
                </div>
              }
            >
              <StripeCheckoutWrapper clientSecret={paymentClientSecret} onComplete={handlePaymentComplete} />
            </Suspense>
          ) : (
            <div className="text-center py-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500" />
              <p className="text-sm text-muted-foreground mt-2">Loading payment form...</p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Render Confirmation
  const renderConfirmation = () => (
    <Card className="m-4 border-green-200 bg-green-50 dark:bg-green-950/20">
      <CardContent className="p-4 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <p className="font-semibold text-lg text-foreground mb-2">Booking Confirmed!</p>
        <p className="text-muted-foreground mb-4">Reference: {bookingData.quoteReference || "MM-" + Date.now()}</p>
        <div className="text-sm text-left space-y-1">
          <p>
            <strong>Service:</strong> {bookingData.serviceType}
          </p>
          <p>
            <strong>Business:</strong> {bookingData.business?.name}
          </p>
          <p>
            <strong>Date:</strong> {bookingData.preferredDate && formatDate(bookingData.preferredDate, "short")}
          </p>
          <p>
            <strong>Time:</strong> {bookingData.preferredTime}
          </p>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Confirmation sent to your email and phone. Our team will contact you 24 hours before your move.
        </p>
      </CardContent>
    </Card>
  )

  // Render Route Summary with Price Estimate
  const renderRouteSummary = () => {
    if (!originCoords.lat || !destCoords.lat) return null

    return (
      <div className="mx-2 sm:mx-4 my-2 space-y-3">
        {/* Route Map */}
        <AddressMap
          originLat={originCoords.lat}
          originLng={originCoords.lng}
          destinationLat={destCoords.lat}
          destinationLng={destCoords.lng}
          originLabel={originCoords.label}
          destinationLabel={destCoords.label}
          showRoute={true}
          onDistanceCalculated={handleDistanceCalculated}
        />

        {/* Price Estimate */}
        {routeDistance && (
          <PriceEstimate
            distanceKm={routeDistance.km}
            squareMeters={bookingData.squareMeters}
            moveDate={bookingData.preferredDate}
            onPriceCalculated={handlePriceCalculated}
          />
        )}
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      sendMessage({ text: input })
      setInput("")
    }
  }

  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage && lastMessage.role === "assistant") {
      const messageText =
        typeof lastMessage.content === "string"
          ? lastMessage.content
          : Array.isArray(lastMessage.parts)
            ? lastMessage.parts.find((p: { type: string }) => p.type === "text")?.text || ""
            : ""

      // Check if Maya mentions payment/deposit and we should show the payment form
      const paymentTriggers = [
        "SHOW_PAYMENT_FORM",
        "secure payment form",
        "payment form to complete",
        "require a 50% deposit",
        "50% deposit of $",
        "I'll now show you our secure payment",
      ]

      const shouldShowPayment = paymentTriggers.some((trigger) =>
        messageText.toLowerCase().includes(trigger.toLowerCase()),
      )

      if (shouldShowPayment && !showPayment && !paymentClientSecret) {
        // Auto-trigger payment form
        initiatePayment()
      }
    }
  }, [messages, showPayment, paymentClientSecret])

  const resetChat = useCallback(() => {
    // Clear messages
    setMessages([])

    // Reset booking data
    setBookingData({
      serviceType: "",
      business: null,
      originAddress: null,
      destinationAddress: null,
      preferredDate: null,
      preferredTime: "",
      inventory: "",
      specialRequirements: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      quoteAmount: 0,
      quoteReference: "",
    })

    // Reset UI state
    setShowServicePicker(true)
    setShowDatePicker(false)
    setShowTimePicker(false)
    setShowABNLookup(false)
    setShowAddressInput(null)
    setShowPayment(false)
    setShowConfirmation(false)

    // Reset search/input state
    setAbnSearchQuery("")
    setAbnSearchResults([])
    setAddressSearchQuery("")
    setAddressInput({
      street: "",
      suburb: "",
      state: "VIC",
      postcode: "",
      fullAddress: "",
      lat: undefined,
      lng: undefined,
    })

    // Reset coordinates
    setOriginCoords({})
    setDestCoords({})

    // Reset payment state
    setPaymentClientSecret(null)
    setIsProcessingPayment(false)

    // Clear input
    setInput("")
  }, [setMessages])

  if (!isVisible) return null

  return (
    <div
      ref={chatContainerRef}
      className="flex flex-col h-[500px] max-h-[80dvh] md:max-h-[500px] w-full bg-background rounded-lg border shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b bg-gradient-to-r from-orange-500 to-red-500 shrink-0">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-white" />
          <span className="font-semibold text-white text-sm sm:text-base">M&M Moving</span>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetChat}
              className="h-7 px-2 text-white hover:bg-white/20 hover:text-white"
              title="Start new conversation"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              <span className="text-xs hidden sm:inline">Reset</span>
            </Button>
          )}
          <Badge variant="secondary" className="bg-white/20 text-white text-xs">
            {isLoading ? "Maya is typing..." : "Online"}
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scroll-smooth overscroll-contain">
        {showServicePicker && messages.length === 0 ? (
          renderServicePicker()
        ) : (
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-lg px-3 sm:px-4 py-2 break-words ${
                    message.role === "user" ? "bg-orange-500 text-white" : "bg-muted text-foreground"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-1">
                      <Truck className="h-4 w-4 text-orange-500 flex-shrink-0" />
                      <span className="text-xs font-medium text-orange-500">Maya</span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{getTextFromMessage(message)}</p>
                </div>
              </div>
            ))}

            {/* Interactive Components */}
            {showABNLookup && renderABNLookup()}
            {showAddressInput && renderAddressInput()}
            {!showAddressInput && originCoords.lat && destCoords.lat && renderRouteSummary()}
            {showDatePicker && renderDatePicker()}
            {showTimePicker && renderTimePicker()}
            {showPayment && renderPayment()}
            {showConfirmation && renderConfirmation()}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 sm:px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                    <span className="text-sm text-muted-foreground">Maya is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 sm:p-4 border-t shrink-0 bg-background">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 text-base sm:text-sm"
            autoComplete="off"
            autoFocus={false}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-orange-500 hover:bg-orange-600 px-3 sm:px-4 text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Or call us:{" "}
          <a href={M2M_PHONE_LINK} className="text-orange-500 font-medium">
            {M2M_PHONE}
          </a>
        </p>
      </div>
    </div>
  )
})

QuoteAssistant.displayName = "QuoteAssistant"

export { QuoteAssistant }
export type { QuoteAssistantRef }
export default QuoteAssistant
