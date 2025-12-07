/**
 * ABOUTME: Processing configuration constants for bulk operations
 * ABOUTME: Simplified - global semaphore handles all rate limiting
 */

/**
 * @deprecated No longer needed - global semaphore handles rate limiting
 * All rows process in parallel, semaphore limits total concurrent Gemini calls
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function calculateOptimalWorkers(_rowCount: number): number {
  // This function is kept for backwards compatibility but no longer used
  // The global semaphore in gemini-rate-limiter.ts handles all rate limiting
  return Infinity
}

/**
 * @deprecated No longer needed - per-row inserts replaced batch inserts
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function calculateOptimalBatchInsertSize(_rowCount: number): number {
  return 1 // Per-row inserts now
}

/**
 * @deprecated Use global semaphore instead
 */
export const PARALLEL_CONCURRENCY = 250

/**
 * Maximum retry attempts per row
 */
export const MAX_RETRY_ATTEMPTS = 3

/**
 * Retry backoff timing (in seconds)
 */
export const RETRY_BACKOFF = {
  initial: 4,
  multiplier: 2,
  max: 16,
} as const
