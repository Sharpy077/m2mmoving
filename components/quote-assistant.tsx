"use client"

import type React from "react"
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { useChat } from "ai/react"

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
  Loader2,
  AlertTriangle,
  RefreshCw,
  Warehouse,
  Server,
  Monitor,
  Store,
  ArrowRight,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { submitLead } from "@/app/actions/leads"
import { createDepositCheckout } from "@/app/actions/stripe"
import { useFormPersistence } from "@/hooks/use-form-persistence"
import { PaymentConfirmation } from "@/components/payment-confirmation"
import { getStripeErrorMessage } from "@/lib/stripe-errors"

const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null

interface ServiceOption {
  id: string
  name: string
  icon: string
  description: string
}

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
  hourlyRate?: number
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

const ServiceIcon = ({ icon, className }: { icon: string; className?: string }) => {
  const iconClass = className || "h-6 w-6"
  switch (icon) {
    case "building":
      return <Building2 className={iconClass} />
    case "warehouse":
      return <Warehouse className={iconClass} />
    case "server":
      return <Server className={iconClass} />
    case "computer":
      return <Monitor className={iconClass} />
    case "store":
      return <Store className={iconClass} />
    default:
      return <Building2 className={iconClass} />
  }
}

const ServicePicker = ({
  services,
  onSelect,
}: {
  services: ServiceOption[]
  onSelect: (service: ServiceOption) => void
}) => {
  return (
    <div className="grid grid-cols-1 gap-2 my-3">
      {services.map((service) => (
        <button
          key={service.id}
          onClick={() => onSelect(service)}
          className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 transition-all text-left group"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <ServiceIcon icon={service.icon} className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground">{service.name}</div>
            <div className="text-xs text-muted-foreground truncate">{service.description}</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
      ))}
    </div>
  )
}

