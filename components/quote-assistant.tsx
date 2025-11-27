"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { submitLead } from "@/app/actions/leads"
import {
  MessageCircle,
  X,
  Send,
  Mic,
  MicOff,
  Phone,
  CheckCircle2,
  Loader2,
  Volume2,
  VolumeX,
  Sparkles,
  Building2,
  Search,
  Minimize2,
  Maximize2,
} from "lucide-react"

interface QuoteEstimate {
  moveType: string
  squareMeters: number
  origin: string
  destination: string
  estimatedTotal: number
  depositRequired: number
  additionalServices: string[]
  breakdown: {
    baseRate: number
    areaCost: number
    distanceCost: number
    servicesCost: number
  }
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

export interface QuoteAssistantHandle {
  open: () => void
  focus: () => void
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
      focus: () => {
        inputRef.current?.focus()
      },
    }))

    const { messages, sendMessage, status, setMessages } = useChat({
      transport: new DefaultChatTransport({ api: "/api/quote-assistant" }),
      onError: (error) => {
        console.error("[v0] Chat error:", error)
      },
    })

    // Initialize speech services
    useEffect(() => {
      if (typeof window !== "undefined") {
        const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (SpeechRecognitionAPI) {
          recognitionRef.current = new SpeechRecognitionAPI()
          recognitionRef.current.continuous = false
          recognitionRef.current.interimResults = true
          recognitionRef.current.lang = "en-AU"

          recognitionRef.current.onresult = (event: any) => {
            const transcript = Array.from(event.results)
              .map((result: any) => result[0].transcript)
              .join("")
            setInputValue(transcript)

            if (event.results[0].isFinal) {
              setIsListening(false)
              if (transcript.trim()) {
                sendMessageWithText(transcript.trim())
                setInputValue("")
              }
            }
          }

          recognitionRef.current.onerror = (event: any) => {
            console.error("[v0] Speech recognition error:", event.error)
            setIsListening(false)
          }

          recognitionRef.current.onend = () => {
            setIsListening(false)
          }
        }

        synthRef.current = window.speechSynthesis
      }
    }, [])

    const sendMessageWithText = useCallback(
      (text: string) => {
        if (!text || status === "streaming") return
        sendMessage({ text })
      },
      [status, sendMessage],
    )

    // Scroll to bottom on new messages
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    // Speak assistant responses
    useEffect(() => {
      if (!voiceEnabled || !synthRef.current) return

      const lastMessage = messages[messages.length - 1]
      if (lastMessage?.role === "assistant" && status === "ready") {
        const textContent = lastMessage.parts
          ?.filter((part): part is { type: "text"; text: string } => part.type === "text")
          .map((part) => part.text)
          .join(" ")

        if (textContent && textContent.length < 500) {
          speakText(textContent)
        }
      }
    }, [messages, status, voiceEnabled])

    // Process tool results
    useEffect(() => {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage?.role === "assistant") {
        lastMessage.parts?.forEach((part: any) => {
          if (part.type === "tool-calculateQuote" && part.state === "output-available") {
            setCurrentQuote(part.output as QuoteEstimate)
          }
          if (part.type === "tool-captureLeadDetails" && part.state === "output-available") {
            const result = part.output as { success: boolean; leadData: any }
            if (result.success) {
              handleLeadSubmission(result.leadData)
            }
          }
          if (part.type === "tool-lookupBusiness" && part.state === "output-available") {
            const result = part.output as { success: boolean; results: BusinessResult[]; message?: string }
            if (result.success && result.results.length > 0) {
              setBusinessLookupResults(result.results)
            }
          }
          if (part.type === "tool-getBusinessDetails" && part.state === "output-available") {
            const result = part.output as { success: boolean; business: any }
            if (result.success) {
              setConfirmedBusiness(result.business)
            }
          }
        })
      }
    }, [messages])

    const handleLeadSubmission = async (leadData: any) => {
      if (isSubmittingLead || leadSubmitted) return
      setIsSubmittingLead(true)

      try {
        const result = await submitLead({
          lead_type: "instant_quote",
          email: leadData.email,
          contact_name: leadData.contactName,
          company_name: leadData.companyName,
          phone: leadData.phone,
          move_type: leadData.moveType,
          origin_suburb: leadData.origin,
          destination_suburb: leadData.destination,
          square_meters: leadData.squareMeters,
          estimated_total: leadData.estimatedTotal,
          additional_services: leadData.additionalServices,
          target_move_date: leadData.targetDate,
          preferred_contact_time: leadData.preferredContactTime,
          abn: leadData.abn,
        })

        if (result.success) {
          setLeadSubmitted(true)
        }
      } catch (error) {
        console.error("[v0] Lead submission error:", error)
      } finally {
        setIsSubmittingLead(false)
      }
    }

    const handleSelectBusiness = (business: BusinessResult) => {
      setConfirmedBusiness(business)
      setBusinessLookupResults(null)
      sendMessage({
        text: `Yes, that's correct - ${business.name} (ABN: ${business.abn})`,
      })
    }

    const speakText = (text: string) => {
      if (!synthRef.current) return

      synthRef.current.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = "en-AU"
      utterance.rate = 1.0
      utterance.pitch = 1.0

      const voices = synthRef.current.getVoices()
      const ausVoice = voices.find((v) => v.lang === "en-AU" || v.name.toLowerCase().includes("australia"))
      if (ausVoice) {
        utterance.voice = ausVoice
      }

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      synthRef.current.speak(utterance)
    }

    const toggleListening = () => {
      if (!recognitionRef.current) {
        alert("Speech recognition is not supported in your browser. Please try Chrome or Edge.")
        return
      }

      if (isListening) {
        recognitionRef.current.stop()
        setIsListening(false)
      } else {
        synthRef.current?.cancel()
        setIsSpeaking(false)

        recognitionRef.current.start()
        setIsListening(true)
      }
    }

    const handleSendMessage = useCallback(() => {
      const messageText = inputValue.trim()
      if (!messageText || status === "streaming") return

      sendMessage({ text: messageText })
      setInputValue("")
    }, [inputValue, status, sendMessage])

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSendMessage()
      }
    }

    const resetChat = () => {
      setMessages([])
      setCurrentQuote(null)
      setLeadSubmitted(false)
      setBusinessLookupResults(null)
      setConfirmedBusiness(null)
    }

    const suggestedPrompts = [
      "I need to move my office",
      "Get a quote for IT equipment",
      "Relocating our data centre",
      "Speak with someone",
    ]

    if (embedded) {
      return (
        <div ref={containerRef} className="w-full">
          <Card className="border-primary/30 bg-card/95 backdrop-blur-sm overflow-hidden">
            {/* Header */}
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

            {/* Messages */}
            <CardContent className="h-[320px] overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-2">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <MessageCircle className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">Get an Instant Quote</h3>
                  <p className="text-muted-foreground text-xs mb-4">
                    Tell me about your move or tap a suggestion below
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

            {/* Input Area */}
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

    return (
      <>
        {/* Floating Trigger Button */}
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

        {/* Floating Chat Window */}
        {isOpen && (
          <Card
            className={cn(
              "fixed z-50 flex flex-col shadow-2xl border-primary/30",
              isMinimized
                ? "bottom-20 md:bottom-6 right-4 md:right-6 w-72 h-auto rounded-xl"
                : "bottom-0 right-0 left-0 top-0 rounded-none md:bottom-6 md:right-6 md:left-auto md:top-auto md:w-[400px] md:h-[550px] md:rounded-xl",
              "bg-background",
            )}
          >
            {/* Header */}
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
                    <CardTitle className="text-sm">Quote Assistant</CardTitle>
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
                {/* Messages */}
                <CardContent className="flex-1 overflow-y-auto p-3 space-y-3">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-2">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <MessageCircle className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold text-sm mb-1">Get an Instant Quote</h3>
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

                {/* Input Area */}
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

function MessageBubble({ message }: { message: any }) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-xl px-3 py-2",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        {message.parts?.map((part: any, index: number) => {
          if (part.type === "text") {
            return (
              <p key={index} className="text-sm whitespace-pre-wrap">
                {part.text}
              </p>
            )
          }
          return null
        })}
      </div>
    </div>
  )
}

