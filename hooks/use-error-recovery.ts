import { useState, useCallback } from 'react'

interface RetryOptions {
  maxRetries?: number
  retryDelay?: number
  onRetry?: () => void
}

export function useErrorRecovery<T>(
  asyncFn: () => Promise<T>,
  options: RetryOptions = {}
) {
  const { maxRetries = 3, retryDelay = 1000, onRetry } = options
  const [error, setError] = useState<Error | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const executeWithRetry = useCallback(async () => {
    setError(null)
    let attempts = 0

    while (attempts < maxRetries) {
      try {
        const result = await asyncFn()
        setRetryCount(0)
        setIsRetrying(false)
        return result
      } catch (err) {
        attempts++
        setRetryCount(attempts)
        
        if (attempts < maxRetries) {
          setIsRetrying(true)
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempts))
          onRetry?.()
        } else {
          setError(err as Error)
          setIsRetrying(false)
          throw err
        }
      }
    }
  }, [asyncFn, maxRetries, retryDelay, onRetry])

  const retry = useCallback(() => {
    setError(null)
    setRetryCount(0)
    return executeWithRetry()
  }, [executeWithRetry])

  return {
    error,
    isRetrying,
    retryCount,
    retry,
    execute: executeWithRetry
  }
}
