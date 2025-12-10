/**
 * Error Handling Test Suite
 * Tests for error classification, retry logic, and fallbacks
 */

import { describe, it, expect, vi } from "vitest"
import { ErrorClassifier } from "@/lib/conversation/error-classifier"
import { RetryHandler } from "@/lib/conversation/retry-handler"
import { FallbackProvider } from "@/lib/conversation/fallback-provider"

describe("ErrorClassifier", () => {
  it("should classify network errors", () => {
    const error = new Error("Network connection failed")
    const result = ErrorClassifier.classify(error)
    expect(result.type).toBe("network")
    expect(result.retryable).toBe(true)
  })

  it("should classify timeout errors", () => {
    const error = new Error("Request timed out")
    const result = ErrorClassifier.classify(error)
    expect(result.type).toBe("timeout")
    expect(result.retryable).toBe(true)
  })

  it("should classify API errors with status", () => {
    const error = new Error("API Error")
    ;(error as any).status = 500
    const result = ErrorClassifier.classify(error)
    expect(result.type).toBe("api")
    expect(result.retryable).toBe(true)
  })

  it("should classify rate limit errors", () => {
    const error = new Error("Rate limit exceeded")
    ;(error as any).status = 429
    const result = ErrorClassifier.classify(error)
    expect(result.type).toBe("rateLimit")
    expect(result.retryable).toBe(true)
    expect(result.retryConfig?.initialDelay).toBeGreaterThan(1000)
  })

  it("should classify stream errors", () => {
    const error = new Error("Stream aborted")
    const result = ErrorClassifier.classify(error)
    expect(result.type).toBe("stream")
    expect(result.retryable).toBe(true)
  })

  it("should classify model errors", () => {
    const error = new Error("OpenAI token limit exceeded")
    const result = ErrorClassifier.classify(error)
    expect(result.type).toBe("model")
  })

  it("should handle unknown errors", () => {
    const error = new Error("Something weird happened")
    const result = ErrorClassifier.classify(error)
    expect(result.type).toBe("unknown")
    expect(result.retryable).toBe(false)
  })
})

describe("RetryHandler", () => {
  it("should execute operation successfully on first try", async () => {
    const operation = vi.fn().mockResolvedValue("success")

    const result = await RetryHandler.executeWithRetry(operation, {
      maxAttempts: 3,
      backoffStrategy: "exponential",
      initialDelay: 100,
      maxDelay: 1000,
    })

    expect(result).toBe("success")
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it("should retry on failure", async () => {
    const operation = vi.fn().mockRejectedValueOnce(new Error("fail")).mockResolvedValue("success")

    const result = await RetryHandler.executeWithRetry(operation, {
      maxAttempts: 3,
      backoffStrategy: "fixed",
      initialDelay: 10,
      maxDelay: 100,
    })

    expect(result).toBe("success")
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it("should throw after max attempts", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("always fails"))

    await expect(
      RetryHandler.executeWithRetry(operation, {
        maxAttempts: 3,
        backoffStrategy: "fixed",
        initialDelay: 10,
        maxDelay: 100,
      }),
    ).rejects.toThrow("always fails")

    expect(operation).toHaveBeenCalledTimes(3)
  })

  it("should call onRetry callback", async () => {
    const operation = vi.fn().mockRejectedValueOnce(new Error("fail")).mockResolvedValue("success")
    const onRetry = vi.fn()

    await RetryHandler.executeWithRetry(operation, {
      maxAttempts: 3,
      backoffStrategy: "fixed",
      initialDelay: 10,
      maxDelay: 100,
      onRetry,
    })

    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error))
  })

  it("should respect shouldRetry predicate", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("permanent failure"))
    const shouldRetry = vi.fn().mockReturnValue(false)

    await expect(
      RetryHandler.executeWithRetry(operation, {
        maxAttempts: 3,
        backoffStrategy: "fixed",
        initialDelay: 10,
        maxDelay: 100,
        shouldRetry,
      }),
    ).rejects.toThrow()

    expect(operation).toHaveBeenCalledTimes(1)
  })
})

describe("FallbackProvider", () => {
  it("should provide offline fallback for network errors", () => {
    const fallback = FallbackProvider.getFallback({
      conversationId: "test",
      lastUserMessage: "test",
      conversationStep: "business",
      errorType: "network",
      retryCount: 3,
    })

    expect(fallback.strategy).toBe("offline")
    expect(fallback.message).toContain("offline")
    expect(fallback.actions.some((a) => a.action === "retry")).toBe(true)
  })

  it("should provide cached fallback for API errors", () => {
    const fallback = FallbackProvider.getFallback({
      conversationId: "test",
      lastUserMessage: "test",
      conversationStep: "service",
      errorType: "api",
      retryCount: 1,
    })

    expect(fallback.strategy).toBe("cached")
  })

  it("should provide simplified fallback for model errors", () => {
    const fallback = FallbackProvider.getFallback({
      conversationId: "test",
      lastUserMessage: "test",
      conversationStep: "details",
      errorType: "model",
      retryCount: 1,
    })

    expect(fallback.strategy).toBe("simplified")
  })

  it("should escalate after many retries", () => {
    const fallback = FallbackProvider.getFallback({
      conversationId: "test",
      lastUserMessage: "test",
      conversationStep: "quote",
      errorType: "unknown",
      retryCount: 5,
    })

    expect(fallback.strategy).toBe("humanEscalation")
    expect(fallback.actions.some((a) => a.action === "callback")).toBe(true)
  })

  it("should provide step-specific messages", () => {
    const steps = ["business", "service", "details", "quote", "date", "contact", "payment"]

    steps.forEach((step) => {
      const fallback = FallbackProvider.getFallback({
        conversationId: "test",
        lastUserMessage: "test",
        conversationStep: step,
        errorType: "api",
        retryCount: 1,
      })

      expect(fallback.message).toBeTruthy()
      expect(fallback.message.length).toBeGreaterThan(10)
    })
  })

  it("should generate selection acknowledgments", () => {
    const ack = FallbackProvider.getSelectionAcknowledgment("service", "Office Relocation")
    expect(ack).toContain("Office Relocation")
  })
})
