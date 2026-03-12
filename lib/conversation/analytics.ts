/**
 * Conversation Analytics
 * Tracks conversation metrics and health for monitoring
 */

export interface ConversationMetrics {
  conversationId: string
  startTime: number
  endTime?: number
  duration?: number
  messageCount: number
  userMessageCount: number
  assistantMessageCount: number
  errorCount: number
  retryCount: number
  stageProgression: string[]
  completionStatus: "in_progress" | "completed" | "abandoned" | "escalated"
  conversionFunnel: ConversionFunnel
}

export interface ConversionFunnel {
  startedConversation: boolean
  businessIdentified: boolean
  serviceSelected: boolean
  quoteGenerated: boolean
  dateSelected: boolean
  contactCollected: boolean
  paymentInitiated: boolean
  paymentCompleted: boolean
}

export interface HealthMetrics {
  avgResponseTime: number
  errorRate: number
  completionRate: number
  abandonmentRate: number
  escalationRate: number
  avgMessagesPerConversation: number
}

/**
 * Conversation Analytics Tracker
 */
export class ConversationAnalytics {
  private metrics: ConversationMetrics
  private responseTimes: number[] = []
  private lastMessageTime = 0

  constructor(conversationId: string) {
    this.metrics = {
      conversationId,
      startTime: Date.now(),
      messageCount: 0,
      userMessageCount: 0,
      assistantMessageCount: 0,
      errorCount: 0,
      retryCount: 0,
      stageProgression: ["greeting"],
      completionStatus: "in_progress",
      conversionFunnel: {
        startedConversation: true,
        businessIdentified: false,
        serviceSelected: false,
        quoteGenerated: false,
        dateSelected: false,
        contactCollected: false,
        paymentInitiated: false,
        paymentCompleted: false,
      },
    }
    this.lastMessageTime = Date.now()
  }

  /**
   * Track user message
   */
  trackUserMessage(): void {
    this.metrics.messageCount++
    this.metrics.userMessageCount++
    this.lastMessageTime = Date.now()
  }

  /**
   * Track assistant response
   */
  trackAssistantResponse(): void {
    this.metrics.messageCount++
    this.metrics.assistantMessageCount++

    // Track response time
    const responseTime = Date.now() - this.lastMessageTime
    this.responseTimes.push(responseTime)
  }

  /**
   * Track stage transition
   */
  trackStageTransition(newStage: string): void {
    if (!this.metrics.stageProgression.includes(newStage)) {
      this.metrics.stageProgression.push(newStage)
    }

    // Update conversion funnel
    this.updateConversionFunnel(newStage)
  }

  /**
   * Update conversion funnel based on stage
   */
  private updateConversionFunnel(stage: string): void {
    switch (stage) {
      case "business_confirm":
        this.metrics.conversionFunnel.businessIdentified = true
        break
      case "service_select":
      case "qualifying_questions":
        this.metrics.conversionFunnel.serviceSelected = true
        break
      case "quote_generated":
        this.metrics.conversionFunnel.quoteGenerated = true
        break
      case "date_select":
        this.metrics.conversionFunnel.dateSelected = true
        break
      case "contact_collect":
        this.metrics.conversionFunnel.contactCollected = true
        break
      case "payment":
        this.metrics.conversionFunnel.paymentInitiated = true
        break
      case "complete":
        this.metrics.conversionFunnel.paymentCompleted = true
        this.metrics.completionStatus = "completed"
        break
      case "human_escalation":
        this.metrics.completionStatus = "escalated"
        break
    }
  }

  /**
   * Track error
   */
  trackError(): void {
    this.metrics.errorCount++
  }

  /**
   * Track retry
   */
  trackRetry(): void {
    this.metrics.retryCount++
  }

  /**
   * Mark conversation as abandoned
   */
  markAbandoned(): void {
    this.metrics.completionStatus = "abandoned"
    this.finalize()
  }

  /**
   * Finalize metrics
   */
  finalize(): void {
    this.metrics.endTime = Date.now()
    this.metrics.duration = this.metrics.endTime - this.metrics.startTime
  }

  /**
   * Get current metrics
   */
  getMetrics(): ConversationMetrics {
    return { ...this.metrics }
  }

  /**
   * Get average response time
   */
  getAvgResponseTime(): number {
    if (this.responseTimes.length === 0) return 0
    return this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
  }

  /**
   * Get conversion percentage
   */
  getConversionPercentage(): number {
    const funnel = this.metrics.conversionFunnel
    const stages = [
      funnel.startedConversation,
      funnel.businessIdentified,
      funnel.serviceSelected,
      funnel.quoteGenerated,
      funnel.dateSelected,
      funnel.contactCollected,
      funnel.paymentInitiated,
      funnel.paymentCompleted,
    ]

    const completed = stages.filter(Boolean).length
    return Math.round((completed / stages.length) * 100)
  }

  /**
   * Export metrics for storage
   */
  toJSON(): ConversationMetrics {
    return this.getMetrics()
  }

  /**
   * Send metrics to analytics endpoint
   */
  async sendMetrics(): Promise<void> {
    try {
      await fetch("/api/analytics/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.getMetrics()),
      })
    } catch (error) {
      console.error("[ConversationAnalytics] Failed to send metrics:", error)
    }
  }
}

/**
 * Aggregate health metrics from multiple conversations
 */
export function aggregateHealthMetrics(conversations: ConversationMetrics[]): HealthMetrics {
  if (conversations.length === 0) {
    return {
      avgResponseTime: 0,
      errorRate: 0,
      completionRate: 0,
      abandonmentRate: 0,
      escalationRate: 0,
      avgMessagesPerConversation: 0,
    }
  }

  const totalErrors = conversations.reduce((sum, c) => sum + c.errorCount, 0)
  const totalMessages = conversations.reduce((sum, c) => sum + c.messageCount, 0)
  const completed = conversations.filter((c) => c.completionStatus === "completed").length
  const abandoned = conversations.filter((c) => c.completionStatus === "abandoned").length
  const escalated = conversations.filter((c) => c.completionStatus === "escalated").length

  return {
    avgResponseTime: 0, // Would need to aggregate from individual trackers
    errorRate: totalMessages > 0 ? totalErrors / totalMessages : 0,
    completionRate: completed / conversations.length,
    abandonmentRate: abandoned / conversations.length,
    escalationRate: escalated / conversations.length,
    avgMessagesPerConversation: totalMessages / conversations.length,
  }
}
