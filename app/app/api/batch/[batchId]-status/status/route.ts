import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logError } from '@/lib/utils/logger'
import { authenticateRequest } from '@/lib/auth-middleware'

export const maxDuration = 60

/**
 * GET /api/batch/[id]/status
 * Get batch status and progress
 *
 * Returns:
 * {
 *   batchId: string,
 *   status: 'pending' | 'processing' | 'completed' | 'completed_with_errors' | 'failed' | 'cancelled',
 *   totalRows: number,
 *   processedRows: number,
 *   progressPercent: number,
 *   results: Array<{
 *     id: string,
 *     input: string,
 *     output: string,
 *     status: 'pending' | 'processing' | 'success' | 'error',
 *     error?: string
 *   }>,
 *   message: string,
 *   createdAt: string,
 *   updatedAt: string
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { batchId: string } }
): Promise<Response> {
  try {
    // SECURITY: Authenticate request
    const userId = await authenticateRequest(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in or provide valid Bearer token/API key' },
        { status: 401 }
      )
    }

    const batchId = params.batchId

    if (!batchId) {
      return NextResponse.json(
        { error: 'Batch ID is required' },
        { status: 400 }
      )
    }

    // Get batch info
    const { data: batchData, error: batchError } = await supabaseAdmin
      .from('batches')
      .select('*')
      .eq('id', batchId)
      .single()

    if (batchError || !batchData) {
      logError('Batch not found', batchError, { batchId })
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      )
    }

    // SECURITY: Verify user owns this batch
    if (batchData.user_id !== userId) {
      logError('Unauthorized batch access attempt', null, { batchId, userId, ownerUserId: batchData.user_id })
      return NextResponse.json(
        { error: 'Unauthorized - you do not have access to this batch' },
        { status: 403 }
      )
    }

    // Get batch results
    const { data: results, error: resultsError } = await supabaseAdmin
      .from('batch_results')
      .select('*')
      .eq('batch_id', batchId)

    if (resultsError) {
      logError('Failed to fetch batch results', resultsError, { batchId })
      return NextResponse.json(
        { error: 'Failed to fetch batch results' },
        { status: 500 }
      )
    }

    // Calculate progress
    const totalRows = batchData.total_rows || 0
    const completedRows = results?.filter(
      (r) => r.status === 'success' || r.status === 'error'
    ).length || 0

    // Calculate progress percent (real or estimated)
    let progressPercent = 0
    if (completedRows > 0) {
      // Real progress based on actual completed rows
      progressPercent = totalRows > 0 ? Math.round((completedRows / totalRows) * 100) : 0
    } else if (batchData.status === 'pending' || batchData.status === 'processing') {
      // Estimated progress based on elapsed time
      // Average processing time: ~2 seconds per row (empirical)
      const avgTimePerRow = 2000 // 2s per row
      const elapsedMs = Date.now() - new Date(batchData.created_at).getTime()
      const estimatedProgress = (elapsedMs / (totalRows * avgTimePerRow)) * 100

      // Show 0-90% estimated progress (leave room for final jump to 100%)
      progressPercent = Math.min(90, Math.round(estimatedProgress))
    }

    // Map results to response format (include tokens for analytics)
    const mappedResults = (results || []).map((r) => {
      let parsedInput = {}
      if (r.input) {
        try {
          parsedInput = JSON.parse(r.input)
        } catch (parseError) {
          logError('Failed to parse input JSON for result', parseError, { resultId: r.id })
          // Fallback to empty object to prevent endpoint crash
          parsedInput = {}
        }
      }
      return {
        id: r.id,
        input: parsedInput,
        output: r.output || '',
        status: r.status,
        error: r.error,
        input_tokens: r.input_tokens || 0,
        output_tokens: r.output_tokens || 0,
        model: r.model || '',
      }
    })

    return NextResponse.json(
      {
        success: true,
        batchId,
        status: batchData.status,
        totalRows,
        processedRows: completedRows,
        progressPercent,
        results: mappedResults,
        message: getStatusMessage(batchData.status, progressPercent),
        createdAt: batchData.created_at,
        updatedAt: batchData.updated_at,
      },
      { status: 200 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logError('GET /api/batch/[id]/status error', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch batch status',
        details: message,
      },
      { status: 500 }
    )
  }
}

/**
 * GET human-friendly status message
 */
function getStatusMessage(status: string, progressPercent: number): string {
  switch (status) {
    case 'pending':
      return 'Batch pending - waiting to start processing'
    case 'processing':
      return `Processing: ${progressPercent}% complete`
    case 'completed':
      return '✓ Batch completed successfully'
    case 'completed_with_errors':
      return `✓ Batch completed with some errors (${progressPercent}% of rows processed)`
    case 'failed':
      return '✗ Batch failed to process'
    case 'cancelled':
      return 'Batch was cancelled'
    default:
      return `Status: ${status}`
  }
}

/**
 * Handle unsupported methods
 */
export async function POST(): Promise<Response> {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET to check batch status' },
    { status: 405 }
  )
}




