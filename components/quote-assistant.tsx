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
  Package,
  Zap,
  ClipboardList,
  FileText,
  Shield,
  CheckCircle,
} from "lucide-react"
import { formatDate } from "@/utils/date-utils" // Import formatDate function
import { AddressMap } from "@/components/address-map"
import { PriceEstimate } from "./price-estimate"
import { UnifiedAddressInput } from "./unified-address-input"

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
  inventory: string // Changed to string for summary
  specialRequirements: string
  contactName: string
  contactEmail: string
  contactPhone: string
  quoteAmount: number
  quoteReference: string
  estimatedTotal?: number
  depositAmount?: number
  squareMeters?: number
  distanceKm?: number
  durationMinutes?: number
}

interface InventoryItem {
  id: string
  name: string
  quantity: number
  category: string
}

// Office relocation inventory categories
const OFFICE_INVENTORY_CATEGORIES = {
  furniture: {
    label: "Office Furniture",
    items: [
      { id: "desk", name: "Desks", icon: "🖥️" },
      { id: "chair", name: "Office Chairs", icon: "🪑" },
      { id: "cabinet", name: "Filing Cabinets", icon: "🗄️" },
      { id: "bookshelf", name: "Bookshelves", icon: "📚" },
      { id: "table", name: "Meeting Tables", icon: "📋" },
      { id: "reception", name: "Reception Desk", icon: "🛎️" },
    ],
  },
  equipment: {
    label: "IT & Equipment",
    items: [
      { id: "computer", name: "Desktop Computers", icon: "🖥️" },
      { id: "monitor", name: "Monitors", icon: "🖵" },
      { id: "printer", name: "Printers/Copiers", icon: "🖨️" },
      { id: "server", name: "Server Equipment", icon: "🗄️" },
      { id: "phone", name: "Phone Systems", icon: "📞" },
    ],
  },
  storage: {
    label: "Storage & Boxes",
    items: [
      { id: "boxes_small", name: "Small Boxes", icon: "📦" },
      { id: "boxes_medium", name: "Medium Boxes", icon: "📦" },
      { id: "boxes_large", name: "Large Boxes", icon: "📦" },
      { id: "archive", name: "Archive Boxes", icon: "🗃️" },
    ],
  },
}

interface PricingBreakdown {
  baseCharge: number
  distanceCharge: number
  labourCharge: number
  timeCharge: number
  total: number
  deposit: number
  balance: number
}

