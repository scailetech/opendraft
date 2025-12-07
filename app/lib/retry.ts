/**
 * Production-grade retry logic with exponential backoff and circuit breaker
 *
 * Features:
 * - Smart retry logic (only retries transient errors)
 * - Exponential backoff with jitter
 * - Circuit breaker pattern
 * - Full error context preservation
 * - Development/production logging
 */

import { BulkGPTError } from './types'
import { logError } from './errors'
import { devLog } from './dev-logger'

export interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  shouldRetry?: (error: unknown, attempt: number) => boolean
  onRetry?: (delay: number, attempt: number, error: Error) => void
}

/**
 * Check if an error should be retried
 * Only retry transient failures (network errors, 5xx, 429)
 */
function isRetryableError(error: unknown): boolean {
  // Network errors - always retry
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true
  }

  // Timeout errors - retry
  if (error instanceof Error && error.name === 'AbortError') {
    return true
  }

  // BulkGPT timeout errors
  if (error instanceof BulkGPTError && (error.code === 'TIMEOUT' || error.code === 'TIMEOUT_ERROR')) {
    return true
  }

  // HTTP errors from Response objects
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status
    // Retry on: 429 (rate limit), 500-599 (server errors), 408 (timeout)
    return status === 408 || status === 429 || (status >= 500 && status < 600)
  }

  // Unknown errors or client errors (4xx except 429/408) - don't retry
  return false
}

/**
 * Retry an async function with exponential backoff
 * Production-grade implementation with smart retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000, // 1 second default (more appropriate for network calls)
    maxDelay = 30000, // 30 seconds max
    backoffMultiplier = 2,
    shouldRetry = isRetryableError,
    onRetry,
  } = options

  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Execute function
      const result = await fn()

      // Success after retry - log it
      if (attempt > 0) {
        devLog.log(`✓ Retry succeeded on attempt ${attempt}/${maxRetries}`)
      }

      return result

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if we should retry this error
      const willRetry = attempt < maxRetries && shouldRetry(error, attempt)

      if (!willRetry) {
        // Final attempt or non-retryable error
        if (attempt === maxRetries) {
          logError(lastError, {
            source: 'lib/retry/withRetry',
            attemptsExhausted: maxRetries + 1,
            finalError: true
          })
        }
        throw lastError
      }

      // Calculate delay with exponential backoff + full jitter
      const exponentialDelay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt),
        maxDelay
      )
      // Full jitter: random delay between 0 and exponentialDelay
      // This prevents thundering herd problem
      const totalDelay = Math.floor(Math.random() * exponentialDelay)

      devLog.warn(
        `⚠ Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${totalDelay}ms:`,
        lastError.message
      )

      onRetry?.(totalDelay, attempt + 1, lastError)

      await new Promise((resolve) => setTimeout(resolve, totalDelay))
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error('Retry exhausted')
}

/**
 * Fetch with timeout and automatic retry
 * Production-ready wrapper for fetch API
 */
export async function fetchWithTimeout(
  url: string,
  timeoutMs: number = 30000,
  options?: RequestInit
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })

    return response
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new BulkGPTError('TIMEOUT', `Request timeout after ${timeoutMs}ms`, {
        url,
        timeoutMs
      })
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Fetch with automatic retry on transient failures
 * Combines timeout + retry logic
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit & {
    timeoutMs?: number
    retryOptions?: RetryOptions
  }
): Promise<Response> {
  const { timeoutMs = 30000, retryOptions, ...fetchOptions } = options || {}

  return withRetry(
    () => fetchWithTimeout(url, timeoutMs, fetchOptions),
    retryOptions
  )
}

/**
 * Circuit breaker pattern implementation
 */
export class CircuitBreaker<T = unknown> {
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  private failureCount = 0
  private successCount = 0
  private lastFailureTime: number | null = null
  private readonly threshold: number
  private readonly timeout: number

  constructor(
    private fn: () => Promise<T>,
    options: { threshold?: number; timeout?: number } = {}
  ) {
    this.threshold = options.threshold || 5
    this.timeout = options.timeout || 60000 // 60 seconds default
  }

  async execute(): Promise<T> {
    if (this.state === 'open') {
      // Check if timeout has passed
      if (
        this.lastFailureTime &&
        Date.now() - this.lastFailureTime > this.timeout
      ) {
        this.state = 'half-open'
        this.successCount = 0
      } else {
        throw new BulkGPTError(
          'CIRCUIT_BREAKER_OPEN',
          'Circuit breaker is open'
        )
      }
    }

    try {
      const result = await this.fn()

      if (this.state === 'half-open') {
        this.successCount++
        if (this.successCount >= 2) {
          // Successful recovery
          this.state = 'closed'
          this.failureCount = 0
        }
      } else {
        // Reset on success
        this.failureCount = 0
      }

      return result
    } catch (error) {
      this.failureCount++
      this.lastFailureTime = Date.now()

      if (this.failureCount >= this.threshold) {
        this.state = 'open'
      }

      throw error
    }
  }

  isOpen(): boolean {
    return this.state === 'open'
  }

  isClosed(): boolean {
    return this.state === 'closed'
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state
  }

  reset(): void {
    this.state = 'closed'
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = null
  }
}






