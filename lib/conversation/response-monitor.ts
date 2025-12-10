/**
 * Response Monitor
 * Monitors response times and detects timeouts
 */

export interface TimeoutConfig {
  normalTimeout: number // Default timeout for normal responses
  initialTimeout: number // Extended timeout for initial message
  toolTimeout: number // Extended timeout for tool-heavy responses
}

const DEFAULT_TIMEOUT_CONFIG: TimeoutConfig = {
  normalTimeout: 10000, // 10 seconds
  initialTimeout: 15000, // 15 seconds
  toolTimeout: 20000, // 20 seconds
}

export interface TimeoutCallback {
  (messageId: string): void
}

export class ResponseMonitor {
  private timers: Map<string, NodeJS.Timeout> = new Map()
  private config: TimeoutConfig
  private onTimeoutCallbacks: Set<TimeoutCallback> = new Set()

  constructor(config: Partial<TimeoutConfig> = {}) {
    this.config = { ...DEFAULT_TIMEOUT_CONFIG, ...config }
  }

  /**
   * Start monitoring a message
   */
  startTimer(
    messageId: string,
    timeoutType: 'normal' | 'initial' | 'tool' = 'normal'
  ): void {
    // Clear any existing timer
    this.cancelTimer(messageId)

    // Determine timeout duration
    const timeoutMs =
      timeoutType === 'initial'
        ? this.config.initialTimeout
        : timeoutType === 'tool'
          ? this.config.toolTimeout
          : this.config.normalTimeout

    // Set timer
    const timer = setTimeout(() => {
      this.handleTimeout(messageId)
    }, timeoutMs)

    this.timers.set(messageId, timer)
  }

  /**
   * Cancel timer for a message
   */
  cancelTimer(messageId: string): void {
    const timer = this.timers.get(messageId)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(messageId)
    }
  }

  /**
   * Register callback for timeout events
   */
  onTimeout(callback: TimeoutCallback): () => void {
    this.onTimeoutCallbacks.add(callback)
    // Return unsubscribe function
    return () => {
      this.onTimeoutCallbacks.delete(callback)
    }
  }

  /**
   * Handle timeout event
   */
  private handleTimeout(messageId: string): void {
    this.timers.delete(messageId)
    this.onTimeoutCallbacks.forEach((callback) => {
      try {
        callback(messageId)
      } catch (error) {
        console.error('[ResponseMonitor] Error in timeout callback:', error)
      }
    })
  }

  /**
   * Clear all timers
   */
  clearAll(): void {
    this.timers.forEach((timer) => clearTimeout(timer))
    this.timers.clear()
  }

  /**
   * Check if a message is being monitored
   */
  isMonitoring(messageId: string): boolean {
    return this.timers.has(messageId)
  }
}

// Singleton instance
let monitorInstance: ResponseMonitor | null = null

export function getResponseMonitor(): ResponseMonitor {
  if (!monitorInstance) {
    monitorInstance = new ResponseMonitor()
  }
  return monitorInstance
}
