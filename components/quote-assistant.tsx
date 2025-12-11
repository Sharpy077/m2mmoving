"use client"

import type React from "react"
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from "react"
import { useChat } from "@ai-sdk/react"

import {
  Building2,
  CheckCircle,
  Phone,
  Warehouse,
  Server,
  Monitor,
  Store,
  ArrowRight,
  AlertCircle,
  Clock,
  PhoneCall,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { loadStripe } from "@stripe/stripe-js"
import { submitLead } from "@/app/actions/leads"
import {
  type ResponseMonitor,
  getResponseMonitor,
  ErrorClassifier,
  RetryHandler,
  ConversationStateManager,
  FallbackProvider,
  type ConversationState,
} from "@/lib/conversation"
import { SessionRecoveryManager, type SavedSession } from "@/lib/conversation/session-recovery"
import { HumanEscalationService, detectHumanRequest } from "@/lib/conversation/human-escalation"
import { ConversationAnalytics } from "@/lib/conversation/analytics"
import type { ConversationContext, ConversationStage } from "@/lib/conversation/state-machine"

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
    { text: "Warehouse relocation", icon: Warehouse },
    { text: "Data centre migration", icon: Server },
    { text: "Retail store move", icon: Store },
    { text: "IT equipment transport", icon: Monitor },
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
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
              i < currentIndex
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

const SessionRecoveryBanner = ({
  session,
  onRestore,
  onStartFresh,
}: {
  session: SavedSession
  onRestore: () => void
  onStartFresh: () => void
}) => {
  const age = SessionRecoveryManager.getSessionAge(session)
  const prompt = SessionRecoveryManager.generateRecoveryPrompt(session)

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 mx-4">
      <div className="flex items-start gap-3">
        <Clock className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-medium text-blue-900 text-sm">Continue where you left off?</h4>
          <p className="text-blue-700 text-sm mt-1">{prompt}</p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={onRestore} className="bg-blue-600 hover:bg-blue-700 text-white">
              <RotateCcw className="h-3 w-3 mr-1" />
              Continue
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onStartFresh}
              className="border-blue-300 text-blue-700 bg-transparent"
            >
              Start Fresh
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const ReEngagementPrompt = ({
  idleMinutes,
  onContinue,
  onRequestCallback,
}: {
  idleMinutes: number
  onContinue: () => void
  onRequestCallback: () => void
}) => {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mx-4 my-2">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <p className="text-amber-800 text-sm">Still there? No rush - just let me know when you're ready to continue.</p>
      </div>
      <div className="flex gap-2 mt-2">
        <Button size="sm" variant="outline" onClick={onContinue} className="text-xs bg-transparent">
          I'm here
        </Button>
        <Button size="sm" variant="outline" onClick={onRequestCallback} className="text-xs bg-transparent">
          <PhoneCall className="h-3 w-3 mr-1" />
          Call me instead
        </Button>
      </div>
    </div>
  )
}

const EscalationConfirmation = ({
  ticketId,
  estimatedWait,
  onClose,
}: {
  ticketId: string
  estimatedWait: string
  onClose: () => void
}) => {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mx-4 my-2">
      <div className="flex items-start gap-3">
        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
        <div>
          <h4 className="font-medium text-green-900 text-sm">Callback Scheduled!</h4>
          <p className="text-green-700 text-sm mt-1">
            Our team will contact you {estimatedWait}. Reference: {ticketId}
          </p>
          <Button size="sm" variant="ghost" onClick={onClose} className="mt-2 text-green-700 hover:text-green-900 p-0">
            Continue chatting
          </Button>
        </div>
      </div>
    </div>
  )
}

