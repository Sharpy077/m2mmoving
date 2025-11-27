"use client"

import type React from "react"
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
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

    const { messages, sendMessage, status, error } = useChat({
      transport: new DefaultChatTransport({ api: "/api/quote-assistant" }),
      onError: (err) => {
        console.log("[v0] Chat error:", err.message)
        setHasError(true)
        setErrorMessage(err.message || "Failed to connect to the quote assistant")
      },
      onFinish: () => {
        setHasError(false)
        setErrorMessage(null)
      },
    })

    const isLoading = status === "in_progress" || status === "streaming" || status === "submitted"

    // Process tool results from messages
    useEffect(() => {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage?.role === "assistant") {
        // Check for parts with tool invocations
        if (lastMessage.parts) {
          lastMessage.parts.forEach((part: any) => {
            if (part.type?.startsWith("tool-") && part.state === "output-available") {
              const toolName = part.type.replace("tool-", "")
              const result = part.output

              if (toolName === "lookupBusiness" && result?.results?.length > 0) {
                setBusinessLookupResults(result.results)
              }

              if (toolName === "calculateQuote" && result?.estimatedTotal) {
                setCurrentQuote(result)
                if (result.showAvailability) {
                  setShowCalendar(true)
                }
              }

              if (toolName === "checkAvailability" && result?.dates) {
                setAvailableDates(result.dates)
                setShowCalendar(true)
              }

              if (toolName === "collectContactInfo" && result?.collected) {
                setContactInfo({
                  contactName: result.contactName,
                  email: result.email,
                  phone: result.phone,
                  companyName: result.companyName,
                })
              }

              if (toolName === "initiatePayment" && result?.showPayment) {
                setShowPayment(true)
                setPaymentInfo({
                  clientSecret: result.clientSecret || "",
                  amount: result.amount,
                })
              }

              if (toolName === "confirmBusiness" && result?.confirmed) {
                setConfirmedBusiness({
                  name: result.name,
                  abn: result.abn,
                  type: result.entityType || "",
                  state: result.state || "",
                  status: "Active",
                })
              }
            }
          })
        }

        // Also check toolInvocations for backwards compatibility
        if (lastMessage.toolInvocations) {
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
                  type: result.entityType || "",
                  state: result.state || "",
                  status: "Active",
                })
              }
            }
          })
        }
      }
    }, [messages])

    useEffect(() => {
      if ((isOpen || embedded) && !hasStarted && messages.length === 0) {
        setHasStarted(true)
        // Delay to ensure hook is ready
        const timer = setTimeout(() => {
          console.log("[v0] Starting conversation...")
          sendMessage({ text: "Hi, I'd like to get a quote for a commercial move." })
        }, 800)
        return () => clearTimeout(timer)
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
        // Extract text from parts
        let textContent = ""
        if (lastMessage.parts) {
          lastMessage.parts.forEach((part: any) => {
            if (part.type === "text") {
              textContent += part.text
            }
          })
        } else if (typeof lastMessage.content === "string") {
          textContent = lastMessage.content
        }

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

    const handlePaymentComplete = async () => {
      setPaymentComplete(true)
      if (currentQuote && contactInfo && selectedDate) {
        setIsSubmittingLead(true)
        try {
          await submitLead({
            company_name: confirmedBusiness?.name || contactInfo.companyName || "",
            contact_name: contactInfo.contactName,
            email: contactInfo.email,
            phone: contactInfo.phone,
            move_type: currentQuote.moveTypeKey || "office",
            origin_suburb: currentQuote.origin,
            destination_suburb: currentQuote.destination,
            estimated_value: currentQuote.estimatedTotal,
            status: "confirmed",
            notes: `Deposit paid. Move scheduled for ${selectedDate}. ABN: ${confirmedBusiness?.abn || "N/A"}`,
            scheduled_date: selectedDate,
            deposit_amount: currentQuote.depositRequired,
            deposit_paid: true,
          })
          setLeadSubmitted(true)
        } catch (error) {
          console.error("Failed to submit lead:", error)
        } finally {
          setIsSubmittingLead(false)
        }
      }
      sendMessage({
        text: "I've completed the payment.",
      })
    }

    const handleRetry = () => {
      setHasError(false)
      setErrorMessage(null)
      setHasStarted(false)
    }

    const handleCall = () => {
      window.location.href = "tel:+61388201801"
    }

    // Render message content
    const renderMessageContent = (message: any) => {
      if (message.parts) {
        return message.parts
          .map((part: any, index: number) => {
            if (part.type === "text") {
              return <span key={index}>{part.text}</span>
            }
            // Tool parts are handled separately
            return null
          })
          .filter(Boolean)
      }
      if (typeof message.content === "string") {
        return message.content
      }
      return null
    }

    // Error display component
    const ErrorDisplay = () => (
      <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Connection Issue</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {errorMessage || "We couldn't connect to Maya. Please try again."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRetry} variant="default" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button onClick={handleCall} variant="outline" size="sm">
            <Phone className="w-4 h-4 mr-2" />
            Call Us
          </Button>
        </div>
      </div>
    )

    // Calendar picker component
    const CalendarPicker = () => {
      const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate()
      const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay()
      const days = []

      for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="h-10" />)
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
        const availableDate = availableDates.find((d) => d.date === dateStr)
        const isAvailable = availableDate?.available
        const slots = availableDate?.slots || 0
        const isPast = new Date(dateStr) < new Date(new Date().toDateString())

        days.push(
          <button
            key={day}
            onClick={() => isAvailable && !isPast && handleSelectDate(dateStr)}
            disabled={!isAvailable || isPast}
            className={`h-10 rounded-lg text-sm font-medium transition-all ${
              isAvailable && !isPast
                ? slots <= 1
                  ? "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
                : "text-muted-foreground/40 cursor-not-allowed"
            } ${selectedDate === dateStr ? "ring-2 ring-primary" : ""}`}
          >
            {day}
          </button>,
        )
      }

      return (
        <Card className="mt-3 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCalendarMonth(new Date(calendarMonth.setMonth(calendarMonth.getMonth() - 1)))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-medium">
                {calendarMonth.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCalendarMonth(new Date(calendarMonth.setMonth(calendarMonth.getMonth() + 1)))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs text-muted-foreground">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">{days}</div>
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-primary/20" /> Available
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-amber-200 dark:bg-amber-900/50" /> Limited
              </span>
            </div>
          </CardContent>
        </Card>
      )
    }

    // Business lookup results
    const BusinessLookupResults = () => (
      <div className="space-y-2 mt-3">
        <p className="text-sm text-muted-foreground">Please confirm your business:</p>
        {businessLookupResults?.map((business, index) => (
          <Card
            key={index}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => handleSelectBusiness(business)}
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{business.name}</p>
                  <p className="text-xs text-muted-foreground">ABN: {business.abn}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {business.state}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {business.status}
                    </Badge>
                  </div>
                </div>
                <CheckCircle className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )

    // Quote display
    const QuoteDisplay = () => {
      if (!currentQuote) return null
      return (
        <Card className="mt-3 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Your Quote Estimate</h4>
              <Badge variant="secondary">{currentQuote.moveType}</Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">From</span>
                <span>{currentQuote.origin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">To</span>
                <span>{currentQuote.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size</span>
                <span>{currentQuote.squareMeters} sqm</span>
              </div>
              <hr className="my-2" />
              {currentQuote.breakdown.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span>${item.amount.toLocaleString()}</span>
                </div>
              ))}
              <hr className="my-2" />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total Estimate</span>
                <span className="text-primary">${currentQuote.estimatedTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Deposit Required (50%)</span>
                <span>${currentQuote.depositRequired.toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
              <p>
                <strong>Includes:</strong> {currentQuote.crewSize} crew members, {currentQuote.truckSize} truck,
                estimated {currentQuote.estimatedHours} hours
              </p>
            </div>
          </CardContent>
        </Card>
      )
    }

    // Payment component
    const PaymentComponent = () => {
      const [clientSecret, setClientSecret] = useState<string | null>(null)
      const [loadingPayment, setLoadingPayment] = useState(true)

      useEffect(() => {
        const initPayment = async () => {
          if (!currentQuote || !contactInfo) return
          try {
            const result = await createDepositCheckout({
              amount: currentQuote.depositRequired,
              customerEmail: contactInfo.email,
              customerName: contactInfo.contactName,
              moveType: currentQuote.moveType,
              origin: currentQuote.origin,
              destination: currentQuote.destination,
              scheduledDate: selectedDate || undefined,
              companyName: confirmedBusiness?.name,
              abn: confirmedBusiness?.abn,
            })
            if (result.clientSecret) {
              setClientSecret(result.clientSecret)
            }
          } catch (error) {
            console.error("Failed to create checkout:", error)
          } finally {
            setLoadingPayment(false)
          }
        }
        initPayment()
      }, [])

      if (paymentComplete) {
        return (
          <Card className="mt-3 border-green-500/30 bg-green-500/5">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <h4 className="font-semibold text-green-700 dark:text-green-400">Payment Successful!</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Your booking is confirmed. Check your email for details.
              </p>
            </CardContent>
          </Card>
        )
      }

      if (loadingPayment) {
        return (
          <Card className="mt-3">
            <CardContent className="p-6 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground mt-2">Setting up secure payment...</p>
            </CardContent>
          </Card>
        )
      }

      if (!clientSecret) {
        return (
          <Card className="mt-3 border-destructive/30">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Unable to set up payment. Please call us at 03 8820 1801.</p>
            </CardContent>
          </Card>
        )
      }

      return (
        <Card className="mt-3">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5 text-primary" />
              <h4 className="font-semibold">Secure Payment</h4>
            </div>
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ clientSecret, onComplete: handlePaymentComplete }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </CardContent>
        </Card>
      )
    }

    // Confirmed business badge
    const ConfirmedBusinessBadge = () => {
      if (!confirmedBusiness) return null
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full text-xs">
          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
          <span className="font-medium text-green-700 dark:text-green-400">{confirmedBusiness.name}</span>
          <span className="text-muted-foreground">ABN: {confirmedBusiness.abn}</span>
        </div>
      )
    }

    // Suggested prompts
    const SuggestedPrompts = () => (
      <div className="space-y-2 mt-4">
        <p className="text-xs text-muted-foreground">Quick options:</p>
        <div className="flex flex-wrap gap-2">
          {["Office move", "Warehouse relocation", "IT equipment", "Get a callback"].map((prompt) => (
            <Button
              key={prompt}
              variant="outline"
              size="sm"
              onClick={() => handlePromptClick(prompt)}
              className="text-xs"
            >
              {prompt}
            </Button>
          ))}
        </div>
      </div>
    )

    const chatContent = (
      <div className={`flex flex-col ${embedded ? "h-[500px]" : "h-full"}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold">Maya - Quote Assistant</h3>
              <p className="text-xs opacity-80">M&M Commercial Moving</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-white/20"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            {!embedded && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-white/20"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-white/20"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        {!isMinimized && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {hasError ? (
                <ErrorDisplay />
              ) : (
                <>
                  {confirmedBusiness && <ConfirmedBusinessBadge />}

                  {messages.length === 0 && !isLoading && (
                    <div className="text-center py-8">
                      <Bot className="w-12 h-12 mx-auto text-primary/50 mb-3" />
                      <p className="text-muted-foreground">Starting conversation...</p>
                    </div>
                  )}

                  {messages.map((message, index) => {
                    const content = renderMessageContent(message)
                    if (!content) return null

                    return (
                      <div key={message.id || index}>
                        <div className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                          {message.role === "assistant" && (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Bot className="w-4 h-4 text-primary" />
                            </div>
                          )}
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                              message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{content}</p>
                          </div>
                          {message.role === "user" && (
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-primary-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Show interactive elements after assistant messages */}
                        {message.role === "assistant" && index === messages.length - 1 && (
                          <>
                            {businessLookupResults && <BusinessLookupResults />}
                            {currentQuote && <QuoteDisplay />}
                            {showCalendar && availableDates.length > 0 && <CalendarPicker />}
                            {showPayment && <PaymentComponent />}
                            {messages.length === 1 && <SuggestedPrompts />}
                          </>
                        )}
                      </div>
                    )
                  })}

                  {isLoading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                      <div className="bg-muted rounded-2xl px-4 py-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" />
                          <div
                            className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          />
                          <div
                            className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Button
                  variant={isListening ? "destructive" : "outline"}
                  size="icon"
                  className="flex-shrink-0"
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
                  className="flex-1"
                  disabled={isLoading || isListening}
                />
                <Button onClick={handleSendMessage} disabled={!inputValue.trim() || isLoading} size="icon">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Or call us:{" "}
                <a href="tel:+61388201801" className="text-primary font-medium">
                  03 8820 1801
                </a>
              </p>
            </div>
          </>
        )}
      </div>
    )

    if (embedded) {
      return (
        <div ref={containerRef} className="w-full">
          <Card className="overflow-hidden shadow-xl">{chatContent}</Card>
        </div>
      )
    }

    if (!isOpen) {
      return (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          size="icon"
        >
          <MessageSquare className="w-6 h-6" />
        </Button>
      )
    }

    return (
      <div className="fixed bottom-6 right-6 w-[400px] max-w-[calc(100vw-3rem)] z-50">
        <Card className="overflow-hidden shadow-2xl">{chatContent}</Card>
      </div>
    )
  },
)

QuoteAssistant.displayName = "QuoteAssistant"
