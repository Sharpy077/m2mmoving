"use client"

import type React from "react"
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import {
  MessageSquare,
  X,
  Minimize2,
  Maximize2,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Building2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Phone,
  Bot,
  User,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { submitLead } from "@/app/actions/leads"
import { createDepositCheckout } from "@/app/actions/stripe"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface BusinessResult {
  name: string
  abn: string
  type: string
  state: string
  status: string
  tradingNames?: string[]
  address?: string
  gstRegistered?: boolean
}

interface QuoteEstimate {
  moveType: string
  moveTypeKey?: string
  estimatedTotal: number
  depositRequired: number
  hourlyRate: number
  estimatedHours: number
  crewSize: number
  truckSize: string
  squareMeters: number
  origin: string
  destination: string
  additionalServices?: string[]
  breakdown: {
    label: string
    amount: number
  }[]
  showAvailability?: boolean
}

interface AvailableDate {
  date: string
  available: boolean
  slots?: number
}

interface ContactInfo {
  contactName: string
  email: string
  phone: string
  companyName?: string
}

interface PaymentInfo {
  clientSecret: string
  amount: number
}

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
    const [hasError, setHasError] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
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

    const { messages, sendMessage, status, error, setMessages } = useChat({
      transport: new DefaultChatTransport({ api: "/api/quote-assistant" }),
      onError: (err) => {
        console.log("[v0] Chat error:", err.message)
        setHasError(true)
        setErrorMessage(err.message || "Failed to connect to the quote assistant")
      },
      onFinish: (message) => {
        console.log("[v0] Message finished:", message.role)
        setHasError(false)
        setErrorMessage(null)
      },
    })

    const isLoading = status === "streaming" || status === "submitted"

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

            if (toolCall.toolName === "checkAvailability" && result?.dates) {
              setAvailableDates(result.dates)
              setShowCalendar(true)
            }

            if (toolCall.toolName === "collectContactInfo" && result?.collected) {
              setContactInfo({
                contactName: result.contactName,
                email: result.email,
                phone: result.phone,
                companyName: result.companyName,
              })
            }

            if (toolCall.toolName === "initiatePayment" && result?.showPayment) {
              setShowPayment(true)
              setPaymentInfo({
                clientSecret: result.clientSecret || "",
                amount: result.amount,
              })
            }

            if (toolCall.toolName === "confirmBusiness" && result?.confirmed) {
              setConfirmedBusiness({
                name: result.name,
                abn: result.abn,
                type: result.type || "",
                state: result.state || "",
                status: "Active",
                address: result.address,
              })
            }
          }
        })
      }
    }, [messages])

    useEffect(() => {
      if ((isOpen || embedded) && !hasStarted && messages.length === 0) {
        setHasStarted(true)
        setTimeout(() => {
          sendMessage({
            text: "Hi, I'd like to get a quote for a commercial move.",
          })
        }, 500)
      }
    }, [isOpen, embedded, hasStarted, messages.length, sendMessage])

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
              sendMessage({ text: transcript })
              setInputValue("")
            }, 300)
          }
          recognition.onerror = () => setIsListening(false)
          recognition.onend = () => setIsListening(false)
          recognitionRef.current = recognition
        }
      }
    }, [sendMessage])

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
      sendMessage({ text })
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
      sendMessage({
        text: `Yes, that's correct - ${business.name} (ABN: ${business.abn})`,
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
      sendMessage({
        text: `I'd like to book for ${formattedDate}`,
      })
    }

    const handlePromptClick = (prompt: string) => {
      sendMessage({ text: prompt })
    }

    const fetchClientSecret = useCallback(async () => {
      if (!currentQuote || !contactInfo) return ""

      try {
        const clientSecret = await createDepositCheckout({
          amount: currentQuote.depositRequired,
          customerEmail: contactInfo.email,
          customerName: contactInfo.contactName,
          description: `Deposit for ${currentQuote.moveType}: ${currentQuote.origin} to ${currentQuote.destination}`,
          moveType: currentQuote.moveTypeKey || "office",
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

      sendMessage({
        text: "Payment completed",
      })
    }

    const handleReset = () => {
      setHasError(false)
      setErrorMessage(null)
      setMessages([])
      setHasStarted(false)
      setCurrentQuote(null)
      setBusinessLookupResults(null)
      setConfirmedBusiness(null)
      setShowCalendar(false)
      setShowPayment(false)
    }

    const handleRetry = () => {
      setHasError(false)
      setErrorMessage(null)
      if (messages.length === 0) {
        sendMessage({ text: "Hi, I'd like to get a quote for a commercial move." })
      }
    }

    // Message bubble component
    const MessageBubble = ({ message }: { message: any }) => {
      const isUser = message.role === "user"
      const content = typeof message.content === "string" ? message.content : ""

      return (
        <div className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
          {!isUser && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
          )}
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-2 ${
              isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{content}</p>
          </div>
          {isUser && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
        </div>
      )
    }

    // Calendar component
    const CalendarPicker = () => {
      const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate()
      const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay()
      const days = []

      for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="p-2" />)
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
        const dateInfo = availableDates.find((d) => d.date === dateStr)
        const isAvailable = dateInfo?.available !== false
        const isLimitedSlots = dateInfo?.slots !== undefined && dateInfo.slots <= 2
        const isPast = new Date(dateStr) < new Date()

        days.push(
          <button
            key={day}
            disabled={!isAvailable || isPast}
            onClick={() => handleSelectDate(dateStr)}
            className={`p-2 rounded-lg text-sm font-medium transition-colors ${
              !isAvailable || isPast
                ? "text-muted-foreground/40 cursor-not-allowed"
                : isLimitedSlots
                  ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                  : "bg-green-100 text-green-800 hover:bg-green-200"
            } ${selectedDate === dateStr ? "ring-2 ring-primary" : ""}`}
          >
            {day}
          </button>,
        )
      }

      return (
        <Card className="mt-3">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCalendarMonth(new Date(calendarMonth.setMonth(calendarMonth.getMonth() - 1)))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-medium">
                {calendarMonth.toLocaleDateString("en-AU", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCalendarMonth(new Date(calendarMonth.setMonth(calendarMonth.getMonth() + 1)))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <div key={d} className="text-xs font-medium text-muted-foreground p-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">{days}</div>
            <div className="flex gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-100" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-amber-100" />
                <span>Limited</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    // Quote display component
    const QuoteDisplay = () => {
      if (!currentQuote) return null

      return (
        <Card className="mt-3 border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span className="font-semibold">Your Quote</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Move Type:</span>
                <span className="font-medium">{currentQuote.moveType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">From:</span>
                <span className="font-medium">{currentQuote.origin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">To:</span>
                <span className="font-medium">{currentQuote.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Crew Size:</span>
                <span className="font-medium">{currentQuote.crewSize} movers</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Truck:</span>
                <span className="font-medium">{currentQuote.truckSize}</span>
              </div>
              <hr className="my-2" />
              {currentQuote.breakdown.map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-muted-foreground">{item.label}:</span>
                  <span className="font-medium">${item.amount.toLocaleString()}</span>
                </div>
              ))}
              <hr className="my-2" />
              <div className="flex justify-between text-base font-bold">
                <span>Estimated Total:</span>
                <span className="text-primary">${currentQuote.estimatedTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Deposit Required:</span>
                <span className="font-medium text-primary">${currentQuote.depositRequired.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    // Payment component
    const PaymentSection = () => {
      if (!showPayment || paymentComplete) return null

      return (
        <Card className="mt-3">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5 text-primary" />
              <span className="font-semibold">Secure Deposit Payment</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Pay your deposit of ${currentQuote?.depositRequired.toLocaleString()} to confirm your booking.
            </p>
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
            <Button variant="outline" size="sm" className="w-full mt-3 bg-transparent" onClick={handlePaymentComplete}>
              I've completed payment
            </Button>
          </CardContent>
        </Card>
      )
    }

    // Business lookup results component
    const BusinessLookupResults = () => {
      if (!businessLookupResults || businessLookupResults.length === 0) return null

      return (
        <div className="space-y-2 mt-3">
          <p className="text-sm text-muted-foreground">Is this your business? Click to confirm:</p>
          {businessLookupResults.map((business, i) => (
            <Card
              key={i}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => handleSelectBusiness(business)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-primary mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{business.name}</p>
                    <p className="text-xs text-muted-foreground">ABN: {business.abn}</p>
                    {business.tradingNames && business.tradingNames.length > 0 && (
                      <p className="text-xs text-muted-foreground">Trading as: {business.tradingNames[0]}</p>
                    )}
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {business.state}
                      </Badge>
                      {business.gstRegistered && (
                        <Badge variant="outline" className="text-xs">
                          GST Registered
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    // Confirmed business badge
    const ConfirmedBusinessBadge = () => {
      if (!confirmedBusiness) return null

      return (
        <div className="mx-4 my-2 p-2 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-800">
            {confirmedBusiness.name} (ABN: {confirmedBusiness.abn})
          </span>
        </div>
      )
    }

    const ErrorDisplay = () => {
      if (!hasError && !error) return null

      return (
        <div className="p-4 m-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-destructive mb-1">Connection Issue</p>
              <p className="text-sm text-muted-foreground mb-3">
                {errorMessage ||
                  "We're having trouble connecting to our quote system. Please try again or call us directly."}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Try Again
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="tel:+61388201801">
                    <Phone className="w-3 h-3 mr-1" />
                    03 8820 1801
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    const suggestedPrompts = ["Office relocation", "Warehouse move", "Retail fit-out", "Medical equipment"]

    const chatContent = (
      <div
        ref={containerRef}
        className={`flex flex-col bg-background ${
          embedded ? "h-[500px] rounded-xl border shadow-lg" : "h-[600px] md:h-[700px]"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-xl">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            <span className="font-semibold">M&M Quote Assistant</span>
          </div>
          <div className="flex items-center gap-1">
            {(hasError || messages.length > 0) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
                onClick={handleReset}
                title="Start over"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            {!embedded && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {(hasError || error) && <ErrorDisplay />}

        {/* Confirmed business badge */}
        {!hasError && <ConfirmedBusinessBadge />}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !hasStarted && (
            <div className="text-center py-8">
              <Bot className="w-12 h-12 mx-auto text-primary/30 mb-4" />
              <p className="text-muted-foreground mb-4">
                Hi! I'm your M&M quote assistant. I'll help you get an instant quote for your commercial move.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestedPrompts.map((prompt) => (
                  <Button
                    key={prompt}
                    variant="outline"
                    size="sm"
                    onClick={() => handlePromptClick(`I need a quote for a ${prompt.toLowerCase()}`)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div key={message.id || index}>
              <MessageBubble message={message} />
              {/* Show business lookup results after assistant message */}
              {message.role === "assistant" && index === messages.length - 1 && <BusinessLookupResults />}
            </div>
          ))}

          {/* Quote display */}
          {currentQuote && <QuoteDisplay />}

          {/* Calendar picker */}
          {showCalendar && <CalendarPicker />}

          {/* Payment section */}
          <PaymentSection />

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-2 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl px-4 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              Something went wrong. Please try again.
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-2">
            <Button
              variant={isListening ? "destructive" : "outline"}
              size="icon"
              onClick={toggleListening}
              disabled={isLoading}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening..." : "Type your message..."}
              disabled={isLoading || isListening}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} disabled={!inputValue.trim() || isLoading}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{isListening ? "🎤 Listening..." : isSpeaking ? "🔊 Speaking..." : ""}</span>
            <a href="tel:+61388201801" className="flex items-center gap-1 hover:text-primary">
              <Phone className="w-3 h-3" />
              Prefer to call? 03 8820 1801
            </a>
          </div>
        </div>
      </div>
    )

    if (embedded) {
      return chatContent
    }

    // Floating button and chat window for non-embedded mode
    return (
      <>
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
          >
            <MessageSquare className="w-6 h-6" />
          </button>
        )}

        {isOpen && (
          <div
            className={`fixed z-50 ${
              isMinimized ? "bottom-6 right-6 w-72" : "bottom-6 right-6 w-[400px] md:w-[450px]"
            } transition-all duration-200`}
          >
            <Card className="shadow-2xl overflow-hidden">
              {isMinimized ? (
                <div
                  className="p-4 bg-primary text-primary-foreground cursor-pointer flex items-center justify-between"
                  onClick={() => setIsMinimized(false)}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    <span className="font-semibold">M&M Quote Assistant</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsOpen(false)
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                chatContent
              )}
            </Card>
          </div>
        )}
      </>
    )
  },
)

QuoteAssistant.displayName = "QuoteAssistant"
