"use client"

import type React from "react"

import { useChat } from "@ai-sdk/react"
import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react"
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
} from "lucide-react"
import { submitLead } from "@/app/actions/leads"

interface QuoteEstimate {
  moveType: string
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

const suggestedPrompts = [
  "I need to move my office",
  "Data centre relocation",
  "IT equipment transport",
  "Get a quick quote",
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
    const [voiceEnabled, setVoiceEnabled] = useState(true)
    const [currentQuote, setCurrentQuote] = useState<QuoteEstimate | null>(null)
    const [isSubmittingLead, setIsSubmittingLead] = useState(false)
    const [leadSubmitted, setLeadSubmitted] = useState(false)
    const [businessLookupResults, setBusinessLookupResults] = useState<BusinessResult[] | null>(null)
    const [confirmedBusiness, setConfirmedBusiness] = useState<BusinessResult | null>(null)
    const [showCalendar, setShowCalendar] = useState(false)
    const [availableDates, setAvailableDates] = useState<AvailableDate[]>([])
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [calendarMonth, setCalendarMonth] = useState(new Date())
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

    const { messages, append, status, setMessages } = useChat({
      api: "/api/quote-assistant",
      onToolCall: async ({ toolCall }) => {
        if (toolCall.toolName === "lookupBusiness") {
          const result = toolCall.args as any
          if (result?.results) {
            setBusinessLookupResults(result.results)
          }
        }
        if (toolCall.toolName === "calculateQuote") {
          const quote = toolCall.args as unknown as QuoteEstimate
          setCurrentQuote(quote)
          if (quote.showAvailability) {
            setShowCalendar(true)
          }
        }
        if (toolCall.toolName === "checkAvailability") {
          const result = toolCall.args as any
          if (result?.showCalendar) {
            setShowCalendar(true)
            if (result.availableDates) {
              setAvailableDates(result.availableDates)
            }
          }
        }
        if (toolCall.toolName === "confirmBookingDate") {
          const result = toolCall.args as any
          if (result?.confirmed) {
            setSelectedDate(result.date)
          }
        }
        if (toolCall.toolName === "captureLeadDetails") {
          const result = toolCall.args as any
          if (result?.leadData) {
            setIsSubmittingLead(true)
            try {
              const leadData = {
                lead_type: "ai_quote",
                contact_name: result.leadData.contactName,
                email: result.leadData.email,
                phone: result.leadData.phone || "",
                company_name: result.leadData.companyName || "",
                move_type: result.leadData.moveType?.toLowerCase().replace(/\s+/g, "-") || "office",
                origin_suburb: result.leadData.origin || "",
                destination_suburb: result.leadData.destination || "",
                square_meters: result.leadData.squareMeters || 0,
                estimated_total: result.leadData.estimatedTotal || 0,
                additional_services: result.leadData.additionalServices || [],
                special_requirements: result.leadData.specialRequirements ? [result.leadData.specialRequirements] : [],
                target_move_date: result.leadData.scheduledDate || result.leadData.targetDate || null,
                scheduled_date: result.leadData.scheduledDate || null,
                preferred_contact_time: result.leadData.preferredContactTime || null,
                project_description: `AI Quote - ABN: ${result.leadData.abn || "N/A"}, State: ${result.leadData.businessState || "N/A"}`,
              }
              await submitLead(leadData)
              setLeadSubmitted(true)
            } catch (error) {
              console.error("Failed to submit lead:", error)
            } finally {
              setIsSubmittingLead(false)
            }
          }
        }
      },
    })

    // Scroll to bottom on new messages
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, businessLookupResults, currentQuote, showCalendar])

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
      if (lastMessage?.role === "assistant" && status !== "streaming") {
        const textContent =
          typeof lastMessage.content === "string"
            ? lastMessage.content
            : lastMessage.parts
                ?.filter((p) => p.type === "text")
                .map((p) => (p as any).text)
                .join(" ") || ""
        if (textContent && textContent.length < 500) {
          const utterance = new SpeechSynthesisUtterance(textContent)
          utterance.lang = "en-AU"
          utterance.rate = 1.0
          utterance.onstart = () => setIsSpeaking(true)
          utterance.onend = () => setIsSpeaking(false)
          synthRef.current.speak(utterance)
        }
      }
    }, [messages, status, voiceEnabled])

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
            }, 300)
          }
          recognition.onerror = () => setIsListening(false)
          recognition.onend = () => setIsListening(false)
          recognitionRef.current = recognition
        }
      }
    }, [])

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

    const sendMessage = async ({ text }: { text: string }) => {
      if (!text.trim()) return
      setInputValue("")
      setBusinessLookupResults(null)
      await append({ role: "user", content: text })
    }

    const handleSendMessage = () => sendMessage({ text: inputValue })

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

    // Message bubble component
    const MessageBubble = ({ message }: { message: any }) => {
      const isUser = message.role === "user"
      const textParts = message.parts?.filter((p: any) => p.type === "text") || []

      if (textParts.length === 0 && typeof message.content !== "string") return null

      const content =
        typeof message.content === "string" ? message.content : textParts.map((p: any) => p.text).join("\n")

      if (!content.trim()) return null

      return (
        <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
          <div
            className={cn(
              "max-w-[85%] rounded-xl px-4 py-2.5 text-sm",
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
            Found {results.length} matching business{results.length > 1 ? "es" : ""}:
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
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-sm">Your Quote Estimate</p>
            <Badge variant="outline" className="text-xs">
              {quote.moveType}
            </Badge>
          </div>
          <div className="text-2xl font-bold text-primary mb-2">${quote.estimatedTotal.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              {quote.origin} → {quote.destination}
            </p>
            <p>{quote.squareMeters} sqm</p>
            <p className="text-primary">50% deposit: ${quote.depositRequired.toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>
    )

    const CalendarPicker = () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
      const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0)
      const startPadding = monthStart.getDay()

      const days: (Date | null)[] = []

      // Add padding for days before month starts
      for (let i = 0; i < startPadding; i++) {
        days.push(null)
      }

      // Add all days of the month
      for (let d = 1; d <= monthEnd.getDate(); d++) {
        days.push(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), d))
      }

      const isDateAvailable = (date: Date): boolean => {
        const dateStr = date.toISOString().split("T")[0]
        const dayOfWeek = date.getDay()

        // Skip weekends
        if (dayOfWeek === 0 || dayOfWeek === 6) return false

        // Skip past dates
        if (date < today) return false

        // Check availability data
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
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-muted border line-through text-[8px] flex items-center justify-center">
                  x
                </span>
                <span>Unavailable</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    // Lead submitted card
    const LeadSubmittedCard = () => (
      <Card className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
        <CardContent className="p-3 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <div>
            <p className="font-semibold text-sm text-green-800 dark:text-green-200">
              {selectedDate ? "Booking Confirmed!" : "Quote Request Submitted!"}
            </p>
            <p className="text-xs text-green-700 dark:text-green-300">
              {selectedDate
                ? `Your move is scheduled for ${new Date(selectedDate).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}`
                : "We'll be in touch within 24 hours."}
            </p>
          </div>
        </CardContent>
      </Card>
    )

    // Confirmed date badge
    const ConfirmedDateBadge = () => {
      if (!selectedDate) return null
      return (
        <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg border border-primary/30">
          <Calendar className="h-4 w-4 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary">Moving Date Confirmed</p>
            <p className="text-xs text-foreground">
              {new Date(selectedDate).toLocaleDateString("en-AU", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      )
    }

    // Embedded version
    if (embedded) {
      return (
        <div ref={containerRef} className="w-full">
          <Card className="border-primary/30 bg-card/95 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-primary text-primary-foreground p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">AI Quote Assistant</CardTitle>
                    <p className="text-xs text-primary-foreground/80">
                      {status === "streaming" ? "Typing..." : "Voice & chat enabled"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    title={voiceEnabled ? "Mute voice" : "Enable voice"}
                  >
                    {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="h-[380px] overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-2">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <MessageCircle className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">Get an Instant Quote & Book</h3>
                  <p className="text-muted-foreground text-xs mb-4">
                    Tell me about your move and I'll give you a quote with available dates
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {suggestedPrompts.map((prompt) => (
                      <Button
                        key={prompt}
                        variant="outline"
                        size="sm"
                        className="text-xs bg-transparent h-7 px-2"
                        onClick={() => sendMessage({ text: prompt })}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}

                  {businessLookupResults && businessLookupResults.length > 0 && (
                    <BusinessLookupCard results={businessLookupResults} onSelect={handleSelectBusiness} />
                  )}

                  {confirmedBusiness && <ConfirmedBusinessBadge business={confirmedBusiness} />}

                  {currentQuote && <QuoteCard quote={currentQuote} />}

                  {showCalendar && !selectedDate && <CalendarPicker />}

                  {selectedDate && <ConfirmedDateBadge />}

                  {leadSubmitted && <LeadSubmittedCard />}

                  {status === "streaming" && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </CardContent>

            <div className="border-t bg-muted/30 p-3">
              <div className="flex items-center gap-2">
                <Button
                  variant={isListening ? "default" : "outline"}
                  size="icon"
                  className={cn("h-10 w-10 shrink-0", isListening && "bg-red-500 hover:bg-red-600")}
                  onClick={toggleListening}
                  disabled={status === "streaming"}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isListening ? "Listening..." : "Type or speak your request..."}
                  className="flex-1 h-10 px-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={status === "streaming" || isListening}
                />
                <Button
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || status === "streaming"}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">
                  {isListening ? (
                    <span className="text-red-500 flex items-center gap-1">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      Recording...
                    </span>
                  ) : (
                    "Tap mic for voice input"
                  )}
                </p>
                <a href="tel:+61388201801" className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Prefer to call?
                </a>
              </div>
            </div>
          </Card>
        </div>
      )
    }

    // Floating version
    return (
      <>
        <Button
          onClick={() => {
            setIsOpen(true)
            setIsMinimized(false)
          }}
          className={cn(
            "fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 h-14 shadow-lg",
            "bg-primary hover:bg-primary/90 transition-all duration-300",
            "gap-2 px-4",
            isOpen && "hidden",
          )}
        >
          <Sparkles className="h-5 w-5" />
          <span className="font-semibold">Get Quote</span>
        </Button>

        {isOpen && (
          <Card
            className={cn(
              "fixed z-50 flex flex-col shadow-2xl border-primary/30",
              isMinimized
                ? "bottom-20 md:bottom-6 right-4 md:right-6 w-72 h-auto rounded-xl"
                : "bottom-0 right-0 left-0 top-0 rounded-none md:bottom-6 md:right-6 md:left-auto md:top-auto md:w-[400px] md:h-[600px] md:rounded-xl",
              "bg-background",
            )}
          >
            <CardHeader
              className={cn(
                "flex-shrink-0 border-b bg-primary text-primary-foreground p-3",
                isMinimized ? "rounded-xl" : "rounded-t-none md:rounded-t-xl",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Quote & Book</CardTitle>
                    {!isMinimized && (
                      <p className="text-xs text-primary-foreground/80">
                        {status === "streaming" ? "Typing..." : "Voice & chat"}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!isMinimized && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
                      onClick={() => setVoiceEnabled(!voiceEnabled)}
                    >
                      {voiceEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20 hidden md:flex"
                    onClick={() => setIsMinimized(!isMinimized)}
                  >
                    {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {!isMinimized && (
              <>
                <CardContent className="flex-1 overflow-y-auto p-3 space-y-3">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-2">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <MessageCircle className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold text-sm mb-1">Get a Quote & Book</h3>
                      <p className="text-muted-foreground text-xs mb-4">Describe your move or tap a suggestion</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {suggestedPrompts.map((prompt) => (
                          <Button
                            key={prompt}
                            variant="outline"
                            size="sm"
                            className="text-xs bg-transparent h-7 px-2"
                            onClick={() => sendMessage({ text: prompt })}
                          >
                            {prompt}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                      ))}

                      {businessLookupResults && businessLookupResults.length > 0 && (
                        <BusinessLookupCard results={businessLookupResults} onSelect={handleSelectBusiness} />
                      )}

                      {confirmedBusiness && <ConfirmedBusinessBadge business={confirmedBusiness} />}

                      {currentQuote && <QuoteCard quote={currentQuote} />}

                      {showCalendar && !selectedDate && <CalendarPicker />}

                      {selectedDate && <ConfirmedDateBadge />}

                      {leadSubmitted && <LeadSubmittedCard />}

                      {status === "streaming" && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Thinking...</span>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </CardContent>

                <div className="border-t bg-muted/30 p-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={isListening ? "default" : "outline"}
                      size="icon"
                      className={cn("h-9 w-9 shrink-0", isListening && "bg-red-500 hover:bg-red-600")}
                      onClick={toggleListening}
                      disabled={status === "streaming"}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={isListening ? "Listening..." : "Type or speak..."}
                      className="flex-1 h-9 px-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                      disabled={status === "streaming" || isListening}
                    />
                    <Button
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || status === "streaming"}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        )}
      </>
    )
  },
)

QuoteAssistant.displayName = "QuoteAssistant"
