"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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

export function QuoteAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [currentQuote, setCurrentQuote] = useState<QuoteEstimate | null>(null)
  const [isSubmittingLead, setIsSubmittingLead] = useState(false)
  const [leadSubmitted, setLeadSubmitted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/quote-assistant" }),
    onError: (error) => {
      console.error("[v0] Chat error:", error)
    },
  })

  // Initialize speech services
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Speech Recognition
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
            // Auto-send after final result
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

      // Speech Synthesis
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
      // Extract text content from message parts
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

  const speakText = (text: string) => {
    if (!synthRef.current) return

    // Cancel any ongoing speech
    synthRef.current.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "en-AU"
    utterance.rate = 1.0
    utterance.pitch = 1.0

    // Try to find an Australian voice
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
      // Stop any ongoing speech
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
  }

  const suggestedPrompts = [
    "I need to move my office",
    "Get a quote for IT equipment transport",
    "We're relocating our data centre",
    "I'd like to speak with someone",
  ]

  return (
    <>
      {/* Chat Trigger Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg",
          "bg-primary hover:bg-primary/90 transition-all duration-300",
          "md:h-16 md:w-auto md:px-6 md:gap-2",
          isOpen && "hidden",
        )}
      >
        <Sparkles className="h-6 w-6" />
        <span className="hidden md:inline font-semibold">AI Quote Assistant</span>
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <Card
          className={cn(
            "fixed z-50 flex flex-col shadow-2xl border-0",
            "bottom-0 right-0 left-0 top-0 rounded-none",
            "md:bottom-6 md:right-6 md:left-auto md:top-auto",
            "md:w-[420px] md:h-[600px] md:rounded-2xl",
            "bg-background",
          )}
        >
          {/* Header */}
          <CardHeader className="flex-shrink-0 border-b bg-primary text-primary-foreground rounded-t-none md:rounded-t-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Quote Assistant</CardTitle>
                  <p className="text-sm text-primary-foreground/80">
                    {status === "streaming" ? "Typing..." : "Ask me anything about your move"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  title={voiceEnabled ? "Mute voice" : "Enable voice"}
                >
                  {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Messages */}
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Welcome to M&M Moving</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  I can help you get a quick quote for your commercial move. Just tell me what you need, or tap a
                  suggestion below.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestedPrompts.map((prompt) => (
                    <Button
                      key={prompt}
                      variant="outline"
                      size="sm"
                      className="text-xs bg-transparent"
                      onClick={() => {
                        sendMessage({ text: prompt })
                      }}
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

                {/* Quote Summary Card */}
                {currentQuote && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        <span className="font-semibold">Your Quote Estimate</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Move Type</span>
                          <span className="font-medium">{currentQuote.moveType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Size</span>
                          <span className="font-medium">{currentQuote.squareMeters} sqm</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Route</span>
                          <span className="font-medium">
                            {currentQuote.origin} → {currentQuote.destination}
                          </span>
                        </div>
                        {currentQuote.additionalServices.length > 0 && (
                          <div className="pt-2 border-t">
                            <span className="text-muted-foreground text-xs">Additional Services</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {currentQuote.additionalServices.map((service) => (
                                <Badge key={service} variant="secondary" className="text-xs">
                                  {service}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="pt-2 border-t flex justify-between items-center">
                          <span className="font-semibold">Estimated Total</span>
                          <span className="text-xl font-bold text-primary">
                            ${currentQuote.estimatedTotal.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>50% deposit required</span>
                          <span>${currentQuote.depositRequired.toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Lead Submitted Success */}
                {leadSubmitted && (
                  <Card className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
                    <CardContent className="p-4 flex items-center gap-3">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                      <div>
                        <p className="font-semibold text-green-800 dark:text-green-200">Quote Saved!</p>
                        <p className="text-sm text-green-700 dark:text-green-300">We'll be in touch shortly.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </CardContent>

          {/* Input Area */}
          <div className="flex-shrink-0 border-t p-4 bg-muted/30">
            <div className="flex items-center gap-2">
              {/* Voice Button */}
              <Button
                variant={isListening ? "default" : "outline"}
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-full flex-shrink-0 transition-all",
                  isListening && "bg-red-500 hover:bg-red-600 animate-pulse",
                )}
                onClick={toggleListening}
                disabled={status === "streaming"}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>

              {/* Text Input */}
              <div className="flex-1 relative">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isListening ? "Listening..." : "Type or speak your message..."}
                  className="pr-12 h-10 rounded-full"
                  disabled={status === "streaming" || isListening}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || status === "streaming"}
                >
                  {status === "streaming" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between mt-3 text-xs">
              <Button variant="ghost" size="sm" className="text-muted-foreground h-7 px-2" onClick={resetChat}>
                Start over
              </Button>
              <a href="tel:+61400000000" className="flex items-center gap-1 text-primary hover:underline">
                <Phone className="h-3 w-3" />
                Prefer to call?
              </a>
            </div>
          </div>
        </Card>
      )}
    </>
  )
}

// Message Bubble Component
function MessageBubble({
  message,
}: {
  message: UIMessage
}) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2",
          isUser ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md",
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

          // Tool states - show loading or result
          if (part.type === "tool-calculateQuote") {
            if (part.state === "input-available") {
              return (
                <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Calculating your quote...
                </div>
              )
            }
          }

          if (part.type === "tool-requestCallback") {
            if (part.state === "output-available") {
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mt-2"
                >
                  <Phone className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700 dark:text-green-300">
                    Callback requested! We'll call you soon.
                  </span>
                </div>
              )
            }
          }

          return null
        })}
      </div>
      {isUser && (
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-medium">You</span>
        </div>
      )}
    </div>
  )
}
