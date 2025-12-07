import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { validatePrompt } from '@/lib/validation'
import { checkRateLimits, releaseBatch } from '@/middleware/rateLimits'
import { logError, logDebug } from '@/lib/utils/logger'
import { authenticateRequest } from '@/lib/auth-middleware'
import { checkUsageLimits } from '@/lib/api-keys'
// Dev mode removed - all processing via Modal for consistency
import { isFeatureEnabled } from '@/lib/feature-flags'
// Queue service no longer needed - Modal polls batches table directly

export const maxDuration = 300 // Max 5 minutes (Vercel Pro) - can process batches directly!

// INPUT VALIDATION HELPERS
/**
 * Validate batch rows structure
 */
function validateBatchRows(rows: unknown[]): void {
  const MAX_ROWS = 10000
  if (rows.length > MAX_ROWS) {
    throw new Error(`Maximum ${MAX_ROWS} rows allowed per batch`)
  }

  rows.forEach((row, index) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error(`Row ${index} must be an object`)
    }

    const keys = Object.keys(row as object)
    if (keys.length === 0) {
      throw new Error(`Row ${index} cannot be empty`)
    }

    // Check all values are strings or primitives
    keys.forEach((key) => {
      const value = (row as Record<string, unknown>)[key]
      if (value !== null && value !== undefined && typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
        throw new Error(`Row ${index} field "${key}" must be a string, number, or boolean`)
      }
    })
  })
}

/**
 * Validate output columns configuration
 * Accepts both string[] and {name: string, description?: string}[] formats
 */
function validateOutputColumns(cols: unknown[]): void {
  const MAX_COLS = 50
  if (cols.length > MAX_COLS) {
    throw new Error(`Maximum ${MAX_COLS} output columns allowed`)
  }

  cols.forEach((col, index) => {
    // Handle both string and object formats
    let colName: string
    if (typeof col === 'string') {
      colName = col
    } else if (col && typeof col === 'object' && 'name' in col && typeof (col as { name: unknown }).name === 'string') {
      colName = (col as { name: string }).name
    } else {
      throw new Error(`Column ${index} must be a string or object with 'name' property`)
    }
    
    if (colName.length === 0) {
      throw new Error(`Column ${index} name cannot be empty`)
    }
    if (colName.length > 255) {
      throw new Error(`Column ${index} name cannot exceed 255 characters`)
    }
    // Check for invalid characters
    if (!/^[a-zA-Z0-9_\s-]+$/.test(colName)) {
      throw new Error(`Column ${index} name contains invalid characters`)
    }
  })
}

/**
 * POST /api/process
 * Create batch and invoke Modal processor asynchronously
 *
 * Request body:
 * {
 *   csvFilename: string,
 *   rows: Array<Record<string, string>>,
 *   prompt: string,
 *   context?: string,
 *   outputColumns?: OutputColumn[],
 *   webhookUrl?: string,
 *   tools?: string[]
 * }
 *
 * Returns:
 * {
 *   batchId: string,
 *   status: 'pending',
 *   totalRows: number,
 *   message: string
 * }
 */
