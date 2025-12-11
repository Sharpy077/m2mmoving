"use client"

import type React from "react"
import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useMemo, useCallback } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import {
  Send,
  Building2,
  Warehouse,
  Server,
  ShoppingBag,
  Monitor,
  Stethoscope,
  Factory,
  Truck,
  CalendarIcon,
  Clock,
  MapPin,
  Search,
  CreditCard,
  CheckCircle2,
  Loader2,
} from "lucide-react"
import { format } from "date-fns"
import { loadStripe } from "@stripe/stripe-js"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { createCheckoutSession } from "@/app/actions/create-checkout-session"
import { sendBookingConfirmation } from "@/app/actions/send-confirmation"

const M2M_PHONE = "03 8820 1801"
const M2M_PHONE_LINK = "tel:0388201801"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// Service options for the picker
const serviceOptions = [
  { id: "office", label: "Office Relocation", icon: Building2, description: "Corporate office moves" },
  { id: "warehouse", label: "Warehouse Move", icon: Warehouse, description: "Industrial relocations" },
  { id: "datacentre", label: "Data Centre", icon: Server, description: "IT infrastructure" },
  { id: "retail", label: "Retail Fit-out", icon: ShoppingBag, description: "Shop relocations" },
  { id: "it-equipment", label: "IT Equipment", icon: Monitor, description: "Tech & electronics" },
  { id: "medical", label: "Medical & Lab", icon: Stethoscope, description: "Healthcare moves" },
  { id: "factory", label: "Factory & Plant", icon: Factory, description: "Manufacturing" },
  { id: "logistics", label: "Logistics Hub", icon: Truck, description: "Distribution centres" },
]

// Types
interface BusinessInfo {
  name: string
  abn: string
  entityType?: string
  state?: string
}

interface AddressInfo {
  street: string
  suburb: string
  state: string
  postcode: string
}

