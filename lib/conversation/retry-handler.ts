/**
 * Retry Handler
 * Handles automatic retries with configurable backoff strategies
 */

import type { RetryConfig } from './error-classifier'

export interface RetryOptions {
  maxAttempts: number
  backoffStrategy: 'exponential' | 'linear' | 'fixed'
  initialDelay: number
  maxDelay: number
  onRetry?: (attempt: number, error: unknown) => void
  shouldRetry?: (error: unknown, attempt: number) => boolean
}

export class RetryHandler {
  /**
   * Execute an operation with automatic retry
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions
  ): Promise<T> {
    let lastError: unknown
    let attempt = 0

    while (attempt < options.maxAttempts) {
      try {
        const result = await operation()
        return result
      } catch (error) {
        lastError = error
        attempt++

        // Check if we should retry
        if (options.shouldRetry && !options.shouldRetry(error, attempt)) {
          throw error
        }

        // If this was the last attempt, throw the error
        if (attempt >= options.maxAttempts) {
          break
        }

        // Calculate delay
        const delay = this.calculateDelay(attempt, options)

        // Call retry callback
        if (options.onRetry) {
          options.onRetry(attempt, error)
        }

        // Wait before retrying
        await this.sleep(delay)
      }
    }

    throw lastError
  }

  /**
   * Calculate delay based on backoff strategy
   */
  private static calculateDelay(attempt: number, options: RetryOptions): number {
    const { backoffStrategy, initialDelay, maxDelay } = options

    let delay: number

    switch (backoffStrategy) {
      case 'exponential':
        delay = initialDelay * Math.pow(2, attempt - 1)
        break
      case 'linear':
        delay = initialDelay * attempt
        break
      case 'fixed':
      default:
        delay = initialDelay
        break
    }

    // Cap at max delay
    return Math.min(delay, maxDelay)
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Create a retry handler with default config
   */
  static create(config: Partial<RetryOptions> = {}): RetryHandler {
    return new RetryHandler(config)
  }

  private config: RetryOptions

  constructor(config: Partial<RetryOptions> = {}) {
    this.config = {
      maxAttempts: 3,
      backoffStrategy: 'exponential',
      initialDelay: 1000,
      maxDelay: 8000,
      ...config,
    }
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    return RetryHandler.executeWithRetry(operation, this.config)
  }
}
