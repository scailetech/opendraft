/**
 * Rate Limit Service
 *
 * Tracks token usage and enforces API rate limits
 * - 20M tokens per minute per user
 * - 20k requests per minute per user
 * - Prevents rate limit violations
 */

import { supabaseAdmin } from '@/lib/supabase'
import { logError, logDebug } from '@/lib/utils/logger'

interface RateLimitStatus {
  isLimited: boolean
  tokensUsed: number
  tokensLimit: number
  tokensRemaining: number
  requestsMade: number
  requestsLimit: number
  requestsRemaining: number
  percentUsed: number
  resetAt: Date
}

/**
 * Check if user has exceeded rate limits
 */
export async function checkRateLimit(userId: string): Promise<RateLimitStatus> {
  try {
    const now = new Date()
    const minuteWindow = new Date(now.getTime() - (now.getTime() % 60000)) // Start of current minute

    const { data: rateLimit } = await supabaseAdmin
      .from('rate_limits')
      .select('*')
      .eq('user_id', userId)
      .eq('minute_window', minuteWindow.toISOString())
      .single()

    const tokensUsed = rateLimit?.tokens_used || 0
    const requestsMade = rateLimit?.requests_made || 0
    const tokensLimit = rateLimit?.tokens_limit || 20000000 // 20M
    const requestsLimit = rateLimit?.requests_limit || 20000 // 20k

    const isLimited = tokensUsed >= tokensLimit || requestsMade >= requestsLimit

    return {
      isLimited,
      tokensUsed,
      tokensLimit,
      tokensRemaining: Math.max(0, tokensLimit - tokensUsed),
      requestsMade,
      requestsLimit,
      requestsRemaining: Math.max(0, requestsLimit - requestsMade),
      percentUsed: (tokensUsed / tokensLimit) * 100,
      resetAt: new Date(minuteWindow.getTime() + 60000), // Next minute
    }
  } catch (error) {
    logError('Failed to check rate limit', error, { userId })
    // If error checking rate limit, allow request to proceed (fail open)
    return {
      isLimited: false,
      tokensUsed: 0,
      tokensLimit: 20000000,
      tokensRemaining: 20000000,
      requestsMade: 0,
      requestsLimit: 20000,
      requestsRemaining: 20000,
      percentUsed: 0,
      resetAt: new Date(Date.now() + 60000),
    }
  }
}

/**
 * Record token usage for a user
 */
export async function recordTokenUsage(
  userId: string,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  try {
    const now = new Date()
    const minuteWindow = new Date(now.getTime() - (now.getTime() % 60000))

    const totalTokens = inputTokens + outputTokens

    // Upsert rate limit record
    await supabaseAdmin
      .from('rate_limits')
      .upsert(
        {
          user_id: userId,
          minute_window: minuteWindow.toISOString(),
          tokens_used: totalTokens,
          requests_made: 1,
          tokens_limit: 20000000,
          requests_limit: 20000,
          is_limited: false,
          updated_at: now.toISOString(),
        },
        { onConflict: 'user_id,minute_window' }
      )
      .then(async (result) => {
        if (result.error) {
          // If upsert failed, try increment
          await supabaseAdmin
            .from('rate_limits')
            .update({
              tokens_used: totalTokens,
              requests_made: 1,
              updated_at: now.toISOString(),
            })
            .eq('user_id', userId)
            .eq('minute_window', minuteWindow.toISOString())
        }
      })

    logDebug('Token usage recorded', { userId, totalTokens, inputTokens, outputTokens })
  } catch (error) {
    logError('Failed to record token usage', error, { userId, inputTokens, outputTokens })
  }
}

/**
 * Get estimated wait time based on queue position
 */
export async function getEstimatedWaitTime(queuePosition: number): Promise<number> {
  // Estimate: ~2 seconds per row processed in parallel
  // Average batch has ~50 rows
  // So average batch takes ~10-15 seconds
  // Add 5 seconds per queued position before user's batch
  const estimatedSeconds = (queuePosition - 1) * 15

  return estimatedSeconds
}

/**
 * Reset rate limits (for testing or admin purposes)
 */
export async function resetRateLimits(userId: string): Promise<void> {
  try {
    const now = new Date()
    const minuteWindow = new Date(now.getTime() - (now.getTime() % 60000))

    await supabaseAdmin
      .from('rate_limits')
      .delete()
      .eq('user_id', userId)
      .eq('minute_window', minuteWindow.toISOString())

    logDebug('Rate limits reset', { userId })
  } catch (error) {
    logError('Failed to reset rate limits', error, { userId })
  }
}
