"use client"

import type React from "react"

import { useChat } from "@ai-sdk/react"
import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Loader2,
  Phone,
  MessageCircle,
  X,
  Minimize2,
  Maximize2,
  Building2,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
} from "lucide-react"
import { submitLead } from "@/app/actions/leads"
import { loadStripe } from "@stripe/stripe-js"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { createDepositCheckout } from "@/app/actions/stripe"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface QuoteEstimate {
  moveType: string
  moveTypeKey?: string
  squareMeters: number
  origin: string
  destination: string
  estimatedTotal: number
  depositRequired: number
  additionalServices?: string[]
  breakdown: {
    baseRate: number
    areaCost: number
    distanceCost: number
    servicesCost: number
  }
  showAvailability?: boolean
}

interface BusinessResult {
  abn: string
  name: string
  tradingName?: string
  entityType?: string
  state: string
  postcode?: string
  status: string
}

interface AvailableDate {
  date: string
  slotsRemaining: number
}

interface ContactInfo {
  contactName: string
  email: string
  phone: string
  companyName?: string
  abn?: string
  scheduledDate?: string
}

interface PaymentInfo {
  amount: number
  customerEmail: string
  customerName: string
  description: string
}

const suggestedPrompts = [
  "I need to move my office",
  "Data centre relocation quote",
  "IT equipment transport",
  "Warehouse move",
]

export interface QuoteAssistantHandle {
  open: () => void
}

interface QuoteAssistantProps {
  embedded?: boolean
  onScrolledAway?: (isAway: boolean) => void
}

