export interface UIMessagePart {
  type: "text" | "tool-call" | "tool-result"
  text?: string
  toolName?: string
  toolCallId?: string
  input?: Record<string, any>
  output?: any
  state?: "input-available" | "output-available" | "input-streaming" | "output-error"
  errorText?: string
}

export interface UIMessage {
  id: string
  role: "user" | "assistant" | "system"
  content?: string
  parts?: UIMessagePart[]
  createdAt?: Date
}