export const QuoteAssistant = forwardRef<QuoteAssistantHandle, QuoteAssistantProps>(
  ({ embedded = false, onScrolledAway }, ref) => {
    // ============================================
    // STATE DECLARATIONS
    // ============================================
    const [isOpen, setIsOpen] = useState(embedded)
    const [isMinimized, setIsMinimized] = useState(false)
    const [inputValue, setInputValue] = useState("")
    const [isListening, setIsListening] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [voiceEnabled, setVoiceEnabled] = useState(false)
    const [currentQuote, setCurrentQuote] = useState<QuoteEstimate | null>(null)
    const [isSubmittingLead, setIsSubmittingLead] = useState(false)
    const [leadSubmitted, setLeadSubmitted] = useState(false)
    const [submittedLeadData, setSubmittedLeadData] = useState<any>(null)
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
    const [lastUserMessageTime, setLastUserMessageTime] = useState<number | null>(null)
    const [conversationId] = useState(() => `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
    const [isInitialMessage, setIsInitialMessage] = useState(true)
    const [retryCount, setRetryCount] = useState(0)
    const [fallbackResponse, setFallbackResponse] = useState<ReturnType<typeof FallbackProvider.getFallback> | null>(
      null,
    )
    const [isLookingUpBusiness, setIsLookingUpBusiness] = useState(false)
    const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
    const [isCalculatingQuote, setIsCalculatingQuote] = useState(false)
    const [recoverableSession, setRecoverableSession] = useState<SavedSession | null>(null)
    const [showReEngagement, setShowReEngagement] = useState(false)
    const [idleMinutes, setIdleMinutes] = useState(0)
    const [escalationResult, setEscalationResult] = useState<{
      ticketId: string
      estimatedWait: string
    } | null>(null)
    const [conversationContext, setConversationContext] = useState<ConversationContext>({
      stage: "greeting" as ConversationStage,
      businessConfirmed: false,
      serviceType: null,
      qualifyingAnswers: {},
      inventoryItems: [],
      locationOrigin: null,
      locationDestination: null,
      quoteAmount: null,
      selectedDate: null,
      contactInfo: null,
      errorCount: 0,
      lastMessageTime: Date.now(),
      stageStartTime: Date.now(),
    })
    const [pendingRetry, setPendingRetry] = useState<{ text: string; retries: number } | null>(null)
    const [userHasScrolledUp, setUserHasScrolledUp] = useState(false)
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

    // ============================================
    // REFS
    // ============================================
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const recognitionRef = useRef<any>(null)
    const synthRef = useRef<SpeechSynthesis | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const responseMonitorRef = useRef<ResponseMonitor>(getResponseMonitor())
    const retryHandlerRef = useRef<RetryHandler>(new RetryHandler())
    const analyticsRef = useRef<ConversationAnalytics | null>(null)
    const lastActivityRef = useRef<number>(Date.now())
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null)

    // ============================================
    // useChat HOOK - MUST BE DECLARED EARLY
    // ============================================
    const chatResult = useChat({
      // @ts-ignore
      api: "/api/quote-assistant",
      id: conversationId,
      onError: (err) => {
        console.log("[v0] Chat error:", err.message)
        const classified = ErrorClassifier.classify(err)

        if (lastUserMessageTime) {
          responseMonitorRef.current.cancelTimer(`msg-${lastUserMessageTime}`)
        }

        setHasError(true)
        setErrorMessage(classified.message)
        setConversationContext((prev) => ({
          ...prev,
          errorCount: prev.errorCount + 1,
        }))
      },
      onFinish: () => {
        setHasError(false)
        setErrorMessage(null)
        setPendingRetry(null)
        setRetryCount(0)
        setFallbackResponse(null)
        setLastUserMessageTime(null)
        setIsInitialMessage(false)

        if (lastUserMessageTime) {
          responseMonitorRef.current.cancelTimer(`msg-${lastUserMessageTime}`)
        }
      },
    })

    console.log("[v0] useChat result:", chatResult)
    console.log("[v0] useChat append:", typeof chatResult?.append)

    const messages = chatResult?.messages || []
    const append = chatResult?.append
    const status = chatResult?.status
    const error = chatResult?.error

    // ============================================
    // DERIVED STATE
    // ============================================
    const isLoading = status === "streaming" || status === "submitted"

    // ============================================
    // CALLBACKS (can now use messages, isLoading, etc.)
    // ============================================
    const saveConversationState = useCallback(() => {
      const state: ConversationState = {
        id: conversationId,
        messages: messages.map((msg) => ({
          id: msg.id || `msg-${Date.now()}`,
          role: msg.role,
          content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
          timestamp: new Date(),
        })),
        step: currentStep,
        selectedOptions: {
          business: confirmedBusiness || undefined,
          service: serviceOptions.find((s) => true) || undefined,
          date: selectedDate || undefined,
        },
        formData: {
          contactInfo: contactInfo || undefined,
          quote: currentQuote || undefined,
        },
        errorState: hasError
          ? {
              lastError: errorMessage || "Unknown error",
              retryCount,
              lastRetryTime: new Date(),
            }
          : undefined,
        createdAt: new Date(),
        lastUpdated: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }
      ConversationStateManager.save(state)
    }, [
      conversationId,
      messages,
      currentStep,
      confirmedBusiness,
      serviceOptions,
      selectedDate,
      contactInfo,
      currentQuote,
      hasError,
      errorMessage,
      retryCount,
    ])

    const handleErrorWithRetry = useCallback(
      async (error: any, messageText: string) => {
        setHasError(true)
        const classified = ErrorClassifier.classify(error)
        setErrorMessage(classified.message)
        setRetryCount((prev) => prev + 1)

        setConversationContext((prev) => ({
          ...prev,
          errorCount: prev.errorCount + 1,
        }))

        if (retryCount < 3) {
          setPendingRetry({ text: messageText, retries: retryCount + 1 })
          responseMonitorRef.current.startTimer(`retry-${Date.now()}`, "retry")
        } else {
          console.error("[RetryHandler] Max retries reached, showing fallback.", error)
          setFallbackResponse(FallbackProvider.getFallback(error))
        }
      },
      [retryCount],
    )

    const updateActivity = useCallback(() => {
      lastActivityRef.current = Date.now()
      setShowReEngagement(false)
      setConversationContext((prev) => ({
        ...prev,
        lastMessageTime: Date.now(),
      }))
    }, [])

    const handleRestoreSession = useCallback(() => {
      if (recoverableSession) {
        setConversationContext(recoverableSession.context)
        setRecoverableSession(null)
        append({ role: "user", content: "Continue from where I left off" })
      }
    }, [recoverableSession, append])

    const handleStartFresh = useCallback(() => {
      SessionRecoveryManager.deleteSession(recoverableSession?.conversationId || "")
      setRecoverableSession(null)
    }, [recoverableSession])

    const handleReEngagementContinue = useCallback(() => {
      setShowReEngagement(false)
      lastActivityRef.current = Date.now()
      append({ role: "user", content: "I'm still here" })
    }, [append])

    const handleRequestCallback = useCallback(async () => {
      setShowReEngagement(false)

      const result = await HumanEscalationService.requestEscalation({
        conversationId,
        reason: "customer_request",
        customerData: conversationContext.contactInfo || undefined,
        errorCount: conversationContext.errorCount,
        stage: conversationContext.stage,
        urgency: "medium",
      })

      if (result.success && result.ticketId) {
        setEscalationResult({
          ticketId: result.ticketId,
          estimatedWait: result.estimatedWaitTime || "within 30 minutes",
        })
      } else {
        append({ role: "user", content: "I'd like someone to call me please" })
      }
    }, [conversationId, conversationContext, append])

    const handleSendMessageInternal = useCallback(
      async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!inputValue.trim() || isLoading) return

        updateActivity()
        analyticsRef.current?.trackUserMessage()

        if (detectHumanRequest(inputValue)) {
          analyticsRef.current?.trackStageTransition("human_escalation")
        }

        append({ role: "user", content: inputValue })
        setInputValue("")
      },
      [inputValue, isLoading, updateActivity, append],
    )

    const handleRetry = useCallback(() => {
      setHasError(false)
      setErrorMessage(null)
      setHasStarted(false)
      setConversationContext({
        stage: "greeting" as ConversationStage,
        businessConfirmed: false,
        serviceType: null,
        qualifyingAnswers: {},
        inventoryItems: [],
        locationOrigin: null,
        locationDestination: null,
        quoteAmount: null,
        selectedDate: null,
        contactInfo: null,
        errorCount: 0,
        lastMessageTime: Date.now(),
        stageStartTime: Date.now(),
      })
      SessionRecoveryManager.deleteSession(conversationId)
      window.location.reload()
    }, [conversationId])

    const handleCall = useCallback(() => {
      window.location.href = "tel:+61388201801"
    }, [])

    const toggleListening = useCallback(() => {
      if (!recognitionRef.current) return
      if (isListening) {
        recognitionRef.current.stop()
        setIsListening(false)
      } else {
        if (synthRef.current) synthRef.current.cancel()
        recognitionRef.current.start()
        setIsListening(true)
      }
    }, [isListening])

    const handleSelectBusiness = useCallback(
      (business: BusinessResult) => {
        if (isLoading) return
        setConfirmedBusiness(business)
        setBusinessLookupResults(null)
        setHasError(false)
        setErrorMessage(null)
        setLastUserMessageTime(Date.now())
        const messageText = `Yes, that's correct - ${business.name} (ABN: ${business.abn})`
        setPendingRetry({ text: messageText, retries: 0 })
        append({ role: "user", content: messageText })
      },
      [isLoading, append],
    )

    const handleSelectService = useCallback(
      (service: ServiceOption) => {
        if (isLoading) return
        setShowServicePicker(false)
        setCurrentStep("details")
        setHasError(false)
        setErrorMessage(null)
        setLastUserMessageTime(Date.now())
        const messageText = `I need ${service.name}. ${service.description ? `(${service.description})` : ""}`
        setPendingRetry({ text: messageText, retries: 0 })
        append({ role: "user", content: messageText })
      },
      [isLoading, append],
    )

    const handleSelectDate = useCallback(
      (date: string) => {
        if (isLoading) return
        setSelectedDate(date)
        setShowCalendar(false)
        setHasError(false)
        setErrorMessage(null)
        setLastUserMessageTime(Date.now())
        const formattedDate = new Date(date).toLocaleDateString("en-AU", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
        const messageText = `I'd like to book for ${formattedDate}`
        setPendingRetry({ text: messageText, retries: 0 })
        append({ role: "user", content: messageText })
      },
      [isLoading, append],
    )

    const handlePromptClick = useCallback(
      (prompt: string) => {
        if (isLoading) return
        setShowInitialPrompts(false)
        setHasError(false)
        setErrorMessage(null)
        setLastUserMessageTime(Date.now())
        append({ role: "user", content: prompt })
      },
      [isLoading, append],
    )

    const handlePaymentComplete = useCallback(async () => {
      setPaymentComplete(true)
      setCurrentStep("complete")
      if (currentQuote && contactInfo && selectedDate) {
        setIsSubmittingLead(true)
        try {
          const res = await submitLead({
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
          if (res.success && res.lead) {
            setSubmittedLeadData(res.lead)
          }
          setLeadSubmitted(true)
        } catch (error) {
          console.error("Failed to submit lead:", error)
        } finally {
          setIsSubmittingLead(false)
        }
      }
      append({ role: "user", content: "I've completed the payment." })
    }, [currentQuote, contactInfo, selectedDate, confirmedBusiness, append])

    const renderMessageContent = useCallback((message: any) => {
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
    }, [])

    // ============================================
    // EFFECTS
    // ============================================

    // Idle check effect
    useEffect(() => {
      const checkIdle = () => {
        const now = Date.now()
        const idleMs = now - lastActivityRef.current
        const idle = Math.floor(idleMs / 60000)

        if (idle >= 3 && !showReEngagement && !isLoading && messages.length > 0) {
          setIdleMinutes(idle)
          setShowReEngagement(true)
        }
      }

      idleTimerRef.current = setInterval(checkIdle, 30000)

      return () => {
        if (idleTimerRef.current) {
          clearInterval(idleTimerRef.current)
        }
      }
    }, [isLoading, messages.length, showReEngagement])

    // Initialize analytics and check for recoverable session
    useEffect(() => {
      const session = SessionRecoveryManager.getMostRecentSession()
      if (session) {
        setRecoverableSession(session)
      }

      analyticsRef.current = new ConversationAnalytics(conversationId)

      return () => {
        analyticsRef.current?.sendMetrics()
      }
    }, [conversationId])

    // Save session on context/messages change
    useEffect(() => {
      if (messages.length > 0 && conversationContext.stage !== "greeting") {
        SessionRecoveryManager.saveSession(
          conversationId,
          conversationContext,
          messages.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant" | "system",
            content: typeof m.content === "string" ? m.content : "",
            timestamp: Date.now(),
          })),
        )
      }
    }, [messages, conversationContext, conversationId])

    useEffect(() => {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage?.role === "assistant") {
        analyticsRef.current?.trackAssistantResponse()
      }
    }, [messages])

    // Handle imperative methods
    useImperativeHandle(ref, () => ({
      open: () => {
        setIsOpen(true)
        setIsMinimized(false)
      },
    }))

    // Response monitor timeout handler
    useEffect(() => {
      const monitor = responseMonitorRef.current

      const unsubscribe = monitor.onTimeout((messageId) => {
        console.warn(`[ResponseMonitor] Timeout detected for message: ${messageId}`)

        const lastMessage = messages[messages.length - 1]
        if (lastMessage?.role === "user" && pendingRetry && !isLoading) {
          console.log("[ResponseMonitor] Triggering retry due to timeout")
          handleErrorWithRetry(new Error("Response timeout"), pendingRetry.text)
        }
      })

      return () => {
        unsubscribe()
      }
    }, [messages, pendingRetry, isLoading, handleErrorWithRetry])

    // Monitor response times
    useEffect(() => {
      if (lastUserMessageTime && !isLoading) {
        const messageId = `msg-${lastUserMessageTime}`
        const timeoutType = isInitialMessage ? "initial" : "normal"
        responseMonitorRef.current.startTimer(messageId, timeoutType)

        return () => {
          responseMonitorRef.current.cancelTimer(messageId)
        }
      }
    }, [lastUserMessageTime, isLoading, isInitialMessage])

    // Initial message with health check
    useEffect(() => {
      if ((isOpen || embedded) && !hasStarted && messages.length === 0) {
        setHasStarted(true)
        setIsInitialMessage(true)

        const checkHealth = async () => {
          try {
            const response = await fetch("/api/quote-assistant/health")
            if (response.ok) {
              const timer = setTimeout(() => {
                setLastUserMessageTime(Date.now())
                append({ role: "user", content: "Hi, I'd like to get a quote for a commercial move." })
              }, 800)
              return () => clearTimeout(timer)
            }
          } catch (error) {
            console.warn("[InitialMessage] Health check failed, proceeding anyway:", error)
          }

          const timer = setTimeout(() => {
            setLastUserMessageTime(Date.now())
            append({ role: "user", content: "Hi, I'd like to get a quote for a commercial move." })
          }, 800)
          return () => clearTimeout(timer)
        }

        checkHealth()
      }
    }, [isOpen, embedded, hasStarted, messages.length, append])

    // Check for reduced motion preference
    useEffect(() => {
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

    // Track scroll position
    useEffect(() => {
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

    // Auto-scroll to bottom
    useEffect(() => {
      if (messagesEndRef.current && !prefersReducedMotion && !userHasScrolledUp) {
        const container = messagesEndRef.current.parentElement
        if (container) {
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

    // Initialize speech synthesis
    useEffect(() => {
      if (typeof window !== "undefined") {
        synthRef.current = window.speechSynthesis
      }
    }, [])

    // Voice output for assistant messages
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
        } else if (typeof (lastMessage as any).content === "string") {
          textContent = (lastMessage as any).content
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
              setLastUserMessageTime(Date.now())
              append({ role: "user", content: transcript })
            }, 100)
          }
          recognition.onerror = (event: any) => {
            console.error("Speech recognition error:", event.error)
            setIsListening(false)
          }
          recognitionRef.current = recognition
        }
      }
    }, [append])

    return (
      <div className="bg-background rounded-lg shadow-lg overflow-hidden w-full max-w-2xl">
        {/* <!-- Quote Assistant Component Structure Here --> */}
      </div>
    )
  },
)