export const QuoteAssistant = forwardRef<QuoteAssistantHandle, QuoteAssistantProps>(
  ({ embedded = false, onScrolledAway }, ref) => {
    const [isOpen, setIsOpen] = useState(embedded)
    const [isMinimized, setIsMinimized] = useState(false)
    const [inputValue, setInputValue] = useState("")
    const [isListening, setIsListening] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [voiceEnabled, setVoiceEnabled] = useState(false)
    const [currentQuote, setCurrentQuote] = useState<QuoteEstimate | null>(null)
    const [isSubmittingLead, setIsSubmittingLead] = useState(false)
    const [leadSubmitted, setLeadSubmitted] = useState(false)
    const [businessLookupResults, setBusinessLookupResults] = useState<BusinessResult[] | null>(null)
    const [confirmedBusiness, setConfirmedBusiness] = useState<BusinessResult | null>(null)
    const [showCalendar, setShowCalendar] = useState(false)
    const [availableDates, setAvailableDates] = useState<AvailableDate[]>([])
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [calendarMonth, setCalendarMonth] = useState(new Date())
    const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null)
    const [showPayment, setShowPayment] = useState(false)
    const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)
    const [paymentComplete, setPaymentComplete] = useState(false)
    const [hasStarted, setHasStarted] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const recognitionRef = useRef<any>(null)
    const synthRef = useRef<SpeechSynthesis | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    useImperativeHandle(ref, () => ({
      open: () => {
        setIsOpen(true)
        setIsMinimized(false)
      },
    }))

    const { messages, append, isLoading, error, setMessages } = useChat({
      api: "/api/quote-assistant",
      onError: (err) => {
        console.log("[v0] Chat error:", err)
      },
      onFinish: (message) => {
        console.log("[v0] Message finished:", message.role)
      },
    })

    useEffect(() => {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage?.role === "assistant" && lastMessage.toolInvocations) {
        lastMessage.toolInvocations.forEach((toolCall: any) => {
          if (toolCall.state === "result") {
            const result = toolCall.result

            if (toolCall.toolName === "lookupBusiness" && result?.results?.length > 0) {
              setBusinessLookupResults(result.results)
            }

            if (toolCall.toolName === "calculateQuote" && result?.estimatedTotal) {
              setCurrentQuote(result)
              if (result.showAvailability) {
                setShowCalendar(true)
              }
            }

            if (toolCall.toolName === "checkAvailability" && result?.showCalendar) {
              setShowCalendar(true)
              if (result.availableDates) {
                setAvailableDates(result.availableDates)
              }
            }

            if (toolCall.toolName === "confirmBookingDate" && result?.confirmedDate) {
              setSelectedDate(result.confirmedDate)
              setShowCalendar(false)
            }

            if (toolCall.toolName === "collectContactInfo" && result?.contactInfo) {
              setContactInfo(result.contactInfo)
              if (result.showPayment) {
                setShowPayment(true)
              }
            }

            if (toolCall.toolName === "initiatePayment" && result?.showStripePayment) {
              setPaymentInfo({
                amount: result.amount,
                customerEmail: result.customerEmail,
                customerName: result.customerName,
                description: result.description,
              })
            }
          }
        })
      }
    }, [messages])

    useEffect(() => {
      if ((isOpen || embedded) && !hasStarted && messages.length === 0) {
        setHasStarted(true)
        // Send initial greeting trigger
        setTimeout(() => {
          append({
            role: "user",
            content: "Hi, I'd like to get a quote for a commercial move.",
          })
        }, 500)
      }
    }, [isOpen, embedded, hasStarted, messages.length, append])

    // Scroll to bottom on new messages
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, businessLookupResults, currentQuote, showCalendar, showPayment])

    // Initialize speech synthesis
    useEffect(() => {
      if (typeof window !== "undefined") {
        synthRef.current = window.speechSynthesis
      }
    }, [])

    // Speak assistant messages
    useEffect(() => {
      if (!voiceEnabled || !synthRef.current) return
      const lastMessage = messages[messages.length - 1]
      if (lastMessage?.role === "assistant" && !isLoading) {
        const textContent = typeof lastMessage.content === "string" ? lastMessage.content : ""
        if (textContent && textContent.length < 500) {
          const utterance = new SpeechSynthesisUtterance(textContent)
          utterance.lang = "en-AU"
          utterance.rate = 1.0
          utterance.onstart = () => setIsSpeaking(true)
          utterance.onend = () => setIsSpeaking(false)
          synthRef.current.speak(utterance)
        }
      }
    }, [messages, isLoading, voiceEnabled])

    // Initialize speech recognition
    useEffect(() => {
      if (typeof window !== "undefined") {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition()
          recognition.continuous = false
          recognition.interimResults = false
          recognition.lang = "en-AU"
          recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript
            setInputValue(transcript)
            setIsListening(false)
            setTimeout(() => {
              append({ role: "user", content: transcript })
              setInputValue("")
            }, 300)
          }
          recognition.onerror = () => setIsListening(false)
          recognition.onend = () => setIsListening(false)
          recognitionRef.current = recognition
        }
      }
    }, [append])

    const toggleListening = () => {
      if (!recognitionRef.current) return
      if (isListening) {
        recognitionRef.current.stop()
        setIsListening(false)
      } else {
        if (synthRef.current) synthRef.current.cancel()
        recognitionRef.current.start()
        setIsListening(true)
      }
    }

    const handleSendMessage = () => {
      if (!inputValue.trim() || isLoading) return
      const text = inputValue
      setInputValue("")
      setBusinessLookupResults(null)
      append({ role: "user", content: text })
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSendMessage()
      }
    }

    const handleSelectBusiness = (business: BusinessResult) => {
      setConfirmedBusiness(business)
      setBusinessLookupResults(null)
      append({
        role: "user",
        content: `Yes, that's correct - ${business.name} (ABN: ${business.abn})`,
      })
    }

    const handleSelectDate = (date: string) => {
      setSelectedDate(date)
      setShowCalendar(false)
      const formattedDate = new Date(date).toLocaleDateString("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
      append({
        role: "user",
        content: `I'd like to book for ${formattedDate}`,
      })
    }

    const handlePromptClick = (prompt: string) => {
      append({ role: "user", content: prompt })
    }

    const fetchClientSecret = useCallback(async () => {
      if (!currentQuote || !contactInfo) return ""

      try {
        const clientSecret = await createDepositCheckout({
          amount: currentQuote.depositRequired,
          customerEmail: contactInfo.email,
          customerName: contactInfo.contactName,
          description: `Deposit for ${currentQuote.moveType}: ${currentQuote.origin} to ${currentQuote.destination}`,
          moveType: currentQuote.moveType,
          origin: currentQuote.origin,
          destination: currentQuote.destination,
          scheduledDate: selectedDate || undefined,
        })
        return clientSecret
      } catch (error) {
        console.error("[v0] Failed to create checkout:", error)
        return ""
      }
    }, [currentQuote, contactInfo, selectedDate])

    const handlePaymentComplete = async () => {
      setPaymentComplete(true)

      // Submit lead to database
      if (currentQuote && contactInfo) {
        try {
          await submitLead({
            lead_type: "instant_quote",
            company_name: confirmedBusiness?.name || contactInfo.companyName || "",
            contact_name: contactInfo.contactName,
            email: contactInfo.email,
            phone: contactInfo.phone,
            move_type: currentQuote.moveTypeKey || "office",
            square_meters: currentQuote.squareMeters,
            origin_suburb: currentQuote.origin,
            destination_suburb: currentQuote.destination,
            estimated_total: currentQuote.estimatedTotal,
            deposit_amount: currentQuote.depositRequired,
            additional_services: currentQuote.additionalServices || [],
            scheduled_date: selectedDate || undefined,
            payment_status: "deposit_paid",
            deposit_paid: true,
          })
          setLeadSubmitted(true)
        } catch (error) {
          console.error("[v0] Failed to submit lead:", error)
        }
      }

      append({
        role: "user",
        content: "Payment completed",
      })
    }

    // Message bubble component
    const MessageBubble = ({ message }: { message: any }) => {
      const isUser = message.role === "user"
      const content = typeof message.content === "string" ? message.content : ""

      // Don't show empty messages or just "start" messages
      if (!content.trim() || content.toLowerCase() === "start") return null

      // Don't show the auto-generated initial message from user
      if (
        isUser &&
        content === "Hi, I'd like to get a quote for a commercial move." &&
        messages.indexOf(message) === 0
      ) {
        return null
      }

      return (
        <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
          <div
            className={cn(
              "max-w-[85%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap",
              isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
            )}
          >
            {content}
          </div>
        </div>
      )
    }

    // Business lookup card
    const BusinessLookupCard = ({
      results,
      onSelect,
    }: {
      results: BusinessResult[]
      onSelect: (b: BusinessResult) => void
    }) => (
      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="p-3">
          <p className="text-xs text-blue-700 dark:text-blue-300 mb-2 font-medium">
            Found {results.length} matching business{results.length > 1 ? "es" : ""}. Tap to confirm:
          </p>
          <div className="space-y-2">
            {results.slice(0, 3).map((business) => (
              <button
                key={business.abn}
                onClick={() => onSelect(business)}
                className="w-full text-left p-2 bg-background rounded-lg border hover:border-primary transition-colors"
              >
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{business.name}</p>
                    {business.tradingName && (
                      <p className="text-xs text-muted-foreground">Trading as: {business.tradingName}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      ABN: {business.abn} | {business.state}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    )

    // Confirmed business badge
    const ConfirmedBusinessBadge = ({ business }: { business: BusinessResult }) => (
      <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-green-800 dark:text-green-200">{business.name}</p>
          <p className="text-xs text-green-700 dark:text-green-300">ABN: {business.abn}</p>
        </div>
      </div>
    )

    // Quote card
    const QuoteCard = ({ quote }: { quote: QuoteEstimate }) => (
      <Card className="bg-primary/5 border-primary/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm">Your Quote Estimate</p>
            <Badge variant="outline" className="text-xs">
              {quote.moveType}
            </Badge>
          </div>
          <div className="text-3xl font-bold text-primary mb-3">${quote.estimatedTotal.toLocaleString()}</div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Route:</span>
              <span className="text-foreground">
                {quote.origin} → {quote.destination}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Size:</span>
              <span className="text-foreground">{quote.squareMeters} sqm</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between">
                <span>Base rate:</span>
                <span>${quote.breakdown.baseRate.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Area cost:</span>
                <span>${quote.breakdown.areaCost.toLocaleString()}</span>
              </div>
              {quote.breakdown.distanceCost > 0 && (
                <div className="flex justify-between">
                  <span>Distance:</span>
                  <span>${quote.breakdown.distanceCost.toLocaleString()}</span>
                </div>
              )}
              {quote.breakdown.servicesCost > 0 && (
                <div className="flex justify-between">
                  <span>Services:</span>
                  <span>${quote.breakdown.servicesCost.toLocaleString()}</span>
                </div>
              )}
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between font-semibold text-primary">
                <span>50% Deposit Required:</span>
                <span>${quote.depositRequired.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )

    // Calendar picker
    const CalendarPicker = () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
      const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0)
      const startPadding = monthStart.getDay()

      const days: (Date | null)[] = []

      for (let i = 0; i < startPadding; i++) {
        days.push(null)
      }

      for (let d = 1; d <= monthEnd.getDate(); d++) {
        days.push(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), d))
      }

      const isDateAvailable = (date: Date): boolean => {
        const dateStr = date.toISOString().split("T")[0]
        const dayOfWeek = date.getDay()
        if (dayOfWeek === 0 || dayOfWeek === 6) return false
        if (date < today) return false
        const availability = availableDates.find((d) => d.date === dateStr)
        return !availability || availability.slotsRemaining > 0
      }

      const getSlotsRemaining = (date: Date): number | null => {
        const dateStr = date.toISOString().split("T")[0]
        const availability = availableDates.find((d) => d.date === dateStr)
        return availability?.slotsRemaining ?? null
      }

      const prevMonth = () => {
        setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))
      }

      const nextMonth = () => {
        setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))
      }

      const canGoPrev = calendarMonth > new Date(today.getFullYear(), today.getMonth(), 1)

      return (
        <Card className="bg-background border-primary/30">
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Select Moving Date
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth} disabled={!canGoPrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium w-28 text-center">
                  {calendarMonth.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <div key={day} className="text-center text-xs text-muted-foreground font-medium py-1">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((date, i) => {
                if (!date) {
                  return <div key={`empty-${i}`} className="h-9" />
                }

                const isAvailable = isDateAvailable(date)
                const isPast = date < today
                const isWeekend = date.getDay() === 0 || date.getDay() === 6
                const slots = getSlotsRemaining(date)
                const dateStr = date.toISOString().split("T")[0]
                const isSelected = selectedDate === dateStr

                return (
                  <button
                    key={dateStr}
                    onClick={() => isAvailable && handleSelectDate(dateStr)}
                    disabled={!isAvailable}
                    className={cn(
                      "h-9 rounded-md text-sm relative transition-colors",
                      isPast || isWeekend
                        ? "text-muted-foreground/40 cursor-not-allowed"
                        : isAvailable
                          ? "hover:bg-primary hover:text-primary-foreground cursor-pointer"
                          : "text-muted-foreground/40 cursor-not-allowed line-through",
                      isSelected && "bg-primary text-primary-foreground",
                      slots !== null && slots <= 1 && isAvailable && "bg-amber-50 dark:bg-amber-950/20",
                    )}
                  >
                    {date.getDate()}
                    {slots !== null && slots <= 1 && isAvailable && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500" />
                    )}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-amber-50 dark:bg-amber-950 border" />
                <span>Limited slots</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    const PaymentSection = () => {
      if (!currentQuote || !contactInfo) return null

      if (paymentComplete) {
        return (
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-1">Payment Successful!</h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Your booking is confirmed. You'll receive a confirmation email and invoice shortly.
              </p>
            </CardContent>
          </Card>
        )
      }

      return (
        <Card className="border-primary/30">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Secure Deposit Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="mb-3 p-2 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Deposit Amount:</span>
                <span className="font-semibold">${currentQuote.depositRequired.toLocaleString()}</span>
              </div>
            </div>
            <div className="min-h-[300px]">
              <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          </CardContent>
        </Card>
      )
    }

    // Render embedded version
    if (embedded) {
      return (
        <div
          ref={containerRef}
          className="w-full h-[500px] flex flex-col bg-background rounded-xl border shadow-lg overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary rounded-lg">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">AI Quote Assistant</h3>
                <p className="text-xs text-muted-foreground">Get an instant quote</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                title={voiceEnabled ? "Mute voice" : "Enable voice"}
              >
                {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {confirmedBusiness && <ConfirmedBusinessBadge business={confirmedBusiness} />}

            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {businessLookupResults && businessLookupResults.length > 0 && (
              <BusinessLookupCard results={businessLookupResults} onSelect={handleSelectBusiness} />
            )}

            {currentQuote && <QuoteCard quote={currentQuote} />}

            {showCalendar && availableDates.length > 0 && <CalendarPicker />}

            {showPayment && <PaymentSection />}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-xl px-4 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                Something went wrong. Please try again.
              </div>
            )}

            {messages.length <= 1 && !isLoading && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">Quick options:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestedPrompts.map((prompt) => (
                    <Button
                      key={prompt}
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 bg-transparent"
                      onClick={() => handlePromptClick(prompt)}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="w-full px-4 py-2.5 pr-10 rounded-full border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={isLoading}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8",
                    isListening && "text-red-500 animate-pulse",
                  )}
                  onClick={toggleListening}
                  disabled={isLoading}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                size="icon"
                className="h-10 w-10 rounded-full shrink-0"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
              <a href="tel:1300123456" className="flex items-center gap-1 hover:text-primary">
                <Phone className="h-3 w-3" />
                <span>1300 123 456</span>
              </a>
            </div>
          </div>
        </div>
      )
    }

    // Floating version
    if (!isOpen) {
      return (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg z-50"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )
    }

    if (isMinimized) {
      return (
        <div
          className="fixed bottom-4 right-4 bg-primary text-primary-foreground rounded-full px-4 py-2 shadow-lg cursor-pointer z-50 flex items-center gap-2"
          onClick={() => setIsMinimized(false)}
        >
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">Quote Assistant</span>
          <Maximize2 className="h-4 w-4" />
        </div>
      )
    }

    return (
      <div className="fixed bottom-4 right-4 w-[380px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-2rem)] z-50">
        <Card className="h-full flex flex-col shadow-2xl">
          {/* Header */}
          <CardHeader className="p-3 border-b flex-row items-center justify-between space-y-0 bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary rounded-lg">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-sm">AI Quote Assistant</CardTitle>
                <p className="text-xs text-muted-foreground">Get an instant quote</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setVoiceEnabled(!voiceEnabled)}>
                {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsMinimized(true)}>
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          {/* Messages */}
          <CardContent className="flex-1 overflow-y-auto p-3 space-y-3">
            {confirmedBusiness && <ConfirmedBusinessBadge business={confirmedBusiness} />}

            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {businessLookupResults && businessLookupResults.length > 0 && (
              <BusinessLookupCard results={businessLookupResults} onSelect={handleSelectBusiness} />
            )}

            {currentQuote && <QuoteCard quote={currentQuote} />}

            {showCalendar && availableDates.length > 0 && <CalendarPicker />}

            {showPayment && <PaymentSection />}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-xl px-4 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                Something went wrong. Please try again.
              </div>
            )}

            {messages.length <= 1 && !isLoading && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">Quick options:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestedPrompts.map((prompt) => (
                    <Button
                      key={prompt}
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 bg-transparent"
                      onClick={() => handlePromptClick(prompt)}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </CardContent>

          {/* Input */}
          <div className="p-3 border-t bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="w-full px-4 py-2.5 pr-10 rounded-full border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={isLoading}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8",
                    isListening && "text-red-500 animate-pulse",
                  )}
                  onClick={toggleListening}
                  disabled={isLoading}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                size="icon"
                className="h-10 w-10 rounded-full shrink-0"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  },
)

QuoteAssistant.displayName = "QuoteAssistant"
