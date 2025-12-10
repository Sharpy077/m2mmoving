/**
 * Message Queue
 * Ensures messages are delivered in order and handles async gaps
 */

export interface QueuedMessage {
  id: string
  type: "user" | "assistant" | "system"
  content: string
  timestamp: number
  status: "pending" | "sending" | "sent" | "failed"
  retryCount: number
  priority: "normal" | "high" | "urgent"
  metadata?: Record<string, unknown>
}

export interface MessageQueueConfig {
  maxRetries: number
  retryDelayMs: number
  maxQueueSize: number
  staleMessageMs: number
}

const DEFAULT_CONFIG: MessageQueueConfig = {
  maxRetries: 3,
  retryDelayMs: 2000,
  maxQueueSize: 50,
  staleMessageMs: 300000, // 5 minutes
}

export class MessageQueue {
  private queue: QueuedMessage[] = []
  private config: MessageQueueConfig
  private processing = false
  private onMessageSent?: (message: QueuedMessage) => Promise<void>
  private onMessageFailed?: (message: QueuedMessage, error: Error) => void

  constructor(
    config: Partial<MessageQueueConfig> = {},
    onMessageSent?: (message: QueuedMessage) => Promise<void>,
    onMessageFailed?: (message: QueuedMessage, error: Error) => void,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.onMessageSent = onMessageSent
    this.onMessageFailed = onMessageFailed
  }

  /**
   * Add message to queue
   */
  enqueue(
    content: string,
    type: "user" | "assistant" | "system" = "user",
    priority: "normal" | "high" | "urgent" = "normal",
    metadata?: Record<string, unknown>,
  ): QueuedMessage {
    const message: QueuedMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      timestamp: Date.now(),
      status: "pending",
      retryCount: 0,
      priority,
      metadata,
    }

    // Remove stale messages
    this.cleanup()

    // Check queue size
    if (this.queue.length >= this.config.maxQueueSize) {
      // Remove oldest non-urgent messages
      const nonUrgent = this.queue.filter((m) => m.priority !== "urgent" && m.status === "pending")
      if (nonUrgent.length > 0) {
        const oldest = nonUrgent[0]
        this.queue = this.queue.filter((m) => m.id !== oldest.id)
      }
    }

    // Insert based on priority
    if (priority === "urgent") {
      // Insert at front of pending messages
      const firstPendingIndex = this.queue.findIndex((m) => m.status === "pending")
      if (firstPendingIndex >= 0) {
        this.queue.splice(firstPendingIndex, 0, message)
      } else {
        this.queue.push(message)
      }
    } else if (priority === "high") {
      // Insert after urgent messages
      const insertIndex = this.queue.findIndex((m) => m.status === "pending" && m.priority === "normal")
      if (insertIndex >= 0) {
        this.queue.splice(insertIndex, 0, message)
      } else {
        this.queue.push(message)
      }
    } else {
      this.queue.push(message)
    }

    // Start processing if not already
    this.processQueue()

    return message
  }

  /**
   * Process queued messages
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return
    this.processing = true

    while (this.queue.some((m) => m.status === "pending")) {
      const message = this.queue.find((m) => m.status === "pending")
      if (!message) break

      message.status = "sending"

      try {
        if (this.onMessageSent) {
          await this.onMessageSent(message)
        }
        message.status = "sent"
      } catch (error) {
        message.retryCount++

        if (message.retryCount >= this.config.maxRetries) {
          message.status = "failed"
          if (this.onMessageFailed) {
            this.onMessageFailed(message, error as Error)
          }
        } else {
          message.status = "pending"
          // Wait before retry
          await this.delay(this.config.retryDelayMs * message.retryCount)
        }
      }
    }

    this.processing = false
  }

  /**
   * Get queue status
   */
  getStatus(): {
    total: number
    pending: number
    sending: number
    sent: number
    failed: number
  } {
    return {
      total: this.queue.length,
      pending: this.queue.filter((m) => m.status === "pending").length,
      sending: this.queue.filter((m) => m.status === "sending").length,
      sent: this.queue.filter((m) => m.status === "sent").length,
      failed: this.queue.filter((m) => m.status === "failed").length,
    }
  }

  /**
   * Get failed messages for retry
   */
  getFailedMessages(): QueuedMessage[] {
    return this.queue.filter((m) => m.status === "failed")
  }

  /**
   * Retry failed messages
   */
  retryFailed(): void {
    this.queue.forEach((m) => {
      if (m.status === "failed") {
        m.status = "pending"
        m.retryCount = 0
      }
    })
    this.processQueue()
  }

  /**
   * Clear sent messages
   */
  clearSent(): void {
    this.queue = this.queue.filter((m) => m.status !== "sent")
  }

  /**
   * Clear all messages
   */
  clear(): void {
    this.queue = []
  }

  /**
   * Remove stale messages
   */
  private cleanup(): void {
    const now = Date.now()
    this.queue = this.queue.filter((m) => now - m.timestamp < this.config.staleMessageMs || m.status === "sending")
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Get message by ID
   */
  getMessage(id: string): QueuedMessage | undefined {
    return this.queue.find((m) => m.id === id)
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0 || !this.queue.some((m) => m.status === "pending")
  }

  /**
   * Get pending messages
   */
  getPending(): QueuedMessage[] {
    return this.queue.filter((m) => m.status === "pending")
  }
}

// Export singleton factory
let queueInstance: MessageQueue | null = null

export function getMessageQueue(
  onMessageSent?: (message: QueuedMessage) => Promise<void>,
  onMessageFailed?: (message: QueuedMessage, error: Error) => void,
): MessageQueue {
  if (!queueInstance) {
    queueInstance = new MessageQueue({}, onMessageSent, onMessageFailed)
  }
  return queueInstance
}

export function resetMessageQueue(): void {
  queueInstance = null
}
