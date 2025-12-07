/**
 * Rate limiting configuration and middleware
 * Uses DATABASE as single source of truth (not in-memory)
 * 
 * Previous version used in-memory Map which got out of sync.
 * Now queries batch_queue and batches tables directly.
 */

import { supabaseAdmin } from '@/lib/supabase'
import { logDebug, logError } from '@/lib/utils/logger'

export const RATE_LIMITS = {
  // Batch processing limits
  maxRowsPerBatch: 1000, // 1000 rows processes quickly (seconds) - perfect for fast iteration
  maxBatchesPerUser: Infinity, // No daily batch limit
  maxConcurrentBatches: process.env.NODE_ENV === 'development' ? 50 : 10, // 50 in dev for testing, 10 in production

  // API rate limits
  requestsPerMinute: 60,
  requestsPerHour: 500,

  // File upload limits
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxUploadsPerHour: 20,
} as const

export interface UserLimits {
  userId: string
  currentBatches: number
  totalBatchesToday: number
  lastRequestTime: number
  requestsThisMinute: number
  requestsThisHour: number
}

/**
 * Get current batch counts from database (single source of truth)
 */
async function getUserBatchCounts(userId: string): Promise<{
  currentBatches: number
  totalBatchesToday: number
}> {
  try {
    // Get count of RECENT batches in processing state (exclude stuck batches older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { count: processingCount } = await supabaseAdmin
      .from('batches')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['pending', 'processing'])
      .gte('created_at', oneHourAgo) // Only count batches from last hour

    // Get count of batches created today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    
    const { count: todayCount } = await supabaseAdmin
      .from('batches')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', todayStart.toISOString())

    return {
      currentBatches: processingCount || 0,
      totalBatchesToday: todayCount || 0,
    }
  } catch (error) {
    logError('[RATE_LIMITS] Error fetching user batch counts', error, { userId })
    // Fail open - allow if we can't check
    return {
      currentBatches: 0,
      totalBatchesToday: 0,
    }
  }
}

/**
 * Check rate limits using database as source of truth
 */
export async function checkRateLimits(userId: string, rowCount: number): Promise<{
  allowed: boolean
  reason?: string
  limit?: number
  current?: number
}> {
  // Check row count limit (no DB query needed)
  if (rowCount > RATE_LIMITS.maxRowsPerBatch) {
    return {
      allowed: false,
      reason: `Beta limit: Maximum ${RATE_LIMITS.maxRowsPerBatch} rows per batch`,
      limit: RATE_LIMITS.maxRowsPerBatch,
      current: rowCount,
    }
  }

  // Get actual counts from database
  const { currentBatches, totalBatchesToday } = await getUserBatchCounts(userId)

  logDebug('[RATE_LIMITS] Checking limits', {
    userId,
    rowCount,
    currentBatches,
    totalBatchesToday,
    maxConcurrent: RATE_LIMITS.maxConcurrentBatches,
    maxDaily: RATE_LIMITS.maxBatchesPerUser,
  })

  // Check concurrent batches
  if (currentBatches >= RATE_LIMITS.maxConcurrentBatches) {
    return {
      allowed: false,
      reason: 'Please wait for your current batch to complete',
      limit: RATE_LIMITS.maxConcurrentBatches,
      current: currentBatches,
    }
  }

  // Check daily batch limit
  if (totalBatchesToday >= RATE_LIMITS.maxBatchesPerUser) {
    return {
      allowed: false,
      reason: `Beta limit: Maximum ${RATE_LIMITS.maxBatchesPerUser} batches per day`,
      limit: RATE_LIMITS.maxBatchesPerUser,
      current: totalBatchesToday,
    }
  }

  return { allowed: true }
}

/**
 * Synchronous version for backward compatibility
 * Just checks row count - async checks should use checkRateLimits
 * @deprecated Use async checkRateLimits instead
 */
export function checkRateLimitsSync(_userId: string, rowCount: number): {
  allowed: boolean
  reason?: string
  limit?: number
  current?: number
} {
  // Only check row count synchronously - other checks need DB
  if (rowCount > RATE_LIMITS.maxRowsPerBatch) {
    return {
      allowed: false,
      reason: `Beta limit: Maximum ${RATE_LIMITS.maxRowsPerBatch} rows per batch`,
      limit: RATE_LIMITS.maxRowsPerBatch,
      current: rowCount,
    }
  }
  
  // For other checks, we can't do them synchronously
  // The caller should use async checkRateLimits
  return { allowed: true }
}

/**
 * Release batch - now a no-op since we use database as source of truth
 * The batch status is already updated in the database when processing completes
 * @deprecated This function is no longer needed - batch counts come from DB status
 */
export function releaseBatch(userId: string): void {
  // No-op - database is the source of truth
  // When batch completes, its status changes from 'processing' to 'completed'
  // The getUserBatchCounts query only counts 'pending'/'processing' batches
  logDebug('[RATE_LIMITS] releaseBatch called (no-op, using DB source of truth)', { userId })
}

/**
 * Reset daily limits - now a no-op since we use database as source of truth
 * Daily counts are calculated from created_at timestamps
 * @deprecated This function is no longer needed - daily counts come from DB query
 */
export function resetDailyLimits(): void {
  // No-op - database is the source of truth
  // Daily batch counts are calculated from batches.created_at >= today
  logDebug('[RATE_LIMITS] resetDailyLimits called (no-op, using DB source of truth)')
}

// Beta message to show users
export function getBetaLimitMessage(): string {
  return `
🚧 **Beta Limitations**
• Max ${RATE_LIMITS.maxRowsPerBatch.toLocaleString()} rows per batch
• Max ${RATE_LIMITS.maxConcurrentBatches} concurrent batch

Need more? [Join the waitlist for unlimited access →](https://forms.gle/xxx)
  `.trim()
}
