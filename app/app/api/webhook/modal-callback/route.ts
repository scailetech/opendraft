import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logError, logDebug, logWarning } from '@/lib/utils/logger'
import { devLog } from '@/lib/dev-logger'
import { createResourcesFromBatch } from '@/lib/utils/batch-to-resources'

export const maxDuration = 300 // 5 minutes to process webhook

/**
 * POST /api/webhook/modal-callback
 *
 * Webhook endpoint for Modal to call when batch processing completes.
 *
 * Modal calls this endpoint with results when done processing.
 * We store the results in the database and update batch status.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const startTime = Date.now()

  try {
// SECURITY: Webhook secret validation is REQUIRED in production
    // Modal backend must send x-webhook-secret header matching MODAL_WEBHOOK_SECRET env var
    const webhookSecret = process.env.MODAL_WEBHOOK_SECRET
    const isProduction = process.env.NODE_ENV === 'production'
    
    if (!webhookSecret && isProduction) {
      logError('[WEBHOOK] CRITICAL: MODAL_WEBHOOK_SECRET not configured in production!')
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500 }
      )
    }


    if (webhookSecret) {
      const providedSecret = request.headers.get('x-webhook-secret')
      if (!providedSecret || providedSecret !== webhookSecret) {
        logWarning('[WEBHOOK] Invalid or missing webhook secret', { 
          hasSecret: !!providedSecret,
          // Don't log actual secrets!
        })
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
      logDebug('[WEBHOOK] Webhook secret validated')
    } else {
      // Only allow skipping in development
      logWarning('[WEBHOOK] Webhook secret validation skipped (dev mode only)')
    }

    logDebug('\n[WEBHOOK] ========== Modal Callback Received ==========')
    logDebug(`[WEBHOOK] Timestamp: ${new Date().toISOString()}`)

    // Parse webhook payload
    const payload = await request.json()
    logDebug('[WEBHOOK] Payload keys:', Object.keys(payload))

    const { batch_id, results, status, total_rows, successful, failed } = payload

    if (!batch_id) {
      logError('[WEBHOOK] Missing batch_id in payload')
      return NextResponse.json(
        { error: 'Missing batch_id' },
        { status: 400 }
      )
    }

    logDebug(`[WEBHOOK] Batch ID: ${batch_id}`)
    logDebug(`[WEBHOOK] Status: ${status}`)
    logDebug(`[WEBHOOK] Total rows: ${total_rows}`)
    logDebug(`[WEBHOOK] Results count: ${results?.length || 0}`)

    // Verify batch exists
    const { data: batch, error: batchError } = await supabaseAdmin
      .from('batches')
      .select('id, user_id, total_rows, status')
      .eq('id', batch_id)
      .single()

    if (batchError || !batch) {
      logError('[WEBHOOK] Batch not found', batchError, { batch_id })
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      )
    }

    logDebug(`[WEBHOOK] Batch found, user_id: ${batch.user_id}`)

    // CRITICAL FIX: Check if batch is already completed to prevent race conditions
    // If already completed, skip processing to prevent duplicate results
    if (batch.status === 'completed' || batch.status === 'completed_with_errors' || batch.status === 'failed') {
      logDebug(`[WEBHOOK] Batch already in terminal state: ${batch.status}. Skipping duplicate processing.`)
      return NextResponse.json({
        success: true,
        batch_id,
        message: 'Batch already processed',
        status: batch.status
      })
    }

    // Transform and store results (this should be idempotent or properly handle retries)
    if (results && Array.isArray(results)) {
      logDebug(`[WEBHOOK] Transforming ${results.length} results...`)
      await transformAndStoreBatchResults(batch_id, results)
      logDebug('[WEBHOOK] Results stored successfully')
    } else {
      logWarning('[WEBHOOK] No results provided or invalid format')
    }

    // Update batch status (only if results were provided or no results expected)
    const updateData: Record<string, unknown> = {
      status: status === 'completed' ? 'completed' : 'completed_with_errors',
      processed_rows: total_rows || batch.total_rows,  // Note: 'processed_rows', not 'completed_rows'
    }

    // Update total_rows if it was 0 and we now have the actual count
    // This ensures usage tracking trigger fires correctly
    if (batch.total_rows === 0 && total_rows && total_rows > 0) {
      updateData.total_rows = total_rows
    }

    logDebug('[WEBHOOK] Updating batch status:', updateData.status)

    // Use a conditional update to prevent race conditions - only update if status hasn't changed
    const { error: updateError } = await supabaseAdmin
      .from('batches')
      .update(updateData)
      .eq('id', batch_id)
      .neq('status', 'completed')  // Don't update if already completed
      .neq('status', 'completed_with_errors')  // Don't update if already completed with errors
      .neq('status', 'failed')  // Don't update if already failed

    if (updateError) {
      logError('[WEBHOOK] Failed to update batch', updateError, { batch_id })
      throw updateError
    }

    // Create resources from batch results (if batch completed successfully)
    if (status === 'completed' || status === 'completed_with_errors') {
      logDebug('[WEBHOOK] Creating resources from batch results...')
      // Don't await - let it run in background, don't fail webhook if resource creation fails
      createResourcesFromBatch(batch_id).catch((error) => {
        logError('[WEBHOOK] Error creating resources (non-fatal)', error, { batch_id })
        // Log but don't throw - webhook should still succeed
      })
    }

    const duration = Date.now() - startTime

    logDebug(`[WEBHOOK] ========== Webhook Processed Successfully ==========`)
    logDebug(`[WEBHOOK] Duration: ${duration}ms`)

    devLog.log(`Modal webhook received for batch ${batch_id}: ${status}`, {
      totalRows: total_rows,
      successful,
      failed,
      duration
    })

    return NextResponse.json({
      success: true,
      batch_id,
      message: 'Results processed successfully',
      rowsProcessed: total_rows,
      status: status === 'completed' ? 'completed' : 'completed_with_errors'
    })

  } catch (error) {
    const duration = Date.now() - startTime

    logError('Webhook processing failed', error, {
      source: 'api/webhook/modal-callback',
      duration,
      errorType: typeof error,
      errorString: String(error),
    })

    const errorMessage = error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null
      ? JSON.stringify(error)
      : String(error)

    // SECURITY: Don't leak error details to external callers
    const isProduction = process.env.NODE_ENV === 'production'
    return NextResponse.json(
      {
        error: 'Failed to process webhook',
        ...(isProduction ? {} : { details: errorMessage })
      },
      { status: 500 }
    )
  }
}

/**
 * Transform Modal V2's response format and store in batch_results table
 *
 * V2 format: { status: "success", data: { "prompt-executor": { data: { output: "..." } } } }
 * Our format: { batch_id, row_index, input, output, status, error }
 */
