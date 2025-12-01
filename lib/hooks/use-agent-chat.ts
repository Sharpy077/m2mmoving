/**
 * useAgentChat Hook
 * Custom React hook for streaming chat with AI agents
 */

"use client"

import { useState, useCallback, useRef, useEffect } from "react"

export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  agentId?: string
  agentName?: string
  timestamp: Date
  isStreaming?: boolean
}

export interface UseAgentChatOptions {
  agentId?: string
  onError?: (error: Error) => void
  onFinish?: (message: ChatMessage) => void
  onAgentChange?: (agentId: string, agentName: string) => void
}

export interface UseAgentChatReturn {
  messages: ChatMessage[]
  input: string
  setInput: (input: string) => void
  handleSubmit: (e?: React.FormEvent) => Promise<void>
  isLoading: boolean
  error: Error | null
  currentAgent: { id: string; name: string } | null
  clearMessages: () => void
  stop: () => void
}

export function useAgentChat(options: UseAgentChatOptions = {}): UseAgentChatReturn {
  const { agentId, onError, onFinish, onAgentChange } = options

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [currentAgent, setCurrentAgent] = useState<{ id: string; name: string } | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault()
      
      if (!input.trim() || isLoading) return

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: input.trim(),
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      setInput("")
      setIsLoading(true)
      setError(null)

      // Create placeholder for assistant message
      const assistantMessageId = `assistant-${Date.now()}`
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      }

      setMessages((prev) => [...prev, assistantMessage])

      try {
        abortControllerRef.current = new AbortController()

        const response = await fetch("/api/agents/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            agentId,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        // Get agent info from headers
        const agentIdHeader = response.headers.get("X-Agent-Id")
        const agentNameHeader = response.headers.get("X-Agent-Name")
        
        if (agentIdHeader && agentNameHeader) {
          setCurrentAgent({ id: agentIdHeader, name: agentNameHeader })
          onAgentChange?.(agentIdHeader, agentNameHeader)
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error("No response body")
        }

        let fullContent = ""

        while (true) {
          const { done, value } = await reader.read()
          
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6))
                
                if (data.error) {
                  throw new Error(data.error)
                }

                if (data.content) {
                  fullContent += data.content
                  
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessageId
                        ? {
                            ...m,
                            content: fullContent,
                            agentId: data.agent,
                            agentName: agentNameHeader || undefined,
                          }
                        : m
                    )
                  )
                }

                if (data.done) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, isStreaming: false }
                        : m
                    )
                  )
                  
                  const finalMessage = messages.find((m) => m.id === assistantMessageId)
                  if (finalMessage) {
                    onFinish?.(finalMessage)
                  }
                }
              } catch (parseError) {
                // Skip invalid JSON lines
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // User cancelled, don't treat as error
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, isStreaming: false, content: m.content || "[Cancelled]" }
                : m
            )
          )
        } else {
          const error = err instanceof Error ? err : new Error("Unknown error")
          setError(error)
          onError?.(error)
          
          // Remove the empty assistant message
          setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId))
        }
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
      }
    },
    [input, isLoading, messages, agentId, onError, onFinish, onAgentChange]
  )

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
    setCurrentAgent(null)
  }, [])

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    error,
    currentAgent,
    clearMessages,
    stop,
  }
}
