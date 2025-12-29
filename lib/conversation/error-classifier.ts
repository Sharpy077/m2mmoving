/**
 * Error Classifier
 * Classifies errors by type to apply appropriate recovery strategies
 */

export type ErrorType =
  | 'network'
  | 'api'
  | 'rateLimit'
  | 'model'
  | 'stream'
  | 'timeout'
  | 'unknown'

export interface ClassifiedError {
  type: ErrorType
  originalError: Error | unknown
  message: string
  retryable: boolean
  retryConfig?: RetryConfig
}

export interface RetryConfig {
  maxAttempts: number
  backoffStrategy: 'exponential' | 'linear' | 'fixed'
  initialDelay: number
  maxDelay: number
}

const RETRY_CONFIGS: Record<ErrorType, RetryConfig> = {
  network: {
    maxAttempts: 3,
    backoffStrategy: 'exponential',
    initialDelay: 1000,
    maxDelay: 8000,
  },
  api: {
    maxAttempts: 2,
    backoffStrategy: 'exponential',
    initialDelay: 2000,
    maxDelay: 10000,
  },
  rateLimit: {
    maxAttempts: 3,
    backoffStrategy: 'exponential',
    initialDelay: 5000,
    maxDelay: 30000,
  },
  model: {
    maxAttempts: 1,
    backoffStrategy: 'exponential',
    initialDelay: 2000,
    maxDelay: 5000,
  },
  stream: {
    maxAttempts: 2,
    backoffStrategy: 'exponential',
    initialDelay: 1000,
    maxDelay: 5000,
  },
  timeout: {
    maxAttempts: 2,
    backoffStrategy: 'exponential',
    initialDelay: 2000,
    maxDelay: 10000,
  },
  unknown: {
    maxAttempts: 1,
    backoffStrategy: 'fixed',
    initialDelay: 2000,
    maxDelay: 2000,
  },
}

export class ErrorClassifier {
  /**
   * Classify an error and determine recovery strategy
   */
  static classify(error: Error | unknown): ClassifiedError {
    // Network errors
    if (this.isNetworkError(error)) {
      return {
        type: 'network',
        originalError: error,
        message: this.getErrorMessage(error),
        retryable: true,
        retryConfig: RETRY_CONFIGS.network,
      }
    }

    // API errors (HTTP status codes)
    if (this.isApiError(error)) {
      const statusCode = this.getStatusCode(error)
      
      if (statusCode === 429) {
        return {
          type: 'rateLimit',
          originalError: error,
          message: 'Too many requests. Please wait a moment.',
          retryable: true,
          retryConfig: RETRY_CONFIGS.rateLimit,
        }
      }

      if (statusCode >= 500) {
        return {
          type: 'api',
          originalError: error,
          message: 'Server error. Retrying...',
          retryable: true,
          retryConfig: RETRY_CONFIGS.api,
        }
      }

      return {
        type: 'api',
        originalError: error,
        message: this.getErrorMessage(error),
        retryable: false,
      }
    }

    // Timeout errors
    if (this.isTimeoutError(error)) {
      return {
        type: 'timeout',
        originalError: error,
        message: 'Request timed out. Retrying...',
        retryable: true,
        retryConfig: RETRY_CONFIGS.timeout,
      }
    }

    // Stream errors
    if (this.isStreamError(error)) {
      return {
        type: 'stream',
        originalError: error,
        message: 'Stream interrupted. Reconnecting...',
        retryable: true,
        retryConfig: RETRY_CONFIGS.stream,
      }
    }

    // Model/AI errors
    if (this.isModelError(error)) {
      return {
        type: 'model',
        originalError: error,
        message: 'AI service error. Retrying with simplified request...',
        retryable: true,
        retryConfig: RETRY_CONFIGS.model,
      }
    }

    // Unknown error
    return {
      type: 'unknown',
      originalError: error,
      message: this.getErrorMessage(error),
      retryable: false,
    }
  }

  private static isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      return (
        message.includes('network') ||
        message.includes('fetch') ||
        message.includes('connection') ||
        message.includes('dns') ||
        message.includes('econnrefused') ||
        message.includes('enotfound')
      )
    }
    return false
  }

  private static isApiError(error: unknown): boolean {
    if (error instanceof Error && 'status' in error) {
      const status = (error as any).status
      return typeof status === 'number' && status >= 400
    }
    if (error instanceof Response) {
      return error.status >= 400
    }
    return false
  }

  private static getStatusCode(error: unknown): number | null {
    if (error instanceof Error && 'status' in error) {
      return (error as any).status
    }
    if (error instanceof Response) {
      return error.status
    }
    return null
  }

  private static isTimeoutError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      return (
        message.includes('timeout') ||
        message.includes('timed out') ||
        error.name === 'TimeoutError'
      )
    }
    return false
  }

  private static isStreamError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      return (
        message.includes('stream') ||
        message.includes('readable') ||
        message.includes('aborted')
      )
    }
    return false
  }

  private static isModelError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      return (
        message.includes('openai') ||
        message.includes('model') ||
        message.includes('token') ||
        message.includes('rate limit') ||
        message.includes('quota')
      )
    }
    return false
  }

  private static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }
    if (typeof error === 'string') {
      return error
    }
    return 'An unexpected error occurred'
  }
}