async function transformAndStoreBatchResults(
  batchId: string,
  v2Results: unknown[]
): Promise<void> {
  try {
    logDebug(`[WEBHOOK] Transforming ${v2Results.length} results for batch ${batchId}`)

    const batchResults = v2Results.map((result, index) => {
      const v2Result = result as {
        status: string
        data?: {
          [key: string]: {
            data?: {
              output?: string
              prompt?: string
              rendered_prompt?: string
            }
          }
        }
        row_index?: number
        error?: string
      }

      // Extract output from nested V2 structure
      let output: string | null = null
      let error: string | null = null
      let status: 'success' | 'error' = 'error'
      const inputData: Record<string, unknown> = {}

      if (v2Result.status === 'success' && v2Result.data) {
        // V2 returns: data.prompt_executor.data.output (underscore, not hyphen!)
        const promptExecutorData = v2Result.data['prompt_executor'] || v2Result.data['prompt-executor']

        if (promptExecutorData && promptExecutorData.data && promptExecutorData.data.output) {
          const rawOutput = promptExecutorData.data.output
          // Output can be a string or an object (multiple columns)
          output = typeof rawOutput === 'string' ? rawOutput : JSON.stringify(rawOutput)
          status = 'success'
        }

        // Extract input data if available
        if (v2Result.data) {
          const dataKeys = Object.keys(v2Result.data)
          for (const key of dataKeys) {
            if (key !== 'prompt_executor' && key !== 'prompt-executor') {
              inputData[key] = v2Result.data[key]
            }
          }
        }
      } else if (v2Result.status === 'error') {
        error = v2Result.error || 'Unknown error'
        status = 'error'
      }

      const rowIndex = v2Result.row_index !== undefined ? v2Result.row_index : index

      // Generate unique ID for each result
      const resultId = `${batchId}_row_${rowIndex}`

      return {
        id: resultId,
        batch_id: batchId,
        row_index: rowIndex,
        input_data: JSON.stringify(inputData),
        output_data: output || '',
        status,
        error_message: error || null,
      }
    })

    logDebug(`[WEBHOOK] Inserting ${batchResults.length} batch_results...`)

    // Insert batch_results in bulk
    const { error: insertError } = await supabaseAdmin
      .from('batch_results')
      .insert(batchResults)

    if (insertError) {
      logError('[WEBHOOK] Insert error', insertError, { batchId })
      throw new Error(`Failed to store batch results: ${insertError.message}`)
    }

    const successCount = batchResults.filter(r => r.status === 'success').length
    const errorCount = batchResults.filter(r => r.status === 'error').length

    logDebug(`[WEBHOOK] Stored ${batchResults.length} results (${successCount} success, ${errorCount} errors)`)

    devLog.log(`Stored ${batchResults.length} results for batch ${batchId}:`, {
      success: successCount,
      error: errorCount
    })

  } catch (error) {
    logError('[WEBHOOK] Transform/store failed', error, {
      source: 'api/webhook/modal-callback/transformAndStoreBatchResults',
      batchId
    })
    throw error
  }
}

/**
 * GET handler - return webhook info
 */
export async function GET(): Promise<Response> {
  return NextResponse.json(
    {
      endpoint: '/api/webhook/modal-callback',
      method: 'POST',
      description: 'Webhook endpoint for Modal batch processing completion',
      expected_payload: {
        batch_id: 'string',
        status: 'completed | failed',
        total_rows: 'number',
        successful: 'number',
        failed: 'number',
        results: 'array'
      }
    },
    { status: 200 }
  )
}