function BusinessLookupCard({
  results,
  onSelect,
}: {
  results: BusinessResult[]
  onSelect: (business: BusinessResult) => void
}) {
  return (
    <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Search className="h-4 w-4 text-blue-600" />
          <span className="font-semibold text-sm text-blue-800 dark:text-blue-200">
            {results.length === 1 ? "Is this your business?" : "Select your business"}
          </span>
        </div>
        <div className="space-y-2">
          {results.slice(0, 3).map((business) => (
            <button
              key={business.abn}
              onClick={() => onSelect(business)}
              className="w-full text-left p-2 rounded-lg bg-white dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-700"
            >
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs truncate">{business.name}</p>
                  {business.tradingName && (
                    <p className="text-xs text-muted-foreground truncate">Trading: {business.tradingName}</p>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant="secondary" className="text-[10px] h-5">
                      ABN: {business.abn}
                    </Badge>
                    {business.state && (
                      <Badge variant="outline" className="text-[10px] h-5">
                        {business.state}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ConfirmedBusinessBadge({ business }: { business: BusinessResult }) {
  return (
    <Card className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
      <CardContent className="p-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-xs text-green-800 dark:text-green-200 truncate">{business.name}</p>
            <p className="text-[10px] text-green-700 dark:text-green-300">
              ABN: {business.abn} • {business.state}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function QuoteCard({ quote }: { quote: QuoteEstimate }) {
  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Your Quote Estimate</span>
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Move Type</span>
            <span className="font-medium">{quote.moveType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Size</span>
            <span className="font-medium">{quote.squareMeters} sqm</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Route</span>
            <span className="font-medium truncate max-w-[180px]">
              {quote.origin} → {quote.destination}
            </span>
          </div>
          {quote.additionalServices.length > 0 && (
            <div className="pt-1 border-t">
              <div className="flex flex-wrap gap-1 mt-1">
                {quote.additionalServices.map((service) => (
                  <Badge key={service} variant="secondary" className="text-[10px]">
                    {service}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <div className="pt-2 border-t flex justify-between items-center">
            <span className="font-semibold">Estimated Total</span>
            <span className="text-lg font-bold text-primary">${quote.estimatedTotal.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function LeadSubmittedCard() {
  return (
    <Card className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
      <CardContent className="p-3 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-green-600" />
        <div>
          <p className="font-semibold text-sm text-green-800 dark:text-green-200">Quote Request Submitted!</p>
          <p className="text-xs text-green-700 dark:text-green-300">We'll be in touch within 24 hours.</p>
        </div>
      </CardContent>
    </Card>
  )
}
