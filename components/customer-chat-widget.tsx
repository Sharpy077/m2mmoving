"use client"

import { useState, useRef, useEffect } from "react"
import { MessageSquare, Send, X } from "lucide-react"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

export function CustomerChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm here to help with your commercial moving needs. How can I assist you today?",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMsg])
    const text = input.trim()
    setInput("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent: "SENTINEL_CS",
          message: text,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_${Date.now()}_resp`,
            role: "assistant",
            content: data.response || "Sorry, I couldn't process that. Please try again.",
          },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}_err`,
          role: "assistant",
          content: "Connection error. Please try again.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open chat"
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] flex flex-col rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          <span className="font-semibold">M&M Support</span>
        </div>
        <button onClick={() => setIsOpen(false)} aria-label="Close chat">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-xl text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted p-3 rounded-xl">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0.15s]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            aria-label="Send"
            className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
