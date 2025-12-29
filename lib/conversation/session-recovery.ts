/**
 * Session Recovery Service
 * Handles saving and restoring conversation sessions
 */

import type { ConversationContext } from "./state-machine"

export interface SavedSession {
  conversationId: string
  context: ConversationContext
  messages: SerializedMessage[]
  lastUpdated: number
  version: number
}

export interface SerializedMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: number
  toolCalls?: SerializedToolCall[]
}

export interface SerializedToolCall {
  name: string
  args: Record<string, unknown>
  result?: unknown
}

const STORAGE_KEY = "maya_sessions"
const SESSION_VERSION = 2
const MAX_SESSIONS = 10
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * Session Recovery Manager
 */
export class SessionRecoveryManager {
  /**
   * Save session to storage
   */
  static saveSession(conversationId: string, context: ConversationContext, messages: SerializedMessage[]): boolean {
    try {
      if (typeof window === "undefined") return false

      const sessions = this.getAllSessions()

      // Update or add session
      const existingIndex = sessions.findIndex((s) => s.conversationId === conversationId)
      const session: SavedSession = {
        conversationId,
        context,
        messages,
        lastUpdated: Date.now(),
        version: SESSION_VERSION,
      }

      if (existingIndex >= 0) {
        sessions[existingIndex] = session
      } else {
        sessions.push(session)
      }

      // Limit number of sessions
      const sortedSessions = sessions.sort((a, b) => b.lastUpdated - a.lastUpdated).slice(0, MAX_SESSIONS)

      localStorage.setItem(STORAGE_KEY, JSON.stringify(sortedSessions))
      return true
    } catch (error) {
      console.error("[SessionRecovery] Failed to save session:", error)
      return false
    }
  }

  /**
   * Load session from storage
   */
  static loadSession(conversationId: string): SavedSession | null {
    try {
      if (typeof window === "undefined") return null

      const sessions = this.getAllSessions()
      const session = sessions.find((s) => s.conversationId === conversationId)

      if (!session) return null

      // Check if session is expired
      if (Date.now() - session.lastUpdated > SESSION_EXPIRY_MS) {
        this.deleteSession(conversationId)
        return null
      }

      // Check version compatibility
      if (session.version !== SESSION_VERSION) {
        // Try to migrate or discard
        return this.migrateSession(session)
      }

      return session
    } catch (error) {
      console.error("[SessionRecovery] Failed to load session:", error)
      return null
    }
  }

  /**
   * Get most recent session for recovery
   */
  static getMostRecentSession(): SavedSession | null {
    try {
      if (typeof window === "undefined") return null

      const sessions = this.getAllSessions()
      if (sessions.length === 0) return null

      // Get most recent non-complete session
      const activeSessions = sessions.filter(
        (s) => s.context.stage !== "complete" && Date.now() - s.lastUpdated < SESSION_EXPIRY_MS,
      )

      if (activeSessions.length === 0) return null

      return activeSessions.sort((a, b) => b.lastUpdated - a.lastUpdated)[0]
    } catch (error) {
      console.error("[SessionRecovery] Failed to get recent session:", error)
      return null
    }
  }

  /**
   * Delete session
   */
  static deleteSession(conversationId: string): void {
    try {
      if (typeof window === "undefined") return

      const sessions = this.getAllSessions()
      const filtered = sessions.filter((s) => s.conversationId !== conversationId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    } catch (error) {
      console.error("[SessionRecovery] Failed to delete session:", error)
    }
  }

  /**
   * Clear all sessions
   */
  static clearAllSessions(): void {
    try {
      if (typeof window === "undefined") return
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error("[SessionRecovery] Failed to clear sessions:", error)
    }
  }

  /**
   * Get all stored sessions
   */
  private static getAllSessions(): SavedSession[] {
    try {
      if (typeof window === "undefined") return []

      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []

      const sessions = JSON.parse(stored) as SavedSession[]
      return Array.isArray(sessions) ? sessions : []
    } catch (error) {
      console.error("[SessionRecovery] Failed to parse sessions:", error)
      return []
    }
  }

  /**
   * Migrate old session format to new
   */
  private static migrateSession(session: SavedSession): SavedSession | null {
    try {
      // Version 1 -> 2 migration
      if (session.version === 1) {
        return {
          ...session,
          version: SESSION_VERSION,
          context: {
            ...session.context,
            qualifyingAnswers: session.context.qualifyingAnswers || {},
            inventoryItems: session.context.inventoryItems || [],
          },
        }
      }

      // Unknown version, discard
      return null
    } catch (error) {
      console.error("[SessionRecovery] Migration failed:", error)
      return null
    }
  }

  /**
   * Check if there's a recoverable session
   */
  static hasRecoverableSession(): boolean {
    const session = this.getMostRecentSession()
    return session !== null
  }

  /**
   * Get session age in human-readable format
   */
  static getSessionAge(session: SavedSession): string {
    const ageMs = Date.now() - session.lastUpdated
    const ageMinutes = Math.floor(ageMs / 60000)
    const ageHours = Math.floor(ageMs / 3600000)
    const ageDays = Math.floor(ageMs / 86400000)

    if (ageDays > 0) {
      return `${ageDays} day${ageDays > 1 ? "s" : ""} ago`
    }
    if (ageHours > 0) {
      return `${ageHours} hour${ageHours > 1 ? "s" : ""} ago`
    }
    if (ageMinutes > 0) {
      return `${ageMinutes} minute${ageMinutes > 1 ? "s" : ""} ago`
    }
    return "just now"
  }

  /**
   * Generate recovery prompt based on session state
   */
  static generateRecoveryPrompt(session: SavedSession): string {
    const { context } = session
    const age = this.getSessionAge(session)

    let prompt = `Welcome back! I noticed you started a quote ${age}. `

    switch (context.stage) {
      case "business_lookup":
      case "business_confirm":
        prompt += "We were confirming your business details. Would you like to continue?"
        break
      case "service_select":
        prompt += "We were selecting your move type. Ready to continue?"
        break
      case "qualifying_questions":
        prompt += `We were gathering details about your ${context.serviceType || "move"}. Shall we pick up where we left off?`
        break
      case "location_origin":
      case "location_destination":
        prompt += "We were confirming your move locations. Would you like to continue?"
        break
      case "quote_generated":
        if (context.quoteAmount) {
          prompt += `Your quote of $${context.quoteAmount.toLocaleString()} is still available. Ready to proceed?`
        } else {
          prompt += "We were preparing your quote. Would you like to continue?"
        }
        break
      case "date_select":
        prompt += "We were selecting your moving date. Ready to book?"
        break
      case "contact_collect":
        prompt += "We were collecting your contact details. Almost there! Would you like to finish?"
        break
      case "payment":
        if (context.quoteAmount) {
          prompt += `Your booking is ready for payment. The deposit is $${Math.round(context.quoteAmount * 0.5).toLocaleString()}. Ready to complete?`
        }
        break
      default:
        prompt += "Would you like to continue where you left off?"
    }

    return prompt
  }
}
