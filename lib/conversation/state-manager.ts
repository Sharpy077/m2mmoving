/**
 * Conversation State Manager
 * Handles persistence and recovery of conversation state
 */

export interface ConversationState {
  id: string
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
  }>
  step:
    | 'business'
    | 'service'
    | 'details'
    | 'quote'
    | 'date'
    | 'contact'
    | 'payment'
    | 'complete'
  selectedOptions: {
    business?: {
      name: string
      abn: string
      type: string
      state: string
      status: string
    }
    service?: {
      id: string
      name: string
      icon: string
      description: string
    }
    date?: string
  }
  formData: {
    contactInfo?: {
      contactName: string
      email: string
      phone: string
      companyName?: string
    }
    quote?: {
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
      breakdown: Array<{ label: string; amount: number }>
      showAvailability?: boolean
    }
  }
  errorState?: {
    lastError: string
    retryCount: number
    lastRetryTime: Date
  }
  createdAt: Date
  lastUpdated: Date
  expiresAt: Date
}

const STORAGE_KEY_PREFIX = 'quote-assistant-conversation-'
const STATE_EXPIRY_HOURS = 24

export class ConversationStateManager {
  /**
   * Save conversation state to localStorage
   */
  static save(state: ConversationState): void {
    try {
      const key = `${STORAGE_KEY_PREFIX}${state.id}`
      const serialized = JSON.stringify({
        ...state,
        createdAt: state.createdAt.toISOString(),
        lastUpdated: state.lastUpdated.toISOString(),
        expiresAt: state.expiresAt.toISOString(),
        messages: state.messages.map((msg) => ({
          ...msg,
          timestamp: msg.timestamp.toISOString(),
        })),
        errorState: state.errorState
          ? {
              ...state.errorState,
              lastRetryTime: state.errorState.lastRetryTime.toISOString(),
            }
          : undefined,
      })
      localStorage.setItem(key, serialized)
    } catch (error) {
      console.error('[StateManager] Failed to save state:', error)
    }
  }

  /**
   * Load conversation state from localStorage
   */
  static load(conversationId: string): ConversationState | null {
    try {
      const key = `${STORAGE_KEY_PREFIX}${conversationId}`
      const serialized = localStorage.getItem(key)

      if (!serialized) {
        return null
      }

      const parsed = JSON.parse(serialized)

      // Check if expired
      const expiresAt = new Date(parsed.expiresAt)
      if (expiresAt < new Date()) {
        this.clear(conversationId)
        return null
      }

      // Deserialize dates
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        lastUpdated: new Date(parsed.lastUpdated),
        expiresAt: new Date(parsed.expiresAt),
        messages: parsed.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
        errorState: parsed.errorState
          ? {
              ...parsed.errorState,
              lastRetryTime: new Date(parsed.errorState.lastRetryTime),
            }
          : undefined,
      }
    } catch (error) {
      console.error('[StateManager] Failed to load state:', error)
      return null
    }
  }

  /**
   * Clear conversation state
   */
  static clear(conversationId: string): void {
    try {
      const key = `${STORAGE_KEY_PREFIX}${conversationId}`
      localStorage.removeItem(key)
    } catch (error) {
      console.error('[StateManager] Failed to clear state:', error)
    }
  }

  /**
   * Create new conversation state
   */
  static create(conversationId: string): ConversationState {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + STATE_EXPIRY_HOURS * 60 * 60 * 1000)

    return {
      id: conversationId,
      messages: [],
      step: 'business',
      selectedOptions: {},
      formData: {},
      createdAt: now,
      lastUpdated: now,
      expiresAt,
    }
  }

  /**
   * Update conversation state
   */
  static update(
    conversationId: string,
    updates: Partial<ConversationState>
  ): ConversationState | null {
    const current = this.load(conversationId) || this.create(conversationId)

    const updated: ConversationState = {
      ...current,
      ...updates,
      id: conversationId,
      lastUpdated: new Date(),
    }

    this.save(updated)
    return updated
  }

  /**
   * Clean up expired states
   */
  static cleanupExpired(): void {
    try {
      const keys = Object.keys(localStorage)
      const now = new Date()

      keys.forEach((key) => {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
          const serialized = localStorage.getItem(key)
          if (serialized) {
            try {
              const parsed = JSON.parse(serialized)
              const expiresAt = new Date(parsed.expiresAt)
              if (expiresAt < now) {
                localStorage.removeItem(key)
              }
            } catch {
              // Invalid JSON, remove it
              localStorage.removeItem(key)
            }
          }
        }
      })
    } catch (error) {
      console.error('[StateManager] Failed to cleanup expired states:', error)
    }
  }

  /**
   * Find most recent conversation state
   */
  static findMostRecent(): ConversationState | null {
    try {
      const keys = Object.keys(localStorage)
      let mostRecent: ConversationState | null = null
      let mostRecentTime = 0

      keys.forEach((key) => {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
          const state = this.load(key.replace(STORAGE_KEY_PREFIX, ''))
          if (state && state.lastUpdated.getTime() > mostRecentTime) {
            mostRecent = state
            mostRecentTime = state.lastUpdated.getTime()
          }
        }
      })

      return mostRecent
    } catch (error) {
      console.error('[StateManager] Failed to find most recent state:', error)
      return null
    }
  }
}

// Cleanup expired states on load
if (typeof window !== 'undefined') {
  ConversationStateManager.cleanupExpired()
}
