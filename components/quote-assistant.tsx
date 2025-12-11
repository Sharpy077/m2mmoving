"use client"

import type React from "react"
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback, useMemo } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { loadStripe } from "@stripe/stripe-js"
import type { ConversationStage } from "@/lib/conversation"
import {
  Building2,
  Warehouse,
  Server,
  Store,
  AlertCircle,
  RotateCcw,
  Send,
  Loader2,
  X,
  User,
  Bot,
  Cpu,
  Package,
  Truck,
  Factory,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RetryHandler, ErrorClassifier } from "@/lib/conversation"

const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null

interface ServiceOption {
  id: string
  name: string
  icon: React.ReactNode
  description: string
}

interface QuoteData {
  moveType: string
  estimatedRange: { low: number; high: number }
  breakdown: {
    baseRate: number
    areaCost: number
    floorSurcharge: number
    specialItemsCost: number
    distanceSurcharge: number
  }
  validFor: string
  notes: string[]
}

interface BusinessInfo {
  abn: string
  name: string
  status: string
  type: string
  state: string
  postcode: string
}

interface ContactInfo {
  name: string
  email: string
  phone: string
}

export interface QuoteAssistantRef {
  openChat: () => void
  closeChat: () => void
  startConversation: () => void
}

interface QuoteAssistantProps {
  onQuoteGenerated?: (quote: QuoteData) => void
  onLeadCaptured?: (contact: ContactInfo) => void
  initialMessage?: string
  embedded?: boolean
  className?: string
}

// Helper to extract text from message parts
function getTextFromMessage(message: UIMessage): string {
  if (!message) return ""

  // Check for parts array first (AI SDK v5 format)
  if (Array.isArray(message.parts)) {
    const textParts = message.parts.filter((p): p is { type: "text"; text: string } => p?.type === "text")
    return textParts.map((p) => p.text).join("")
  }

  // Fallback to content string
  if (typeof (message as any).content === "string") {
    return (message as any).content
  }

  return ""
}

// Service options for the picker
const serviceOptions: ServiceOption[] = [
  {
    id: "office",
    name: "Office Relocation",
    icon: <Building2 className="h-5 w-5" />,
    description: "Complete office moves",
  },
  {
    id: "warehouse",
    name: "Warehouse Move",
    icon: <Warehouse className="h-5 w-5" />,
    description: "Industrial relocations",
  },
  {
    id: "datacenter",
    name: "Data Centre",
    icon: <Server className="h-5 w-5" />,
    description: "Server & IT infrastructure",
  },
  {
    id: "retail",
    name: "Retail Fit-out",
    icon: <Store className="h-5 w-5" />,
    description: "Shop relocations",
  },
  {
    id: "it-equipment",
    name: "IT Equipment",
    icon: <Cpu className="h-5 w-5" />,
    description: "Computers & tech gear",
  },
  {
    id: "medical",
    name: "Medical & Lab",
    icon: <Package className="h-5 w-5" />,
    description: "Sensitive equipment",
  },
  {
    id: "factory",
    name: "Factory & Plant",
    icon: <Factory className="h-5 w-5" />,
    description: "Heavy machinery moves",
  },
  {
    id: "logistics",
    name: "Logistics Hub",
    icon: <Truck className="h-5 w-5" />,
    description: "Distribution centres",
  },
]

