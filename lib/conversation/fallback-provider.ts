/**
 * Fallback Provider
 * Provides fallback responses when all retries fail
 */

export type FallbackStrategy =
  | 'cached'
  | 'simplified'
  | 'humanEscalation'
  | 'offline'
  | 'generic'

export interface FallbackContext {
  conversationId: string
  lastUserMessage: string
  conversationStep: string
  errorType: string
  retryCount: number
}

export interface FallbackResponse {
  strategy: FallbackStrategy
  message: string
  actions: Array<{
    label: string
    action: string
    phone?: string
  }>
}

export class FallbackProvider {
  /**
   * Get fallback response based on context
   */
  static getFallback(context: FallbackContext): FallbackResponse {
    // If network error and multiple retries failed, offer offline mode
    if (context.errorType === 'network' && context.retryCount >= 3) {
      return this.getOfflineFallback(context)
    }

    // If API error, try cached response
    if (context.errorType === 'api') {
      return this.getCachedFallback(context)
    }

    // If model error, offer simplified response
    if (context.errorType === 'model') {
      return this.getSimplifiedFallback(context)
    }

    // If all else fails, escalate to human
    if (context.retryCount >= 3) {
      return this.getHumanEscalationFallback(context)
    }

    // Generic fallback
    return this.getGenericFallback(context)
  }

  /**
   * Get cached response fallback
   */
  private static getCachedFallback(context: FallbackContext): FallbackResponse {
    const stepMessages: Record<string, string> = {
      business: "I'm having connection issues, but I can help you with your business move. Let me try connecting again...",
      service: "I'm experiencing technical difficulties. Based on your last message, I'm here to help with your move. Would you like to continue?",
      details: "I'm having trouble connecting right now. Your information is saved. Let me try again...",
      quote: "I'm experiencing a connection issue. Your quote details are saved. Let me reconnect...",
      date: "I'm having trouble right now, but I can help you select a date. Let me try again...",
      contact: "I'm experiencing technical difficulties. Your contact information is saved. Let me reconnect...",
      payment: "I'm having connection issues. Your booking details are safe. Let me try reconnecting...",
    }

    const message = stepMessages[context.conversationStep] || stepMessages.details

    return {
      strategy: 'cached',
      message,
      actions: [
        {
          label: 'Try Again',
          action: 'retry',
        },
        {
          label: 'Call Us',
          action: 'phone',
          phone: '0388201801',
        },
      ],
    }
  }

  /**
   * Get simplified response fallback
   */
  private static getSimplifiedFallback(context: FallbackContext): FallbackResponse {
    return {
      strategy: 'simplified',
      message: "I'm experiencing some technical difficulties with the AI service. Let me try a simpler approach, or would you prefer to speak with someone directly?",
      actions: [
        {
          label: 'Try Again',
          action: 'retry',
        },
        {
          label: 'Call Us',
          action: 'phone',
          phone: '0388201801',
        },
        {
          label: 'Email Us',
          action: 'email',
        },
      ],
    }
  }

  /**
   * Get human escalation fallback
   */
  private static getHumanEscalationFallback(context: FallbackContext): FallbackResponse {
    return {
      strategy: 'humanEscalation',
      message: "I'm experiencing persistent technical difficulties. I want to make sure you get the help you need. Would you like me to have someone from our team call you right away?",
      actions: [
        {
          label: 'Yes, Call Me',
          action: 'callback',
          phone: '0388201801',
        },
        {
          label: 'Call Now',
          action: 'phone',
          phone: '0388201801',
        },
        {
          label: 'Try Again',
          action: 'retry',
        },
      ],
    }
  }

  /**
   * Get offline mode fallback
   */
  private static getOfflineFallback(context: FallbackContext): FallbackResponse {
    return {
      strategy: 'offline',
      message: "It looks like you're offline or having connection issues. Don't worry - I've saved your conversation. When your connection is restored, I'll automatically continue where we left off.",
      actions: [
        {
          label: 'Check Connection',
          action: 'retry',
        },
        {
          label: 'Call Us',
          action: 'phone',
          phone: '0388201801',
        },
      ],
    }
  }

  /**
   * Get generic fallback
   */
  private static getGenericFallback(context: FallbackContext): FallbackResponse {
    return {
      strategy: 'generic',
      message: "I'm having trouble connecting right now. Let me try again, or you can call us directly to continue your quote.",
      actions: [
        {
          label: 'Try Again',
          action: 'retry',
        },
        {
          label: 'Call Us',
          action: 'phone',
          phone: '0388201801',
        },
      ],
    }
  }

  /**
   * Get context-aware acknowledgment for option selections
   */
  static getSelectionAcknowledgment(selectionType: string, selectionName: string): string {
    const acknowledgments: Record<string, string> = {
      business: `Great! I've noted ${selectionName}.`,
      service: `Perfect! ${selectionName} is one of our specialties.`,
      date: `Excellent! ${selectionName} works well for us.`,
    }

    return (
      acknowledgments[selectionType] ||
      `Thanks! I've selected ${selectionName}.`
    )
  }
}