const InitialPrompts = ({ onSelect }: { onSelect: (prompt: string) => void }) => {
  const prompts = [
    { text: "I need to move my office", icon: Building2 },
    { text: "Data centre relocation", icon: Server },
    { text: "Just need IT equipment moved", icon: Monitor },
    { text: "I'd like to speak to someone", icon: Phone },
  ]

  return (
    <div className="space-y-3 my-4">
      <p className="text-sm text-muted-foreground text-center">Quick start - select an option or type below:</p>
      <div className="grid grid-cols-2 gap-2">
        {prompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSelect(prompt.text)}
            className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 transition-all text-left text-sm"
            aria-label={prompt.text}
          >
            <prompt.icon className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{prompt.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const BookingProgress = ({
  step,
}: {
  step: "business" | "service" | "details" | "quote" | "date" | "contact" | "payment" | "complete"
}) => {
  const steps = [
    { id: "business", label: "Business" },
    { id: "service", label: "Service" },
    { id: "details", label: "Details" },
    { id: "quote", label: "Quote" },
    { id: "date", label: "Date" },
    { id: "payment", label: "Book" },
  ]

  const currentIndex = steps.findIndex((s) => s.id === step)

  return (
    <div className="flex items-center justify-between px-2 py-2 bg-muted/50 rounded-lg mb-3">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${i < currentIndex
              ? "bg-primary text-primary-foreground"
              : i === currentIndex
                ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                : "bg-muted text-muted-foreground"
              }`}
          >
            {i < currentIndex ? <CheckCircle className="h-3 w-3" /> : i + 1}
          </div>
          {i < steps.length - 1 && <div className={`w-4 h-0.5 mx-1 ${i < currentIndex ? "bg-primary" : "bg-muted"}`} />}
        </div>
      ))}
    </div>
  )
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
    const [showServicePicker, setShowServicePicker] = useState(false)
    const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([])
    const [currentStep, setCurrentStep] = useState<
      "business" | "service" | "details" | "quote" | "date" | "contact" | "payment" | "complete"
    >("business")
    const [showInitialPrompts, setShowInitialPrompts] = useState(true)

    // Loading states
    const [isLookingUpBusiness, setIsLookingUpBusiness] = useState(false)
    const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
    const [isCalculatingQuote, setIsCalculatingQuote] = useState(false)

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

    const { messages, append, isLoading: isChatLoading, error } = useChat({
      api: "/api/quote-assistant",
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

    // Adapter for ai v4 compatibility
    const sendMessage = (message: { text: string }) => {
      append({
        role: "user",
        content: message.text,
      })
    }

    // Map status usage to boolean
    const status = isChatLoading ? "in_progress" : "ready"

    // Form persistence
    const formState = {
      currentQuote,
      contactInfo,
      selectedDate,
      confirmedBusiness,
      businessLookupResults,
      serviceOptions,
      showServicePicker,
    }

    const { loadSavedData, clearSavedData } = useFormPersistence(
      formState,
      "quote-assistant-state",
      !paymentComplete && !leadSubmitted,
    )

    // Load saved state on mount
    useEffect(() => {
      if (embedded && messages.length === 0) {
        const saved = loadSavedData()
        if (saved) {
          if (saved.currentQuote) setCurrentQuote(saved.currentQuote)
          if (saved.contactInfo) setContactInfo(saved.contactInfo)
          if (saved.selectedDate) setSelectedDate(saved.selectedDate)
          if (saved.confirmedBusiness) setConfirmedBusiness(saved.confirmedBusiness)
        }
      }
    }, [embedded])

    // Clear on successful completion
    useEffect(() => {
      if (paymentComplete || leadSubmitted) {
        clearSavedData()
      }
    }, [paymentComplete, leadSubmitted])

    // const isLoading = isChatLoading // status === "in_progress" || status === "streaming" || status === "submitted"
    const isLoading = isChatLoading

    useEffect(() => {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage?.role === "assistant") {
        if (lastMessage.parts) {
          lastMessage.parts.forEach((part: any) => {
            if (part.type?.startsWith("tool-") && part.state === "output-available") {
              const toolName = part.type.replace("tool-", "")
              const result = part.output

              if (toolName === "lookupBusiness") {
                setIsLookingUpBusiness(false)
                if (result?.results?.length > 0) {
                  setBusinessLookupResults(result.results)
                  setCurrentStep("business")
                }
              }

              if (toolName === "confirmBusiness" && result?.confirmed) {
                setConfirmedBusiness({
                  name: result.name,
                  abn: result.abn,
                  type: result.entityType || "",
                  state: result.state || "",
                  status: "Active",
                })
                setCurrentStep("service")
                if (result.showServiceOptions) {
                  setShowServicePicker(true)
                }
              }

              if (toolName === "showServiceOptions" && result?.showServicePicker) {
                setServiceOptions(result.services)
                setShowServicePicker(true)
                setCurrentStep("service")
              }

              if (toolName === "calculateQuote") {
                setIsCalculatingQuote(false)
                if (result?.estimatedTotal) {
                  setCurrentQuote(result)
                  setCurrentStep("quote")
                  if (result.showAvailability) {
                    setShowCalendar(true)
                  }
                }
              }

              if (toolName === "checkAvailability") {
                setIsCheckingAvailability(false)
                if (result?.dates) {
                  setAvailableDates(result.dates)
                  setShowCalendar(true)
                  setCurrentStep("date")
                }
              }

              if (toolName === "confirmBookingDate" && result?.confirmedDate) {
                setSelectedDate(result.confirmedDate)
                setCurrentStep("contact")
              }

              if (toolName === "collectContactInfo" && result?.collected) {
                setContactInfo({
                  contactName: result.contactName,
                  email: result.email,
                  phone: result.phone,
                  companyName: result.companyName,
                })
                setCurrentStep("payment")
              }

              if (toolName === "initiatePayment" && result?.showPayment) {
                setShowPayment(true)
                setPaymentInfo({
                  clientSecret: result.clientSecret || "",
                  amount: result.amount,
                })
                setCurrentStep("payment")
              }
            }
          })
        }

        // Backwards compatibility with toolInvocations
        if (lastMessage.toolInvocations) {
          lastMessage.toolInvocations.forEach((toolCall: any) => {
            if (toolCall.state === "result") {
              const result = toolCall.result

              if (toolCall.toolName === "lookupBusiness") {
                setIsLookingUpBusiness(false)
                if (result?.results?.length > 0) {
                  setBusinessLookupResults(result.results)
                }
              }

              if (toolCall.toolName === "confirmBusiness" && result?.confirmed) {
                setConfirmedBusiness({
                  name: result.name,
                  abn: result.abn,
                  type: result.entityType || "",
                  state: result.state || "",
                  status: "Active",
                })
                setCurrentStep("service")
              }

              if (toolCall.toolName === "showServiceOptions" && result?.showServicePicker) {
                setServiceOptions(result.services)
                setShowServicePicker(true)
              }

              if (toolCall.toolName === "calculateQuote") {
                setIsCalculatingQuote(false)
                if (result?.estimatedTotal) {
                  setCurrentQuote(result)
                  setCurrentStep("quote")
                }
              }

              if (toolCall.toolName === "checkAvailability") {
                setIsCheckingAvailability(false)
                if (result?.dates) {
                  setAvailableDates(result.dates)
                  setShowCalendar(true)
                  setCurrentStep("date")
                }
              }

              if (toolCall.toolName === "collectContactInfo" && result?.collected) {
                setContactInfo({
                  contactName: result.contactName,
                  email: result.email,
                  phone: result.phone,
                  companyName: result.companyName,
                })
                setCurrentStep("payment")
              }

              if (toolCall.toolName === "initiatePayment" && result?.showPayment) {
                setShowPayment(true)
                setPaymentInfo({
                  clientSecret: result.clientSecret || "",
                  amount: result.amount,
                })
              }
            }
          })
        }
      }
    }, [messages])

    useEffect(() => {
      if (messages.length > 0) {
        setShowInitialPrompts(false)
      }
    }, [messages])

    useEffect(() => {
      if ((isOpen || embedded) && !hasStarted && messages.length === 0) {
        setHasStarted(true)
        const timer = setTimeout(() => {
          sendMessage({ text: "Hi, I'd like to get a quote for a commercial move." })
        }, 800)
        return () => clearTimeout(timer)
      }
    }, [isOpen, embedded, hasStarted, messages.length, sendMessage])

    const [userHasScrolledUp, setUserHasScrolledUp] = useState(false)
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

    useEffect(() => {
      // Check for reduced motion preference
      if (typeof window !== "undefined") {
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
        setPrefersReducedMotion(mediaQuery.matches)

        const handleChange = (e: MediaQueryListEvent) => {
          setPrefersReducedMotion(e.matches)
        }

        mediaQuery.addEventListener("change", handleChange)
        return () => mediaQuery.removeEventListener("change", handleChange)
      }
    }, [])

    useEffect(() => {
      // Track if user has manually scrolled up
      if (messagesEndRef.current) {
        const container = messagesEndRef.current.parentElement
        if (container) {
          const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
            setUserHasScrolledUp(!isNearBottom)
          }

          container.addEventListener("scroll", handleScroll)
          return () => container.removeEventListener("scroll", handleScroll)
        }
      }
    }, [])

    useEffect(() => {
      // Only auto-scroll if user hasn't scrolled up and motion is not reduced
      if (messagesEndRef.current && !prefersReducedMotion && !userHasScrolledUp) {
        const container = messagesEndRef.current.parentElement
        if (container) {
          // Use smooth scroll if motion is allowed, instant if reduced
          container.scrollTo({
            top: container.scrollHeight,
            behavior: prefersReducedMotion ? "auto" : "smooth",
          })
        }
      }
    }, [
      messages,
      businessLookupResults,
      currentQuote,
      showCalendar,
      showPayment,
      showServicePicker,
      prefersReducedMotion,
      userHasScrolledUp,
    ])

    useEffect(() => {
      if (typeof window !== "undefined") {
        synthRef.current = window.speechSynthesis
      }
    }, [])

    useEffect(() => {
      if (!voiceEnabled || !synthRef.current) return
      const lastMessage = messages[messages.length - 1]
      if (lastMessage?.role === "assistant" && !isLoading) {
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
      setShowServicePicker(false)

      // Detect if message might trigger business lookup or quote calculation
      const lowerText = text.toLowerCase()
      if (lowerText.includes("abn") || lowerText.includes("business") || lowerText.includes("company")) {
        setIsLookingUpBusiness(true)
      }
      if (lowerText.includes("quote") || lowerText.includes("price") || lowerText.includes("cost")) {
        setIsCalculatingQuote(true)
      }
      if (lowerText.includes("available") || lowerText.includes("date") || lowerText.includes("when")) {
        setIsCheckingAvailability(true)
      }

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

    const handleSelectService = (service: ServiceOption) => {
      setShowServicePicker(false)
      setCurrentStep("details")
      sendMessage({
        text: `I need ${service.name}`,
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
      setShowInitialPrompts(false)
      sendMessage({ text: prompt })
    }

    const handlePaymentComplete = async () => {
      setPaymentComplete(true)
      setCurrentStep("complete")
      if (currentQuote && contactInfo && selectedDate) {
        setIsSubmittingLead(true)
        try {
          // Add submittedLead to state to use its ID in PaymentConfirmation
          const submittedLead = await submitLead({
            company_name: confirmedBusiness?.name || contactInfo.companyName || "",
            contact_name: contactInfo.contactName,
            email: contactInfo.email,
            phone: contactInfo.phone,
            move_type: currentQuote.moveTypeKey || "office",
            origin_suburb: currentQuote.origin,
            destination_suburb: currentQuote.destination,
            estimated_total: currentQuote.estimatedTotal,
            status: "won",
            notes: `Deposit paid. Move scheduled for ${selectedDate}. ABN: ${confirmedBusiness?.abn || "N/A"}`,
            scheduled_date: selectedDate,
            deposit_amount: currentQuote.depositRequired,
            deposit_paid: true,
          })
          setLeadSubmitted(true)
          // The `submittedLead` object is not directly used here, but it's good practice to capture the result.
          // If you needed the ID for PaymentConfirmation, you'd have to manage it in state.
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

    const renderMessageContent = (message: any) => {
      // Debug log
      console.log("[v0] Rendering:", message.role, "Content:", message.content, "Parts:", message.parts)

      if (message.parts) {
        return message.parts
          .map((part: any, index: number) => {
            if (part.type === "text") {
              return <span key={index}>{part.text}</span>
            }
            return null
          })
          .filter(Boolean)
      }
      if (typeof message.content === "string") {
        return message.content
      }
      return null
    }

    // Calendar picker component
    const CalendarPicker = () => {
      const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate()
      const firstDayOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay()
      const days = []

      for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(<div key={`empty-${i}`} className="h-8" />)
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
        const dateInfo = availableDates.find((d) => d.date === dateStr)
        const isAvailable = dateInfo?.available
        const isPast = new Date(dateStr) < new Date(new Date().toDateString())
        const isSelected = selectedDate === dateStr

        days.push(
          <button
            key={day}
            disabled={!isAvailable || isPast}
            onClick={() => isAvailable && !isPast && handleSelectDate(dateStr)}
            className={`h-8 w-8 rounded-full text-sm flex items-center justify-center transition-colors relative ${isSelected
              ? "bg-primary text-primary-foreground"
              : isAvailable && !isPast
                ? "hover:bg-primary/20 text-foreground cursor-pointer"
                : "text-muted-foreground/40 cursor-not-allowed opacity-50"
              } ${dateInfo?.slots === 1 ? "ring-1 ring-amber-500" : ""} ${isPast ? "line-through" : ""}`}
            aria-disabled={!isAvailable || isPast}
            title={
              isPast
                ? "This date has passed"
                : !isAvailable
                  ? "This date is not available"
                  : dateInfo?.slots === 1
                    ? "Limited availability (1 slot remaining)"
                    : "Select this date"
            }
          >
            {day}
          </button>,
        )
      }

      const isCurrentMonth =
        calendarMonth.getMonth() === new Date().getMonth() && calendarMonth.getFullYear() === new Date().getFullYear()

      return (
        <div className="bg-card border border-border rounded-lg p-3 my-3">
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {calendarMonth.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}
              </span>
              {!isCurrentMonth && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCalendarMonth(new Date())}
                  className="h-6 px-2 text-xs"
                  title="Go to current month"
                >
                  Today
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="text-xs text-muted-foreground font-medium">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">{days}</div>
          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-primary/20" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full ring-1 ring-amber-500" />
              <span>Limited</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-muted-foreground/20 opacity-50 line-through" />
              <span>Unavailable</span>
            </div>
          </div>
        </div>
      )
    }

    // Quote display component
    const QuoteDisplay = () => {
      if (!currentQuote) return null

      return (
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-4 my-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-foreground">Your Quote</h4>
            <Badge variant="secondary">{currentQuote.moveType}</Badge>
          </div>

          <div className="space-y-2 mb-4">
            {currentQuote.breakdown.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">${item.amount.toLocaleString()}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="font-semibold">Total Estimate</span>
              <span className="font-bold text-lg text-primary">${currentQuote.estimatedTotal.toLocaleString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs bg-background/50 rounded-lg p-2">
            <div>
              <div className="font-semibold text-foreground">{currentQuote.crewSize}</div>
              <div className="text-muted-foreground">Crew</div>
            </div>
            <div>
              <div className="font-semibold text-foreground">{currentQuote.estimatedHours}h</div>
              <div className="text-muted-foreground">Est. Time</div>
            </div>
            <div>
              <div className="font-semibold text-foreground">${currentQuote.depositRequired.toLocaleString()}</div>
              <div className="text-muted-foreground">Deposit</div>
            </div>
          </div>
        </div>
      )
    }

    // Business results component
    const BusinessResults = () => {
      if (!businessLookupResults?.length) return null

      return (
        <div className="space-y-2 my-3">
          <p className="text-sm text-muted-foreground">Select your business:</p>
          {businessLookupResults.map((business, i) => (
            <button
              key={i}
              onClick={() => handleSelectBusiness(business)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 transition-all text-left"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">{business.name}</div>
                <div className="text-xs text-muted-foreground">ABN: {business.abn}</div>
              </div>
              <CheckCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </button>
          ))}
          <button
            onClick={() => {
              setBusinessLookupResults(null)
              sendMessage({
                text: "None of these match my business. I'll enter the details manually.",
              })
            }}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-muted-foreground/50 bg-transparent hover:bg-muted/50 hover:border-primary/50 transition-all text-left text-sm text-muted-foreground hover:text-foreground"
          >
            <span className="text-primary font-bold">+</span>
            <span>None of these match - enter manually</span>
          </button>
        </div>
      )
    }

    // Payment component
    const PaymentSection = () => {
      if (!showPayment || !paymentInfo) return null

      if (paymentComplete && currentQuote && contactInfo) {
        return (
          <PaymentConfirmation
            referenceId={""} // Placeholder, ideally use submittedLead ID if available and passed down
            depositAmount={currentQuote.depositRequired}
            estimatedTotal={currentQuote.estimatedTotal}
            scheduledDate={selectedDate || undefined}
            moveType={currentQuote.moveType}
          />
        )
      }

      return (
        <div className="bg-card border border-border rounded-lg p-4 my-3">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="h-5 w-5 text-primary" />
            <h4 className="font-semibold">Secure Payment</h4>
          </div>
          <StripeCheckout
            amount={paymentInfo.amount}
            onComplete={handlePaymentComplete}
            customerEmail={contactInfo?.email}
            customerName={contactInfo?.contactName}
            description={currentQuote ? `Deposit for ${currentQuote.moveType}` : "Moving deposit"}
          />
        </div>
      )
    }

    // Stripe checkout component
    const StripeCheckout = ({
      amount,
      onComplete,
      customerEmail,
      customerName,
      description,
    }: {
      amount: number
      onComplete: () => void
      customerEmail?: string
      customerName?: string
      description: string
    }) => {
      const [clientSecret, setClientSecret] = useState<string | null>(null)
      const [loading, setLoading] = useState(true)
      const [creationError, setCreationError] = useState<string | null>(null)
      const sessionCreated = useRef(false)

      const getCheckoutSession = async () => {
        if (sessionCreated.current) {
          return
        }

        if (!stripePromise) {
          setCreationError("Online payments are not configured yet.")
          setLoading(false)
          return
        }

        try {
          sessionCreated.current = true // Mark as created before the call
          setCreationError(null)
          setLoading(true)
          const result = await createDepositCheckout({
            amount,
            customerEmail: customerEmail || "",
            customerName: customerName || "",
            description,
            moveType: currentQuote?.moveType || undefined,
            origin: currentQuote?.origin || undefined,
            destination: currentQuote?.destination || undefined,
            scheduledDate: selectedDate || undefined,
          })

          if (result.success && result.clientSecret) {
            setClientSecret(result.clientSecret)
          } else {
            setCreationError(result.error || "Unable to start payment session.")
            sessionCreated.current = false // Allow retry on error
          }
        } catch (error) {
          console.error("Failed to create checkout:", error)
          setCreationError("Unable to start payment session.")
          sessionCreated.current = false // Allow retry on error
        } finally {
          setLoading(false)
        }
      }

      useEffect(() => {
        getCheckoutSession()
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])

      if (loading) {
        return (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )
      }

      if (creationError || !clientSecret || !stripePromise) {
        const userFriendlyError = creationError ? getStripeErrorMessage(creationError) : "Unable to load payment form."

        return (
          <div className="text-center py-4 space-y-2">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-4">{userFriendlyError}</p>
            <div className="flex flex-col gap-2">
              <Button variant="outline" size="sm" onClick={handleCall}>
                <Phone className="h-4 w-4 mr-2" />
                Call to complete booking
              </Button>
              {creationError && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCreationError(null)
                    setLoading(true)
                    getCheckoutSession()
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}
            </div>
          </div>
        )
      }

      return (
        <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret, onComplete }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      )
    }

    // Error display with enhanced recovery
    const ErrorDisplay = () => {
      const [retryCount, setRetryCount] = useState(0)
      const [isRetrying, setIsRetrying] = useState(false)

      const handleRetryWithBackoff = async () => {
        setIsRetrying(true)
        setRetryCount((prev) => prev + 1)

        try {
          // Wait with exponential backoff
          await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * Math.pow(2, retryCount), 5000)))
          handleRetry()
        } catch (error) {
          console.error("Retry failed:", error)
        } finally {
          setIsRetrying(false)
        }
      }

      return (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mb-3" />
          <h4 className="font-semibold text-foreground mb-1">Connection Issue</h4>
          <p className="text-sm text-muted-foreground mb-2">{errorMessage || "Unable to connect to the assistant."}</p>
          {retryCount > 0 && <p className="text-xs text-muted-foreground mb-4">Attempt {retryCount} of 3</p>}
          <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
            <Button
              onClick={handleRetryWithBackoff}
              variant="default"
              size="sm"
              disabled={isRetrying || retryCount >= 3}
              className="flex-1"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? "animate-spin" : ""}`} />
              {isRetrying ? "Retrying..." : "Try Again"}
            </Button>
            <Button onClick={handleCall} variant="outline" size="sm" className="flex-1 bg-transparent">
              <Phone className="h-4 w-4 mr-2" />
              Call Us
            </Button>
          </div>
          {retryCount >= 3 && (
            <p className="text-xs text-muted-foreground mt-4">
              Still having issues? Please call us directly at{" "}
              <a href="tel:+61388201801" className="text-primary hover:underline">
                03 8820 1801
              </a>
            </p>
          )}
        </div>
      )
    }

    // Confirmed business badge
    const ConfirmedBusinessBadge = () => {
      if (!confirmedBusiness) return null
      return (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 mb-3">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <div className="text-sm">
            <span className="font-medium text-foreground">{confirmedBusiness.name}</span>
            <span className="text-muted-foreground ml-2">ABN: {confirmedBusiness.abn}</span>
          </div>
        </div>
      )
    }

    const chatContent = (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Maya - Quote Assistant</h3>
              <p className="text-xs text-muted-foreground">M&M Commercial Moving</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              title={voiceEnabled ? "Mute voice" : "Enable voice"}
            >
              {voiceEnabled ? (
                <Volume2 className="h-4 w-4 text-primary" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            {!embedded && (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMinimized(!isMinimized)}>
                  {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Progress indicator */}
            {messages.length > 0 && (
              <div className="px-3 pt-3">
                <BookingProgress step={currentStep} />
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {hasError ? (
                <ErrorDisplay />
              ) : (
                <>
                  <ConfirmedBusinessBadge />

                  {messages.map((message, index) => (
                    <div
                      key={message.id || index}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                          }`}
                      >
                        <div className="flex items-start gap-2">
                          {message.role === "assistant" && (
                            <Bot className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                          )}
                          <div className="text-sm">{renderMessageContent(message)}</div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Show initial prompts at start */}
                  {showInitialPrompts && messages.length <= 1 && !isLoading && (
                    <InitialPrompts onSelect={handlePromptClick} />
                  )}

                  {/* Interactive elements */}
                  <BusinessResults />

                  {showServicePicker && serviceOptions.length > 0 && (
                    <ServicePicker services={serviceOptions} onSelect={handleSelectService} />
                  )}

                  <QuoteDisplay />

                  {showCalendar && availableDates.length > 0 && <CalendarPicker />}

                  <PaymentSection />

                  {/* Loading states */}
                  {isLookingUpBusiness && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">Looking up business...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {isCalculatingQuote && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">Calculating quote...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {isCheckingAvailability && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">Checking availability...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {isLoading && !isLookingUpBusiness && !isCalculatingQuote && !isCheckingAvailability && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">Maya is typing...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            {!hasError && (
              <div className="p-3 border-t border-border bg-card">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-9 w-9 flex-shrink-0 ${isListening ? "bg-red-500/20 text-red-500" : ""}`}
                    onClick={toggleListening}
                    disabled={isLoading}
                    aria-label={isListening ? "Stop voice input" : "Start voice input"}
                    title={isListening ? "Stop voice input" : "Start voice input"}
                  >
                    {isListening ? (
                      <MicOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Mic className="h-4 w-4" aria-hidden="true" />
                    )}
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
                  <Button
                    size="icon"
                    className="h-9 w-9 flex-shrink-0"
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Or call us:{" "}
                  <a href="tel:+61388201801" className="text-primary hover:underline">
                    03 8820 1801
                  </a>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    )

    // Embedded version
    if (embedded) {
      return (
        <div ref={containerRef} className="bg-card rounded-xl border border-border shadow-lg overflow-hidden h-[500px]">
          {chatContent}
        </div>
      )
    }

    // Floating version
    if (!isOpen) {
      return (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-50 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      )
    }

    return (
      <div className="fixed bottom-4 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)] bg-card rounded-xl border border-border shadow-2xl overflow-hidden">
        <div className={isMinimized ? "h-auto" : "h-[550px]"}>{chatContent}</div>
      </div>
    )
  },
)

QuoteAssistant.displayName = "QuoteAssistant"
