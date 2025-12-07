/**
 * ABOUTME: Global rate limiter for Gemini API calls
 * ABOUTME: Uses semaphore pattern to limit concurrent requests across all batches
 * 
 * This is the ONLY rate limiting mechanism needed for Gemini calls.
 * No queue required - all batches process simultaneously, semaphore handles flow control.
 * 
 * Gemini Tier 3 quota: 20,000 RPM (333 req/sec)
 * We use 250 concurrent as safe default (~75% of burst capacity)
 */

import { logDebug } from '@/lib/utils/logger'

class Semaphore {
  private permits: number
  private readonly maxPermits: number
  private queue: Array<{ resolve: () => void; batchId?: string }> = []

  constructor(permits: number) {
    this.permits = permits
    this.maxPermits = permits
  }

  async acquire(batchId?: string): Promise<void> {
    if (this.permits > 0) {
      this.permits--
      return
    }
    // No permits available, wait in queue
    return new Promise(resolve => {
      this.queue.push({ resolve, batchId })
    })
  }

  release(): void {
    const next = this.queue.shift()
    if (next) {
      // Give permit to next waiting request
      next.resolve()
    } else {
      // No one waiting, return permit to pool
      this.permits++
    }
  }

  /**
   * Get current status for debugging/monitoring
   */
  getStatus(): { available: number; waiting: number; max: number } {
    return {
      available: this.permits,
      waiting: this.queue.length,
      max: this.maxPermits,
    }
  }
}

/**
 * Global semaphore for Gemini API calls
 * 
 * 250 concurrent calls is safe for Gemini Tier 3 (333 req/sec capacity)
 * This allows ~250 rows to be processed in parallel across ALL batches
 * 
 * Example scenarios:
 * - 1 batch of 112 rows: All 112 process in ~3 seconds
 * - 5 batches of 100 rows each: 250 concurrent, rest queue, all done in ~6 seconds
 * - 10 batches of 100 rows each: 250 concurrent, smooth flow, all done in ~12 seconds
 */
const MAX_CONCURRENT_GEMINI_CALLS = 250

export const geminiRateLimiter = new Semaphore(MAX_CONCURRENT_GEMINI_CALLS)

/**
 * Helper to wrap a Gemini call with rate limiting
 * Automatically acquires and releases semaphore
 */
export async function withRateLimit<T>(
  fn: () => Promise<T>,
  batchId?: string
): Promise<T> {
  await geminiRateLimiter.acquire(batchId)
  try {
    return await fn()
  } finally {
    geminiRateLimiter.release()
  }
}

/**
 * Log current rate limiter status (for debugging)
 */
export function logRateLimiterStatus(context: string): void {
  const status = geminiRateLimiter.getStatus()
  logDebug(`[RATE_LIMITER] ${context}`, status)
}

