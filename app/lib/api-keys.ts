/**
 * ABOUTME: API key management service for power-user programmatic access
 * ABOUTME: Handles secure key generation, verification, listing, and revocation
 */

import { createHash, randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { logError } from '@/lib/errors'

export interface ApiKey {
  id: string
  name: string
  key?: string // Only returned on creation
  prefix: string
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

export interface UsageStats {
  batchesToday: number
  rowsToday: number
  batchesThisMonth: number
  rowsThisMonth: number
  totalBatches: number
  totalRows: number
  dailyBatchLimit: number
  dailyRowLimit: number
  planType: string
  // Token usage
  totalInputTokens: number
  totalOutputTokens: number
  inputTokensToday: number
  outputTokensToday: number
  inputTokensThisMonth: number
  outputTokensThisMonth: number
  // Model breakdown
  tokensByModel: { model: string; inputTokens: number; outputTokens: number; count: number }[]
  // Tool usage
  toolUsage: { tool: string; callCount: number }[]
}

/**
 * Generate a new API key for a user
 * Format: bgpt_<32_random_chars>
 * Key is hashed with SHA-256 before storage
 */
export async function generateApiKey(userId: string, name: string): Promise<ApiKey> {
  // Generate secure random key
  const randomPart = randomBytes(24).toString('base64url') // URL-safe base64
  const key = `bgpt_${randomPart}`
  const prefix = key.slice(0, 12) // bgpt_<first8>
  const hash = createHash('sha256').update(key).digest('hex')

  const { data, error } = await supabaseAdmin
    .from('user_api_keys')
    .insert({
      user_id: userId,
      name,
      key_hash: hash,
      key_prefix: prefix
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create API key: ${error.message}`)

  return {
    id: data.id,
    name: data.name,
    key, // Only time we return the actual key!
    prefix,
    createdAt: data.created_at,
    lastUsedAt: null,
    revokedAt: null
  }
}

/**
 * Verify an API key and return the associated user ID
 * Updates last_used_at timestamp if valid
 */
export async function verifyApiKey(key: string): Promise<string | null> {
  if (!key || !key.startsWith('bgpt_')) {
    return null
  }

  const hash = createHash('sha256').update(key).digest('hex')

  const { data, error } = await supabaseAdmin
    .from('user_api_keys')
    .select('user_id, revoked_at')
    .eq('key_hash', hash)
    .is('revoked_at', null)
    .single()

  if (error || !data) return null

  // Update last used timestamp asynchronously with error handling
  // Non-blocking update - errors are logged but don't interrupt the request
  void (async () => {
    try {
      await supabaseAdmin
        .from('user_api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('key_hash', hash)
    } catch (updateError) {
      console.error('Failed to update API key last_used_at timestamp:', updateError)
      // Don't re-throw or interrupt request - this is non-critical metadata update
    }
  })()

  return data.user_id
}

/**
 * List all API keys for a user (excludes revoked by default)
 */
export async function listApiKeys(userId: string, includeRevoked = false): Promise<ApiKey[]> {
  let query = supabaseAdmin
    .from('user_api_keys')
    .select('id, name, key_prefix, created_at, last_used_at, revoked_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (!includeRevoked) {
    query = query.is('revoked_at', null)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to list API keys: ${error.message}`)

  return (data || []).map(item => ({
    id: item.id,
    name: item.name,
    prefix: item.key_prefix,
    createdAt: item.created_at,
    lastUsedAt: item.last_used_at,
    revokedAt: item.revoked_at
  }))
}

/**
 * Revoke an API key (soft delete - sets revoked_at timestamp)
 */
export async function revokeApiKey(userId: string, keyId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('user_api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('user_id', userId) // Ensure user owns this key

  if (error) throw new Error(`Failed to revoke API key: ${error.message}`)
}

/**
 * Get usage statistics for a user - calculated from actual batches data
 */
export async function getUserUsage(userId: string): Promise<UsageStats | null> {
  const now = new Date()
  // Use UTC consistently to match database timestamps
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()

  const defaultStats: UsageStats = {
    batchesToday: 0,
    rowsToday: 0,
    batchesThisMonth: 0,
    rowsThisMonth: 0,
    totalBatches: 0,
    totalRows: 0,
    dailyBatchLimit: 999999,
    dailyRowLimit: 999999999,
    planType: 'beta',
    totalInputTokens: 0,
    totalOutputTokens: 0,
    inputTokensToday: 0,
    outputTokensToday: 0,
    inputTokensThisMonth: 0,
    outputTokensThisMonth: 0,
    tokensByModel: [],
    toolUsage: []
  }

  try {
    // Run all COUNT queries in parallel (bypasses row limit)
    const [
      { count: totalBatchCount, error: countError },
      { count: todayBatchCount, error: todayCountError },
      { count: monthBatchCount, error: monthCountError },
    ] = await Promise.all([
      // Total count
      supabaseAdmin
        .from('batches')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      // Today count
      supabaseAdmin
        .from('batches')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', todayStart),
      // This month count
      supabaseAdmin
        .from('batches')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', monthStart),
    ])

    if (countError) {
      logError(countError, { source: 'getUserUsage', note: 'Failed to count total batches' })
    }
    if (todayCountError) {
      logError(todayCountError, { source: 'getUserUsage', note: 'Failed to count today batches' })
    }
    if (monthCountError) {
      logError(monthCountError, { source: 'getUserUsage', note: 'Failed to count month batches' })
    }

    // Fetch recent batches for row/token calculations (limited to 1000 by Supabase)
    const { data: batches, error: batchError } = await supabaseAdmin
      .from('batches')
      .select('id, created_at, processed_rows, total_input_tokens, total_output_tokens')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (batchError) {
      logError(batchError, { source: 'getUserUsage', note: 'Failed to fetch batches' })
      return defaultStats
    }

    if (!batches || batches.length === 0) {
      return defaultStats
    }

    // Use the COUNT results for batch counts (accurate even with >1000 batches)
    const totalBatches = totalBatchCount ?? batches.length
    const batchesToday = todayBatchCount ?? 0
    const batchesThisMonth = monthBatchCount ?? 0

    // Calculate row/token stats from fetched batches
    let rowsToday = 0
    let rowsThisMonth = 0
    let totalRows = 0
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let inputTokensToday = 0
    let outputTokensToday = 0
    let inputTokensThisMonth = 0
    let outputTokensThisMonth = 0

    for (const batch of batches) {
      const rows = batch.processed_rows || 0
      const inputTokens = batch.total_input_tokens || 0
      const outputTokens = batch.total_output_tokens || 0

      // Total stats
      totalRows += rows
      totalInputTokens += inputTokens
      totalOutputTokens += outputTokens

      // Today's stats (batch count from COUNT query, but rows/tokens from data)
      if (batch.created_at >= todayStart) {
        rowsToday += rows
        inputTokensToday += inputTokens
        outputTokensToday += outputTokens
      }

      // This month's stats (batch count from COUNT query, but rows/tokens from data)
      if (batch.created_at >= monthStart) {
        rowsThisMonth += rows
        inputTokensThisMonth += inputTokens
        outputTokensThisMonth += outputTokens
      }
    }

    // Now fetch token breakdown from batch_results table (has model info)
    const modelStats: Record<string, { inputTokens: number; outputTokens: number; count: number }> = {}
    const toolStats: Record<string, number> = {}

    try {
      // Get batch IDs for this user
      const batchIds = batches.map(b => b.id)
      
      // Fetch results with model info - this table has per-row token tracking
      const { data: results } = await supabaseAdmin
        .from('batch_results')
        .select('model, input_tokens, output_tokens, tools_used')
        .in('batch_id', batchIds)
      
      if (results && results.length > 0) {
        for (const result of results) {
          const model = result.model || 'gpt-4o-mini'
          const inputTokens = result.input_tokens || 0
          const outputTokens = result.output_tokens || 0
          
          if (!modelStats[model]) {
            modelStats[model] = { inputTokens: 0, outputTokens: 0, count: 0 }
          }
          modelStats[model].inputTokens += inputTokens
          modelStats[model].outputTokens += outputTokens
          modelStats[model].count++

          // Tool usage from results
          const tools = result.tools_used
          if (tools && typeof tools === 'object') {
            for (const [toolName, count] of Object.entries(tools)) {
              toolStats[toolName] = (toolStats[toolName] || 0) + (typeof count === 'number' ? count : 1)
            }
          }
        }
      }
    } catch (resultErr) {
      // If batch_results query fails, just skip model breakdown
      logError(resultErr instanceof Error ? resultErr : new Error('Failed to fetch batch results'), {
        source: 'getUserUsage',
        note: 'Model breakdown unavailable'
      })
    }

    // Convert model stats to array
    const tokensByModel = Object.entries(modelStats)
      .map(([model, stats]) => ({ model, ...stats }))
      .sort((a, b) => (b.inputTokens + b.outputTokens) - (a.inputTokens + a.outputTokens))

    // Convert tool stats to array
    const toolUsage = Object.entries(toolStats)
      .map(([tool, callCount]) => ({ tool, callCount }))
      .sort((a, b) => b.callCount - a.callCount)

    return {
      batchesToday,
      rowsToday,
      batchesThisMonth,
      rowsThisMonth,
      totalBatches,
      totalRows,
      dailyBatchLimit: 999999,
      dailyRowLimit: 999999999,
      planType: 'beta',
      totalInputTokens,
      totalOutputTokens,
      inputTokensToday,
      outputTokensToday,
      inputTokensThisMonth,
      outputTokensThisMonth,
      tokensByModel,
      toolUsage
    }
  } catch (err) {
    logError(err instanceof Error ? err : new Error('Failed to calculate usage'), {
      source: 'getUserUsage'
    })
    return defaultStats
  }
}

/**
 * Check if user can process a batch (checks usage limits)
 * @param userId - User ID to check limits for
 * @param rowCount - Number of rows in the batch
 * @param testMode - If true, bypasses batch limit check (allows testing even when limit reached)
 * @returns Object with allowed status and detailed reason if not allowed
 */
export async function checkUsageLimits(
  userId: string,
  rowCount: number,
  testMode = false
): Promise<{
  allowed: boolean
  reason?: string
  batchesToday?: number
  dailyBatchLimit?: number
  rowsToday?: number
  dailyRowLimit?: number
  resetTime?: string
}> {
  // In development mode, skip usage limits entirely for testing
  if (process.env.NODE_ENV === 'development') {
    return { allowed: true }
  }

  // Note: check_usage_limits is a RETURNS TABLE function, so it returns an array
  const { data, error } = await supabaseAdmin
    .rpc('check_usage_limits', { p_user_id: userId }) as {
      data: Array<{
        can_process: boolean
        reason: string
        batches_today: number
        rows_today: number
        daily_batch_limit: number
        daily_row_limit: number
      }> | null
      error: unknown
    }

  if (error) {
    logError(error instanceof Error ? error : new Error('Usage limit check failed'), {
      source: 'checkUsageLimits',
      userId
    })
    // Fail open - allow the request but log error
    return { allowed: true }
  }

  // Extract first row from table result
  const result = data?.[0]

  if (!result) {
    return {
      allowed: false,
      reason: 'Unable to verify usage limits'
    }
  }

  // Calculate reset time (midnight UTC tomorrow)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(0, 0, 0, 0)
  const resetTime = tomorrow.toISOString()

  // In test mode, bypass batch limit check but still check row limit
  if (testMode) {
    // Only check row limit for test mode
    const wouldExceedRows = (result.rows_today + rowCount) > result.daily_row_limit
    if (wouldExceedRows) {
      return {
        allowed: false,
        reason: `Test mode: This would exceed your daily row limit. You have ${result.rows_today}/${result.daily_row_limit} rows processed today. Limit resets at ${new Date(resetTime).toLocaleString()}.`,
        batchesToday: result.batches_today,
        dailyBatchLimit: result.daily_batch_limit,
        rowsToday: result.rows_today,
        dailyRowLimit: result.daily_row_limit,
        resetTime
      }
    }
    // Test mode allowed - batch limit bypassed
    return { allowed: true }
  }

  // Full batch mode - check both batch and row limits
  if (!result.can_process) {
    // Determine which limit was hit
    const isBatchLimit = result.batches_today >= result.daily_batch_limit
    const isRowLimit = result.rows_today >= result.daily_row_limit

    let reason = result.reason || 'Daily limit reached'
    
    // Enhance error message with reset time and suggestions
    if (isBatchLimit) {
      reason = `Daily batch limit reached. You've processed ${result.batches_today}/${result.daily_batch_limit} batches today. Limit resets at ${new Date(resetTime).toLocaleString()}. Tip: Use "Test" mode (⌘T) to test your prompt without using a batch.`
    } else if (isRowLimit) {
      reason = `Daily row limit reached. You've processed ${result.rows_today}/${result.daily_row_limit} rows today. Limit resets at ${new Date(resetTime).toLocaleString()}.`
    }

    return {
      allowed: false,
      reason,
      batchesToday: result.batches_today,
      dailyBatchLimit: result.daily_batch_limit,
      rowsToday: result.rows_today,
      dailyRowLimit: result.daily_row_limit,
      resetTime
    }
  }

  // Also check if this specific batch would exceed daily row limit
  const wouldExceedRows = (result.rows_today + rowCount) > result.daily_row_limit
  if (wouldExceedRows) {
    return {
      allowed: false,
      reason: `This batch would exceed your daily row limit. You have ${result.rows_today}/${result.daily_row_limit} rows processed today, and this batch has ${rowCount} rows. Limit resets at ${new Date(resetTime).toLocaleString()}.`,
      batchesToday: result.batches_today,
      dailyBatchLimit: result.daily_batch_limit,
      rowsToday: result.rows_today,
      dailyRowLimit: result.daily_row_limit,
      resetTime
    }
  }

  return { allowed: true }
}

// Note: Plan-based limits removed - all plans now have unlimited batches and rows
// Re-add getPlanLimits function here if plan-based limits are needed in the future