interface QuoteAssistantRef {
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
  const [showCustomTimeInput, setShowCustomTimeInput] = useState(false)
  const [customTimeValue, setCustomTimeValue] = useState("")
  const [showABNLookup, setShowABNLookup] = useState(false)
  const [showAddressInput, setShowAddressInput] = useState<"origin" | "destination" | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showInventory, setShowInventory] = useState(false)
  const [showQuoteConfirmation, setShowQuoteConfirmation] = useState(false)
  const [inventoryItems, setInventoryItems] = useState<Record<string, number>>({})
  const [specialRequirements, setSpecialRequirements] = useState("")
  const [quoteOption, setQuoteOption] = useState<"instant" | "onsite" | null>(null)

  const [abnSearchQuery, setAbnSearchQuery] = useState("")
  const [abnSearchResults, setAbnSearchResults] = useState<BusinessInfo[]>([])
  const [isSearchingABN, setIsSearchingABN] = useState(false)
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // Address input state
  const [addressInput, setAddressInput] = useState<AddressInfoWithCoords>({
    street: "",
    suburb: "",
    state: "",
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
  const [pricingBreakdown, setPricingBreakdown] = useState<PricingBreakdown | null>(null)
  const [estimatedPrice, setEstimatedPrice] = useState<{ total: number; deposit: number } | null>(null)

  const [isReadyForPricing, setIsReadyForPricing] = useState(false)
  const [routeStatus, setRouteStatus] = useState<"idle" | "calculating" | "success" | "error">("idle")

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
      !showConfirmation &&
      !showInventory && // Added check for inventory
      !showQuoteConfirmation // Added check for quote confirmation
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
    showInventory, // Added
    showQuoteConfirmation, // Added
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
  const handleAddressSubmit = (type: "origin" | "destination", addressData?: AddressInfoWithCoords) => {
    // Use provided address data or fall back to state (for backwards compatibility)
    const address = addressData || { ...addressInput }

    // Build full address from the confirmed address components
    const fullAddress =
      address.fullAddress || `${address.street}, ${address.suburb} ${address.state} ${address.postcode}`.trim()

    console.log("[v0] handleAddressSubmit called:", { type, address, fullAddress })

    if (type === "origin") {
      setBookingData((prev) => ({ ...prev, originAddress: { ...address, fullAddress } }))
      // Store coordinates for map
      setOriginCoords({ lat: address.lat, lng: address.lng, label: fullAddress })
      if (address.street && address.suburb) {
        sendMessage({ text: `Moving FROM: ${fullAddress}` })
      }
      setShowAddressInput("destination")
    } else {
      setBookingData((prev) => ({ ...prev, destinationAddress: { ...address, fullAddress } }))
      // Store coordinates for map
      setDestCoords({ lat: address.lat, lng: address.lng, label: fullAddress })
      if (address.street && address.suburb) {
        sendMessage({ text: `Moving TO: ${fullAddress}` })
      }
      setShowAddressInput(null)
      setTimeout(() => setShowDatePicker(true), 500)
    }

    setAddressInput({
      street: "",
      suburb: "",
      state: "",
      postcode: "",
      fullAddress: "",
      lat: undefined,
      lng: undefined,
    })
  }

  const handleTimeSelect = (time: string) => {
    if (time === "Custom Time") {
      setShowCustomTimeInput(true)
    } else {
      setBookingData((prev) => ({ ...prev, preferredTime: time }))
      setShowTimePicker(false)
      // Send message and proceed to next step
      const dateStr = bookingData.preferredDate ? formatDate(bookingData.preferredDate, "short") : ""
      sendMessage({ text: `Preferred date and time: ${dateStr} at ${time}` })
      setTimeout(() => setShowInventory(true), 500)
    }
  }

  const handleCustomTimeSubmit = () => {
    if (customTimeValue.trim()) {
      setBookingData((prev) => ({ ...prev, preferredTime: customTimeValue }))
      setShowCustomTimeInput(false)
      setShowTimePicker(false)
      // Send message and proceed to next step
      const dateStr = bookingData.preferredDate ? formatDate(bookingData.preferredDate, "short") : ""
      sendMessage({ text: `Preferred date and time: ${dateStr} at ${customTimeValue}` })
      setTimeout(() => setShowInventory(true), 500)
    }
  }

  const calculatePricing = useCallback((distanceKm: number, durationMinutes: number): PricingBreakdown => {
    // Pricing rates (AUD)
    const BASE_CHARGE = 150 // Base call-out fee
    const DISTANCE_RATE = 2.5 // Per km
    const LABOUR_RATE_PER_HOUR = 85 // Per hour per mover
    const NUM_MOVERS = 2 // Standard 2-person crew
    const TIME_RATE_PER_HOUR = 45 // Vehicle/equipment time per hour

    // Calculate hours from duration (add 1 hour for loading/unloading minimum)
    const estimatedHours = Math.max(2, Math.ceil(durationMinutes / 60) + 1)

    // Calculate components
    const baseCharge = BASE_CHARGE
    const distanceCharge = Math.round(distanceKm * DISTANCE_RATE * 100) / 100
    const labourCharge = Math.round(estimatedHours * LABOUR_RATE_PER_HOUR * NUM_MOVERS * 100) / 100
    const timeCharge = Math.round(estimatedHours * TIME_RATE_PER_HOUR * 100) / 100

    const total = Math.round((baseCharge + distanceCharge + labourCharge + timeCharge) * 100) / 100
    const deposit = Math.round(total * 0.5 * 100) / 100
    const balance = Math.round((total - deposit) * 100) / 100

    return {
      baseCharge,
      distanceCharge,
      labourCharge,
      timeCharge,
      total,
      deposit,
      balance,
    }
  }, [])

  useEffect(() => {
    if (routeDistance && routeDistance.km > 0) {
      const pricing = calculatePricing(routeDistance.km, routeDistance.durationMinutes)
      setPricingBreakdown(pricing)
      setEstimatedPrice({ total: pricing.total, deposit: pricing.deposit })
      setBookingData((prev) => ({
        ...prev,
        quoteAmount: pricing.total,
        distanceKm: routeDistance.km,
        durationMinutes: routeDistance.durationMinutes,
      }))
    }
  }, [routeDistance, calculatePricing])

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
  const renderAddressInput = () => {
    const originAddress = bookingData.originAddress
    const destAddress = bookingData.destinationAddress

    return (
      <div className="mx-2 sm:mx-4 my-2">
        {showAddressInput === "destination" && originAddress?.fullAddress && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">Pickup Address Confirmed</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 ml-6">{originAddress.fullAddress}</p>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-blue-500 flex-shrink-0" />
          <p className="font-medium text-foreground text-sm sm:text-base">
            {showAddressInput === "origin" ? "Moving FROM" : "Moving TO"}
          </p>
        </div>

        {/* Unified Address Input */}
        <UnifiedAddressInput
          key={showAddressInput}
          label={showAddressInput === "origin" ? "Enter your pickup address" : "Enter your delivery address"}
          placeholder="Start typing your full address (e.g. 123 Main St, Richmond VIC)"
          confirmButtonText={showAddressInput === "origin" ? "Confirm Pickup Address" : "Confirm Delivery Address"}
          onAddressConfirmed={(address) => {
            console.log("[v0] Address confirmed from UnifiedAddressInput:", address)
            handleAddressSubmit(showAddressInput!, {
              street: address.street,
              suburb: address.suburb,
              state: address.state,
              postcode: address.postcode,
              fullAddress: address.fullAddress,
              lat: address.lat,
              lng: address.lng,
            })
          }}
        />
      </div>
    )
  }

  // Render Date Picker
  const renderDatePicker = () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()

    // Calculate the number of empty cells before the first day
    const emptyCells = Array(firstDayOfMonth).fill(null)

    // Create an array of days, padding with nulls at the start
    const days = [...emptyCells, ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

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
      // Disable past dates, and dates within the current month that are earlier than today
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Normalize today's date
      return date < today
    }

    const handleDayClick = (day: number) => {
      if (!isDateDisabled(day)) {
        const selectedDate = new Date(currentYear, currentMonth, day)
        setBookingData((prev) => ({ ...prev, preferredDate: selectedDate }))
        setShowDatePicker(false)
        setTimeout(() => setShowTimePicker(true), 500)
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

      {showCustomTimeInput ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="e.g., 9:00 AM or 2:30 PM"
              value={customTimeValue}
              onChange={(e) => setCustomTimeValue(e.target.value)}
              className="flex-1 text-sm"
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleCustomTimeSubmit}
              disabled={!customTimeValue.trim()}
              className="bg-primary text-primary-foreground"
            >
              Confirm
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setShowCustomTimeInput(false)}
          >
            ← Back to time slots
          </Button>
        </div>
      ) : (
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
      )}
    </div>
  )

  // Render Payment
  const renderPayment = () => {
    const pricing = pricingBreakdown || {
      baseCharge: 150,
      distanceCharge: 0,
      labourCharge: 340,
      timeCharge: 90,
      total: bookingData.quoteAmount > 0 ? bookingData.quoteAmount : 580,
      deposit: (bookingData.quoteAmount > 0 ? bookingData.quoteAmount : 580) * 0.5,
      balance: (bookingData.quoteAmount > 0 ? bookingData.quoteAmount : 580) * 0.5,
    }

    return (
      <Card className="m-4 border-orange-200 bg-white dark:bg-zinc-900 shadow-lg">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-orange-200">
            <CreditCard className="h-5 w-5 text-orange-500" />
            <p className="font-semibold text-foreground text-lg">Quote Summary & Payment</p>
          </div>

          {/* Pricing Breakdown */}
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 mb-4 border border-zinc-200 dark:border-zinc-700">
            <p className="text-sm font-medium text-foreground mb-3">Pricing Breakdown</p>

            {/* Base Charge */}
            <div className="flex justify-between text-sm py-1.5 border-b border-zinc-200 dark:border-zinc-700">
              <span className="text-muted-foreground">Base Call-out Fee</span>
              <span className="font-medium text-foreground">${pricing.baseCharge.toFixed(2)}</span>
            </div>

            {/* Distance Charge */}
            <div className="flex justify-between text-sm py-1.5 border-b border-zinc-200 dark:border-zinc-700">
              <div className="flex flex-col">
                <span className="text-muted-foreground">Distance Charge</span>
                {routeDistance && (
                  <span className="text-xs text-muted-foreground/70">{routeDistance.km.toFixed(1)} km × $2.50/km</span>
                )}
              </div>
              <span className="font-medium text-foreground">${pricing.distanceCharge.toFixed(2)}</span>
            </div>

            {/* Labour Charge */}
            <div className="flex justify-between text-sm py-1.5 border-b border-zinc-200 dark:border-zinc-700">
              <div className="flex flex-col">
                <span className="text-muted-foreground">Labour (2 movers)</span>
                {routeDistance && (
                  <span className="text-xs text-muted-foreground/70">
                    {Math.max(2, Math.ceil(routeDistance.durationMinutes / 60) + 1)} hrs × $85/hr × 2
                  </span>
                )}
              </div>
              <span className="font-medium text-foreground">${pricing.labourCharge.toFixed(2)}</span>
            </div>

            {/* Time/Equipment Charge */}
            <div className="flex justify-between text-sm py-1.5 border-b border-zinc-200 dark:border-zinc-700">
              <div className="flex flex-col">
                <span className="text-muted-foreground">Vehicle & Equipment</span>
                {routeDistance && (
                  <span className="text-xs text-muted-foreground/70">
                    {Math.max(2, Math.ceil(routeDistance.durationMinutes / 60) + 1)} hrs × $45/hr
                  </span>
                )}
              </div>
              <span className="font-medium text-foreground">${pricing.timeCharge.toFixed(2)}</span>
            </div>

            {/* Total */}
            <div className="flex justify-between text-base pt-3 mt-2 border-t-2 border-orange-300 dark:border-orange-600">
              <span className="font-semibold text-foreground">Quote Total</span>
              <span className="font-bold text-foreground text-lg">${pricing.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-4 mb-4 border border-orange-200 dark:border-orange-800">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-foreground">Deposit Required (50%)</span>
              <span className="font-bold text-orange-600 dark:text-orange-400 text-lg">
                ${pricing.deposit.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Balance Due on Move Day</span>
              <span className="font-medium text-foreground">${pricing.balance.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Form */}
          {paymentClientSecret ? (
            <Suspense
              fallback={
                <div className="text-center py-4">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-orange-500" />
                  <p className="text-sm text-muted-foreground mt-2">Loading payment form...</p>
                </div>
              }
            >
              <StripeCheckoutWrapper clientSecret={paymentClientSecret} onComplete={() => {}} />
            </Suspense>
          ) : (
            <div className="text-center py-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-orange-500" />
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
      <div className="mx-2 sm:mx-4 my-2 space-y-3 sm:space-y-4">
        {/* Route Map */}
        <AddressMap
          originLat={originCoords.lat}
          originLng={originCoords.lng}
          destinationLat={destCoords.lat}
          destinationLng={destCoords.lng}
          originLabel={originCoords.label}
          destinationLabel={destCoords.label}
          showRoute={true}
          onDistanceCalculated={(distance) => {
            setRouteDistance(distance)
            setBookingData((prev) => ({
              ...prev,
              distanceKm: distance.km,
              durationMinutes: distance.durationMinutes,
            }))
          }}
          onRouteStatusChange={(status) => setRouteStatus(status)}
        />

        {routeDistance && routeStatus === "success" && (
          <PriceEstimate
            distanceKm={routeDistance.km}
            squareMeters={bookingData.squareMeters}
            moveDate={bookingData.preferredDate}
            onPriceCalculated={(price) => setEstimatedPrice(price)}
            isReady={isReadyForPricing}
            onPricingBreakdown={(breakdown) => setPricingBreakdown(breakdown)}
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

      // Check for on-site quote booking confirmation
      const onsiteBookingConfirmed = messageText.toLowerCase().includes("booking an on-site assessment")

      if (onsiteBookingConfirmed && !showConfirmation) {
        setShowConfirmation(true)
      } else if (shouldShowPayment && !showPayment && !paymentClientSecret) {
        // Auto-trigger payment form
        setPaymentClientSecret("dummy-client-secret")
        setShowPayment(true)
      }
    }
  }, [messages, showPayment, paymentClientSecret, showConfirmation])

  const handleInventoryChange = (itemId: string, quantity: number) => {
    setInventoryItems((prev) => ({
      ...prev,
      [itemId]: Math.max(0, quantity),
    }))
  }

  const handleQuoteOptionSelect = (option: "instant" | "onsite") => {
    setQuoteOption(option)
    if (option === "onsite") {
      // Request on-site quote
      const inventorySummary = Object.entries(inventoryItems)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => {
          const allItems = [
            ...OFFICE_INVENTORY_CATEGORIES.furniture.items,
            ...OFFICE_INVENTORY_CATEGORIES.equipment.items,
            ...OFFICE_INVENTORY_CATEGORIES.storage.items,
          ]
          const item = allItems.find((i) => i.id === id)
          return `${qty}x ${item?.name || id}`
        })
        .join(", ")

      sendMessage({
        text: `I'd like to request an on-site quote. Items: ${inventorySummary || "To be assessed on-site"}. Special requirements: ${specialRequirements || "None"}`,
      })
      setShowInventory(false)
      // Show on-site booking confirmation
      setTimeout(() => {
        sendMessage({
          text: "I'd like to book an on-site assessment for an accurate quote.",
        })
      }, 500)
    }
  }

  const handleInventorySubmit = () => {
    // Build inventory summary
    const inventorySummary = Object.entries(inventoryItems)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const allItems = [
          ...OFFICE_INVENTORY_CATEGORIES.furniture.items,
          ...OFFICE_INVENTORY_CATEGORIES.equipment.items,
          ...OFFICE_INVENTORY_CATEGORIES.storage.items,
        ]
        const item = allItems.find((i) => i.id === id)
        return `${qty}x ${item?.name || id}`
      })
      .join(", ")

    // Update booking data
    setBookingData((prev) => ({
      ...prev,
      inventory: inventorySummary,
      specialRequirements: specialRequirements,
    }))

    // Send message
    sendMessage({
      text: `Items to move: ${inventorySummary || "Standard office contents"}. ${specialRequirements ? `Special requirements: ${specialRequirements}` : ""}`,
    })

    setShowInventory(false)
    setTimeout(() => setShowQuoteConfirmation(true), 500)
  }

  const handleQuoteConfirmation = (proceed: boolean) => {
    setShowQuoteConfirmation(false)
    if (proceed) {
      sendMessage({ text: "Yes, I'd like to proceed with this quote and pay the deposit." })
      // Show payment form
      setTimeout(() => {
        setPaymentClientSecret("ready")
        setShowPayment(true)
      }, 500)
    } else {
      sendMessage({ text: "I'd like to discuss the quote further or request changes." })
    }
  }

  const renderInventory = () => (
    <Card className="m-4 border-orange-200 bg-white dark:bg-zinc-900 shadow-lg">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-orange-200">
          <Package className="h-5 w-5 text-orange-500" />
          <p className="font-semibold text-foreground text-lg">What are you moving?</p>
        </div>

        {/* Quote Option Selection */}
        {!quoteOption && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-3">Choose how you'd like to get your quote:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/20 bg-transparent"
                onClick={() => setQuoteOption("instant")}
              >
                <Zap className="h-6 w-6 text-orange-500" />
                <span className="font-medium">Instant Quote</span>
                <span className="text-xs text-muted-foreground text-center">
                  Tell us what you're moving for an immediate estimate
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20 bg-transparent"
                onClick={() => handleQuoteOptionSelect("onsite")}
              >
                <ClipboardList className="h-6 w-6 text-blue-500" />
                <span className="font-medium">On-Site Quote</span>
                <span className="text-xs text-muted-foreground text-center">
                  Book a site visit ($99, refunded if you book)
                </span>
              </Button>
            </div>
          </div>
        )}

        {/* Instant Quote - Inventory Selection */}
        {quoteOption === "instant" && (
          <>
            {/* Furniture */}
            <div className="mb-4">
              <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {OFFICE_INVENTORY_CATEGORIES.furniture.label}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {OFFICE_INVENTORY_CATEGORIES.furniture.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800 rounded-lg p-2"
                  >
                    <span className="text-sm flex items-center gap-1">
                      <span>{item.icon}</span>
                      <span className="truncate">{item.name}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => handleInventoryChange(item.id, (inventoryItems[item.id] || 0) - 1)}
                      >
                        -
                      </Button>
                      <span className="w-6 text-center text-sm">{inventoryItems[item.id] || 0}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => handleInventoryChange(item.id, (inventoryItems[item.id] || 0) + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* IT & Equipment */}
            <div className="mb-4">
              <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                {OFFICE_INVENTORY_CATEGORIES.equipment.label}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {OFFICE_INVENTORY_CATEGORIES.equipment.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800 rounded-lg p-2"
                  >
                    <span className="text-sm flex items-center gap-1">
                      <span>{item.icon}</span>
                      <span className="truncate">{item.name}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => handleInventoryChange(item.id, (inventoryItems[item.id] || 0) - 1)}
                      >
                        -
                      </Button>
                      <span className="w-6 text-center text-sm">{inventoryItems[item.id] || 0}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => handleInventoryChange(item.id, (inventoryItems[item.id] || 0) + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Storage */}
            <div className="mb-4">
              <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <Package className="h-4 w-4" />
                {OFFICE_INVENTORY_CATEGORIES.storage.label}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {OFFICE_INVENTORY_CATEGORIES.storage.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800 rounded-lg p-2"
                  >
                    <span className="text-sm flex items-center gap-1">
                      <span>{item.icon}</span>
                      <span className="truncate">{item.name}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => handleInventoryChange(item.id, (inventoryItems[item.id] || 0) - 1)}
                      >
                        -
                      </Button>
                      <span className="w-6 text-center text-sm">{inventoryItems[item.id] || 0}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => handleInventoryChange(item.id, (inventoryItems[item.id] || 0) + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Special Requirements */}
            <div className="mb-4">
              <p className="text-sm font-medium text-foreground mb-2">Special Requirements (Optional)</p>
              <textarea
                className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm resize-none"
                rows={2}
                placeholder="Fragile items, after-hours access, specific equipment needed..."
                value={specialRequirements}
                onChange={(e) => setSpecialRequirements(e.target.value)}
              />
            </div>

            {/* Submit Button */}
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={handleInventorySubmit}>
              Get My Quote
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )

  const renderQuoteConfirmation = () => {
    const pricing = pricingBreakdown || {
      baseCharge: 150,
      distanceCharge: 0,
      labourCharge: 340,
      timeCharge: 90,
      total: bookingData.quoteAmount > 0 ? bookingData.quoteAmount : 580,
      deposit: (bookingData.quoteAmount > 0 ? bookingData.quoteAmount : 580) * 0.5,
      balance: (bookingData.quoteAmount > 0 ? bookingData.quoteAmount : 580) * 0.5,
    }

    return (
      <Card className="m-4 border-orange-200 bg-white dark:bg-zinc-900 shadow-lg">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-orange-200">
            <FileText className="h-5 w-5 text-orange-500" />
            <p className="font-semibold text-foreground text-lg">Your Quote is Ready!</p>
          </div>

          {/* Quote Summary */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-lg p-4 mb-4 border border-orange-200 dark:border-orange-800">
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground mb-1">Total Quote</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">${pricing.total.toFixed(2)}</p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Call-out Fee</span>
                <span className="font-medium">${pricing.baseCharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Distance ({routeDistance?.km.toFixed(0) || 0} km)</span>
                <span className="font-medium">${pricing.distanceCharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Labour (2 movers)</span>
                <span className="font-medium">${pricing.labourCharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vehicle & Equipment</span>
                <span className="font-medium">${pricing.timeCharge.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Deposit Info */}
          <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 mb-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-700 dark:text-green-400">Secure Your Booking</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Pay a 50% deposit of <span className="font-bold text-green-600">${pricing.deposit.toFixed(2)}</span> now.
              Balance of ${pricing.balance.toFixed(2)} due on moving day.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-lg"
              onClick={() => handleQuoteConfirmation(true)}
            >
              <CreditCard className="mr-2 h-5 w-5" />
              Proceed to Payment
            </Button>
            <Button variant="outline" className="w-full bg-transparent" onClick={() => handleQuoteConfirmation(false)}>
              I have questions about this quote
            </Button>
          </div>

          {/* Trust Badges */}
          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <div className="flex justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3" /> $10M Insured
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> $0 Claims
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> 24-48hr Response
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

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
    setShowCustomTimeInput(false)
    setCustomTimeValue("")
    setShowABNLookup(false)
    setShowAddressInput(null)
    setShowPayment(false)
    setShowConfirmation(false)
    setShowInventory(false)
    setShowQuoteConfirmation(false)
    setInventoryItems({})
    setSpecialRequirements("")
    setQuoteOption(null)

    // Reset search/input state
    setAbnSearchQuery("")
    setAbnSearchResults([])
    setAddressSearchQuery("")
    setAddressInput({
      street: "",
      suburb: "",
      state: "",
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
            {showInventory && renderInventory()}
            {showQuoteConfirmation && renderQuoteConfirmation()}
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