interface BookingData {
  serviceType: string
  business: BusinessInfo | null
  originAddress: AddressInfo | null
  destinationAddress: AddressInfo | null
  preferredDate: Date | null
  preferredTime: string
  inventory: string
  specialRequirements: string
  contactName: string
  contactEmail: string
  contactPhone: string
  quoteAmount: number
  quoteReference: string
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
  const [addressInput, setAddressInput] = useState<AddressInfo>({
    street: "",
    suburb: "",
    state: "VIC",
    postcode: "",
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Memoize transport to prevent recreation
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/quote-assistant",
      }),
    [],
  )

  const { messages, sendMessage, status, error } = useChat({
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
    const addressString = `${address.street}, ${address.suburb} ${address.state} ${address.postcode}`

    if (type === "origin") {
      setBookingData((prev) => ({ ...prev, originAddress: address }))
      sendMessage({ text: `Moving FROM: ${addressString}` })
      setShowAddressInput("destination")
    } else {
      setBookingData((prev) => ({ ...prev, destinationAddress: address }))
      sendMessage({ text: `Moving TO: ${addressString}` })
      setShowAddressInput(null)
      // Show date picker after addresses
      setTimeout(() => setShowDatePicker(true), 1000)
    }
    setAddressInput({ street: "", suburb: "", state: "VIC", postcode: "" })
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
    const dateStr = bookingData.preferredDate ? format(bookingData.preferredDate, "EEEE, MMMM do yyyy") : ""
    sendMessage({ text: `I'd like to book for ${dateStr} at ${time}` })
  }

  // Payment handling
  const initiatePayment = async () => {
    setIsProcessingPayment(true)
    try {
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
    } catch (err) {
      console.error("Payment initiation failed:", err)
    } finally {
      setIsProcessingPayment(false)
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
        moveDate: bookingData.preferredDate ? format(bookingData.preferredDate, "PPP") : "",
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
      <div className="grid grid-cols-2 gap-2">
        {serviceOptions.map((service) => (
          <Card
            key={service.id}
            className="cursor-pointer hover:border-orange-500 transition-colors"
            onClick={() => handleServiceSelect(service.id, service.label)}
          >
            <CardContent className="p-3 flex flex-col items-center text-center">
              <service.icon className="h-6 w-6 text-orange-500 mb-2" />
              <p className="text-sm font-medium text-foreground">{service.label}</p>
              <p className="text-xs text-muted-foreground">{service.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  // Render ABN Lookup
  const renderABNLookup = () => (
    <Card className="m-4 border-orange-200 bg-orange-50 dark:bg-orange-950/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Search className="h-5 w-5 text-orange-500" />
          <p className="font-medium text-foreground">Business Lookup</p>
        </div>
        <p className="text-sm text-muted-foreground mb-3">Search by ABN or business name to auto-fill your details</p>
        <div className="flex gap-2 mb-3">
          <Input
            value={abnSearchQuery}
            onChange={(e) => setAbnSearchQuery(e.target.value)}
            placeholder="Enter ABN or business name..."
            onKeyDown={(e) => e.key === "Enter" && handleABNSearch()}
          />
          <Button onClick={handleABNSearch} disabled={isSearchingABN} className="bg-orange-500 hover:bg-orange-600">
            {isSearchingABN ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
        {abnSearchResults.length > 0 && (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {abnSearchResults.map((biz, idx) => (
              <div
                key={idx}
                className="p-2 bg-background rounded border cursor-pointer hover:border-orange-500"
                onClick={() => handleSelectBusiness(biz)}
              >
                <p className="font-medium text-sm text-foreground">{biz.name}</p>
                <p className="text-xs text-muted-foreground">ABN: {biz.abn}</p>
              </div>
            ))}
          </div>
        )}
        <Button
          variant="ghost"
          className="mt-2 text-sm"
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
    <Card className="m-4 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-5 w-5 text-blue-500" />
          <p className="font-medium text-foreground">{showAddressInput === "origin" ? "Moving FROM" : "Moving TO"}</p>
        </div>
        <div className="space-y-3">
          <Input
            value={addressInput.street}
            onChange={(e) => setAddressInput((prev) => ({ ...prev, street: e.target.value }))}
            placeholder="Street address (e.g., 123 Main Street)"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={addressInput.suburb}
              onChange={(e) => setAddressInput((prev) => ({ ...prev, suburb: e.target.value }))}
              placeholder="Suburb"
            />
            <select
              value={addressInput.state}
              onChange={(e) => setAddressInput((prev) => ({ ...prev, state: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
          <Input
            value={addressInput.postcode}
            onChange={(e) => setAddressInput((prev) => ({ ...prev, postcode: e.target.value }))}
            placeholder="Postcode"
            maxLength={4}
          />
          <Button
            onClick={() => handleAddressSubmit(showAddressInput!)}
            className="w-full bg-blue-500 hover:bg-blue-600"
            disabled={!addressInput.street || !addressInput.suburb || !addressInput.postcode}
          >
            Confirm Address
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  // Render Date Picker
  const renderDatePicker = () => (
    <Card className="m-4 border-green-200 bg-green-50 dark:bg-green-950/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarIcon className="h-5 w-5 text-green-500" />
          <p className="font-medium text-foreground">Select Move Date</p>
        </div>
        <Calendar
          mode="single"
          selected={bookingData.preferredDate || undefined}
          onSelect={handleDateSelect}
          disabled={(date) => date < new Date()}
          className="rounded-md border bg-background"
        />
      </CardContent>
    </Card>
  )

  // Render Time Picker
  const renderTimePicker = () => (
    <Card className="m-4 border-green-200 bg-green-50 dark:bg-green-950/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-5 w-5 text-green-500" />
          <p className="font-medium text-foreground">Select Time Slot</p>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          {bookingData.preferredDate && format(bookingData.preferredDate, "EEEE, MMMM do yyyy")}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {["7:00 AM - 12:00 PM", "12:00 PM - 5:00 PM", "Custom Time"].map((time) => (
            <Button
              key={time}
              variant="outline"
              className="justify-start bg-transparent"
              onClick={() => handleTimeSelect(time)}
            >
              {time}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
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
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{
                clientSecret: paymentClientSecret,
                onComplete: handlePaymentComplete,
              }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
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
            <strong>Date:</strong> {bookingData.preferredDate && format(bookingData.preferredDate, "PPP")}
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      sendMessage({ text: input })
      setInput("")
    }
  }

  if (!isVisible) return null

  return (
    <div
      ref={chatContainerRef}
      className="flex flex-col h-[500px] max-h-[80dvh] md:max-h-[500px] bg-background rounded-lg border shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-orange-500 to-red-500 shrink-0">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-white" />
          <span className="font-semibold text-white">M&M Moving</span>
        </div>
        <Badge variant="secondary" className="bg-white/20 text-white">
          {isLoading ? "Maya is typing..." : "Online"}
        </Badge>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scroll-smooth overscroll-contain">
        {showServicePicker && messages.length === 0 ? (
          renderServicePicker()
        ) : (
          <div className="p-4 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === "user" ? "bg-orange-500 text-white" : "bg-muted text-foreground"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-1">
                      <Truck className="h-4 w-4 text-orange-500" />
                      <span className="text-xs font-medium text-orange-500">Maya</span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{getTextFromMessage(message)}</p>
                </div>
              </div>
            ))}

            {/* Interactive Components */}
            {showABNLookup && renderABNLookup()}
            {showAddressInput && renderAddressInput()}
            {showDatePicker && renderDatePicker()}
            {showTimePicker && renderTimePicker()}
            {showPayment && renderPayment()}
            {showConfirmation && renderConfirmation()}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
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
      <div className="p-4 border-t shrink-0 bg-background">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
            autoComplete="off"
            autoFocus={false}
          />
          <Button type="submit" disabled={!input.trim() || isLoading} className="bg-orange-500 hover:bg-orange-600">
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