// Add CORS headers to response
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest): Promise<Response> {
  let userId: string | null = null

  try {
    // Authenticate request (supports cookie, Bearer token, or API key)
    userId = await authenticateRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in or provide valid Bearer token/API key' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.csvFilename || typeof body.csvFilename !== 'string') {
      return NextResponse.json(
        { error: 'csvFilename is required and must be a string' },
        { status: 400 }
      )
    }

    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return NextResponse.json(
        { error: 'rows is required and must be a non-empty array' },
        { status: 400 }
      )
    }

    // Validate prompt
    try {
      validatePrompt(body.prompt)
    } catch (e) {
      return NextResponse.json(
        { error: 'prompt is required and cannot be empty' },
        { status: 400 }
      )
    }

    const { csvFilename, rows: originalRows, prompt, context = '', outputColumns = [], tools = [], testMode = false } = body

    // AUTO-TRUNCATE to 1000 rows (beta limit) instead of blocking
    const MAX_ROWS_PER_BATCH = 1000
    const wasTruncated = originalRows.length > MAX_ROWS_PER_BATCH
    const rows = wasTruncated ? originalRows.slice(0, MAX_ROWS_PER_BATCH) : originalRows
    
    if (wasTruncated) {
      logDebug('[PROCESS] Auto-truncated rows to beta limit', {
        original: originalRows.length,
        truncated: rows.length,
        limit: MAX_ROWS_PER_BATCH
      })
    }

    // FEATURE FLAG: Filter out disabled tools (e.g., web-search during demo)
    const enabledTools = isFeatureEnabled('WEB_SEARCH_ENABLED')
      ? tools
      : tools.filter((tool: string) => tool !== 'web-search')

    // Log when users attempt to use disabled features (for analytics)
    if (isFeatureEnabled('LOG_DISABLED_FEATURES') && tools.length > enabledTools.length) {
      const disabledTools = tools.filter((t: string) => !enabledTools.includes(t))
      logDebug('[FEATURE_FLAG] User attempted to use disabled tools', {
        userId,
        disabledTools,
        batchId: 'pending',
        note: 'Web-search disabled for demo/beta - see lib/feature-flags.ts'
      })
    }

    // Validate batch rows structure
    try {
      validateBatchRows(rows)
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Invalid row structure' },
        { status: 400 }
      )
    }

    // Validate output columns if provided
    if (Array.isArray(outputColumns) && outputColumns.length > 0) {
      try {
        validateOutputColumns(outputColumns)
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : 'Invalid output columns' },
          { status: 400 }
        )
      }
    }

    // Check usage limits (database-backed)
    // testMode bypasses batch limit but still checks row limit
    const usageLimitCheck = await checkUsageLimits(userId, rows.length, testMode)
    if (!usageLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: usageLimitCheck.reason,
          batchesToday: usageLimitCheck.batchesToday,
          dailyBatchLimit: usageLimitCheck.dailyBatchLimit,
          rowsToday: usageLimitCheck.rowsToday,
          dailyRowLimit: usageLimitCheck.dailyRowLimit,
          resetTime: usageLimitCheck.resetTime,
          testMode
        },
        { status: 429 }
      )
    }

    // Check rate limits (uses database as source of truth)
    const rateLimitCheck = await checkRateLimits(userId, rows.length)
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: rateLimitCheck.reason,
          limit: rateLimitCheck.limit,
          current: rateLimitCheck.current,
          beta: true
        },
        { status: 429 }
      )
    }

    // ========================================================================
    // QUEUE SYSTEM - Add batch to processing queue
    // ========================================================================
    // Create batch record in Supabase with cryptographically secure ID
    const batchId = `batch_${crypto.randomUUID()}`

    try {
      // Build complete insert payload with all fields in single operation
      // This prevents race condition where Modal poller picks up incomplete batch
      const insertPayload: Record<string, unknown> = {
        id: batchId,
        user_id: userId,
        csv_filename: csvFilename,
        total_rows: rows.length,
        status: 'pending',
        prompt: prompt,
      }

      // Add optional fields to prevent separate update operation
      if (rows && rows.length > 0) {
        insertPayload.data = rows
      }
      if (context) {
        insertPayload.context = context
      }
      if (outputColumns && outputColumns.length > 0) {
        // Handle both string[] and {name, description}[] formats
        insertPayload.output_schema = outputColumns.map((col: string | { name: string; description?: string }) => {
          if (typeof col === 'string') {
            return { name: col }
          }
          return { name: col.name, description: col.description }
        })
      }
      if (enabledTools.length > 0) {
        insertPayload.tools = enabledTools
      }

      const { error } = await supabaseAdmin
        .from('batches')
        .insert(insertPayload)
        .select()

      if (error) {
        // Check if error is due to missing columns
        if (error.code === '42703' || error.message.includes('column') && error.message.includes('does not exist')) {
          logError('Database schema mismatch - missing columns', error, {
            source: 'api/process/POST',
            batchId,
            hint: 'Run migrations: scripts/apply-all-migrations.sql'
          })
          return NextResponse.json(
            {
              error: 'Database schema mismatch. Please run migrations to add required columns.',
              details: 'Missing columns: tools, selected_input_columns, data, context, output_schema'
            },
            { status: 500 }
          )
        }

        logError('Failed to create batch', error, {
          source: 'api/process/POST',
          batchId,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details
        })
        return NextResponse.json(
          {
            error: 'Failed to create batch in database',
            details: error.message,
            code: error.code
          },
          { status: 500 }
        )
      }
    } catch (dbError) {
      logError('Database error', dbError, {
        source: 'api/process/POST/database',
        batchId
      })
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      )
    }

    // DIRECT MODAL CALL: Trigger Modal processing and wait for confirmation
    const MODAL_API_URL = process.env.MODAL_API_URL || 'https://tech-bulkgpt--bulk-gpt-processor-v4-fastapi-app.modal.run'
    
    // Build output_schema from outputColumns (same logic as insertPayload)
    const outputSchema = outputColumns && outputColumns.length > 0
      ? outputColumns.map((col: string | { name: string; description?: string }) => {
          if (typeof col === 'string') {
            return { name: col }
          }
          return { name: col.name, description: col.description }
        })
      : []
    
    const MAX_RETRIES = 2
    let modalAccepted = false
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logDebug(`[MODAL] Calling Modal /batch (attempt ${attempt}/${MAX_RETRIES})`, { batchId })
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 min timeout for large batches
        
        const modalResponse = await fetch(`${MODAL_API_URL}/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batch_id: batchId,
            rows: rows,
            prompt: prompt,
            context: context || '',
            output_columns: outputSchema,
            tools: enabledTools,
          }),
          signal: controller.signal,
        })
        
        clearTimeout(timeoutId)
        
        if (modalResponse.ok) {
          const modalData = await modalResponse.json()
          logDebug('[MODAL] Batch accepted by Modal', { batchId, modalData })
          
          // Update batch status to "processing" now that Modal confirmed
          await supabaseAdmin
            .from('batches')
            .update({ status: 'processing', updated_at: new Date().toISOString() })
            .eq('id', batchId)
          
          modalAccepted = true
          break
        } else {
          const errorText = await modalResponse.text()
          lastError = new Error(`Modal returned ${modalResponse.status}: ${errorText}`)
          logError(`[MODAL] Attempt ${attempt} failed`, lastError, { batchId })
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        logError(`[MODAL] Attempt ${attempt} error`, lastError, { batchId })
        
        // Don't retry on abort (timeout)
        if (lastError.name === 'AbortError') {
          lastError = new Error('Modal request timed out after 30 seconds')
          break
        }
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }
    
    // If Modal didn't accept, mark batch as failed
    if (!modalAccepted) {
      await supabaseAdmin
        .from('batches')
        .update({ 
          status: 'failed', 
          error_message: lastError?.message || 'Failed to start processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', batchId)
      
      // Release rate limit on failure
      if (userId) {
        releaseBatch(userId)
      }
      
      return NextResponse.json(
        {
          error: 'Failed to start batch processing',
          details: lastError?.message || 'Modal service unavailable',
          batchId,
        },
        { status: 503, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      {
        success: true,
        batchId,
        status: 'processing', // Now "processing" since Modal confirmed
        totalRows: rows.length,
        originalRows: wasTruncated ? originalRows.length : undefined,
        truncated: wasTruncated,
        message: wasTruncated
          ? `Processing first ${MAX_ROWS_PER_BATCH} rows (beta limit). Original file had ${originalRows.length} rows.`
          : 'Batch accepted. Processing started.',
      },
      { status: 202, headers: corsHeaders }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
      logError('Process API error', error, {
        source: 'api/process/POST',
        userId
      })
    // Release rate limit on error
    if (userId) {
      releaseBatch(userId)
    }
    return NextResponse.json(
      {
        error: 'Failed to create batch',
        details: message,
      },
      { status: 500 }
    )
  }
}

/**
 * Handle unsupported methods
 */
export async function GET(): Promise<Response> {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST /api/process to start a batch' },
    { status: 405 }
  )
}






