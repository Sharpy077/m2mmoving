/**
 * Conversation Management Utilities
 * Centralized exports for conversation error handling and state management
 */

export * from "./error-classifier"
export * from "./retry-handler"
export * from "./response-monitor"
export * from "./state-manager"
export * from "./fallback-provider"
export * from "./state-machine"
export * from "./guardrails"
export * from "./message-queue"
export * from "./human-escalation"
export * from "./session-recovery"
export * from "./analytics"

export type { ConversationContext, ConversationStage } from "./state-machine"
export type { GuardrailCheck, GuardrailViolation, ConversationHealth } from "./guardrails"
export type { EscalationRequest, EscalationResult } from "./human-escalation"
export type { SavedSession, SerializedMessage } from "./session-recovery"
export type { ConversationMetrics, ConversionFunnel, HealthMetrics } from "./analytics"