export const QuoteAssistant = forwardRef<QuoteAssistantRef, QuoteAssistantProps>(function QuoteAssistant(
  { onQuoteGenerated, onLeadCaptured, initialMessage, embedded = false, className = "" },
  ref,
) {
  // ============================================
  // STATE
  // ============================================
  const [isOpen, setIsOpen] = useState(embedded)
  const [input, setInput] = useState("")
  const [conversationId] = useState(() => `conv-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const [currentStep, setCurrentStep] = useState<"service" | "details" | "quote" | "contact" | "complete">("service")
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [confirmedBusiness, setConfirmedBusiness] = useState<BusinessInfo | null>(null)
  const [currentQuote, setCurrentQuote] = useState<QuoteData | null>(null)
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [fallbackResponse, setFallbackResponse] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [lastUserMessageTime, setLastUserMessageTime] = useState<number | null>(null)
  const [isInitialMessage, setIsInitialMessage] = useState(true)
  const [conversationContext, setConversationContext] = useState<{
    stage: ConversationStage
    errorCount: number
    lastMessageTime: number
    stageStartTime: number
  }>({
    stage: "greeting",
    errorCount: 0,
    lastMessageTime: Date.now(),
    stageStartTime: Date.now(),
  })
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false)

  // ============================================
  // REFS
  // ============================================
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const responseMonitorRef = useRef<any>(null)
  const retryHandlerRef = useRef<RetryHandler>(new RetryHandler())
  const hasStartedRef = useRef(false)

  // ============================================
  // useChat HOOK - AI SDK v5 CONFIGURATION
  // ============================================
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/quote-assistant",
      }),
    [],
  )

  const { messages, sendMessage, status, error } = useChat({
    transport,
    id: conversationId,
    onError: (err) => {
      console.log("[v0] Chat error:", err.message)
      const classified = ErrorClassifier.classify(err)
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
      setRetryCount(0)
      setFallbackResponse(null)
      setLastUserMessageTime(null)
      setIsInitialMessage(false)
    },
  })

  // ============================================
  // DERIVED STATE
  // ============================================
  const isLoading = status === "streaming" || status === "submitted"

  // ============================================
  // IMPERATIVE HANDLE
  // ============================================
  useImperativeHandle(ref, () => ({
    openChat: () => setIsOpen(true),
    closeChat: () => setIsOpen(false),
    startConversation: () => {
      setIsOpen(true)
    },
  }))

  // ============================================
  // AUTO-SCROLL
  // ============================================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ============================================
  // HANDLERS
  // ============================================
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!input.trim() || isLoading) return

      setLastUserMessageTime(Date.now())
      sendMessage({ text: input.trim() })
      setInput("")
    },
    [input, isLoading, sendMessage],
  )

  const handleServiceSelect = useCallback(
    (serviceId: string) => {
      setSelectedService(serviceId)
      const service = serviceOptions.find((s) => s.id === serviceId)
      if (service) {
        sendMessage({ text: `I need help with ${service.name}` })
        setCurrentStep("details")
      }
    },
    [sendMessage],
  )

  const handleRetry = useCallback(() => {
    if (retryCount < 3) {
      setRetryCount((prev) => prev + 1)
      setHasError(false)
      setErrorMessage(null)
      sendMessage({ text: "Please try again" })
    }
  }, [retryCount, sendMessage])

  // ============================================
  // RENDER HELPERS
  // ============================================
  const renderMessage = (message: UIMessage, index: number) => {
    const isUser = message.role === "user"
    const text = getTextFromMessage(message)

    if (!text) return null

    return (
      <div key={message.id || index} className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            isUser ? "bg-primary text-primary-foreground" : "bg-orange-500 text-white"
          }`}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>
        <div
          className={`max-w-[80%] rounded-2xl px-4 py-2 ${
            isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{text}</p>
        </div>
      </div>
    )
  }

  const renderServicePicker = () => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3">
      {serviceOptions.map((service) => (
        <button
          key={service.id}
          onClick={() => handleServiceSelect(service.id)}
          className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all hover:border-primary hover:bg-primary/5 ${
            selectedService === service.id ? "border-primary bg-primary/10" : "border-border"
          }`}
        >
          <div className="text-primary">{service.icon}</div>
          <span className="text-xs font-medium text-center leading-tight">{service.name}</span>
          <span className="text-[10px] text-muted-foreground text-center leading-tight hidden sm:block">
            {service.description}
          </span>
        </button>
      ))}
    </div>
  )

  // ============================================
  // MAIN RENDER
  // ============================================
  if (!isOpen && !embedded) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-orange-500 p-0 shadow-lg hover:bg-orange-600"
      >
        <Bot className="h-6 w-6 text-white" />
      </Button>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-background ${
        embedded
          ? `w-full h-full min-h-[500px] rounded-xl border shadow-lg ${className}`
          : "fixed bottom-6 right-6 z-50 h-[600px] w-[400px] rounded-xl border shadow-2xl"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-orange-500 px-4 py-3 text-white rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">Maya</h3>
            <p className="text-xs text-white/80">M&M Moving Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!embedded && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <Bot className="h-12 w-12 mx-auto text-orange-500 mb-4" />
            <h4 className="font-semibold text-lg mb-2">Welcome to M&M Moving!</h4>
            <p className="text-muted-foreground text-sm mb-4">
              I'm Maya, your moving assistant. Let me help you get a quote for your commercial move.
            </p>
            {renderServicePicker()}
          </div>
        )}

        {messages.map((message, index) => renderMessage(message, index))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-muted rounded-2xl px-4 py-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Maya is typing...</span>
              </div>
            </div>
          </div>
        )}

        {hasError && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{errorMessage || "Something went wrong"}</span>
            <Button variant="ghost" size="sm" onClick={handleRetry} className="ml-auto">
              <RotateCcw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={!input.trim() || isLoading} className="bg-orange-500 hover:bg-orange-600">
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Or call us:{" "}
          <a href="tel:1300123456" className="text-orange-500 font-medium">
            1300 123 456
          </a>
        </p>
      </div>
    </div>
  )
})

export default QuoteAssistant
