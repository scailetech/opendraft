import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logError } from '@/lib/utils/logger'
import { authenticateRequest } from '@/lib/auth-middleware'

export const maxDuration = 60

/**
 * GET /api/batch/[batchId]/status
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

    // Get batch results count (avoid 1000-row pagination limit)
    // For large batches, just get the count, not individual rows
    const { count: totalResultCount, error: countError } = await supabaseAdmin
      .from('batch_results')
      .select('*', { count: 'exact', head: true })
      .eq('batch_id', batchId)

    if (countError) {
      logError('Failed to fetch batch result count', countError, { batchId })
      return NextResponse.json(
        { error: 'Failed to fetch batch result count' },
        { status: 500 }
      )
    }

    // For displaying results in the UI, fetch results based on limit query parameter
    // Default to 100 for performance during polling, but allow requesting all results
    const resultsLimit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '100'), 10000)
    const { data: results, error: resultsError } = await supabaseAdmin
      .from('batch_results')
      .select('*')
      .eq('batch_id', batchId)
      .limit(resultsLimit)
      .order('row_index', { ascending: true })

    if (resultsError) {
      logError('Failed to fetch batch sample results', resultsError, { batchId })
      // Don't fail the whole response, just return without individual results
    }

    // Calculate progress using accurate count
    const totalRows = batchData.total_rows || 0
    const completedRows = totalResultCount || 0

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
    // Note: results are limited to 100 for performance, but totalResultCount reflects all rows
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mappedResults = (results || []).map((r: Record<string, unknown>) => {
      let parsedInput = {}

      // Handle input_data - may be object (JSONB) or string
      if (r.input_data) {
        try {
          if (typeof r.input_data === 'string') {
            parsedInput = JSON.parse(r.input_data)
          } else {
            // Already an object (JSONB from database)
            parsedInput = r.input_data
          }
        } catch (parseError) {
          logError('Failed to parse input_data for result', parseError, { resultId: r.id })
          parsedInput = r.input_data || {}
        }
      }

      // Handle output_data - may be object (JSONB) or string
      let outputData = ''
      if (r.output_data) {
        try {
          if (typeof r.output_data === 'string') {
            // Try to parse as JSON, but accept raw string if not valid JSON
            try {
              outputData = JSON.stringify(JSON.parse(r.output_data))
            } catch {
              outputData = r.output_data
            }
          } else {
            // Already an object (JSONB), convert to string
            outputData = JSON.stringify(r.output_data)
          }
        } catch (parseError) {
          logError('Failed to parse output_data for result', parseError, { resultId: r.id })
          outputData = String(r.output_data || '')
        }
      }

      // Normalize status values for frontend consistency
      // Database stores 'success'/'error', frontend expects 'completed'/'failed'
      let normalizedStatus = r.status
      if (r.status === 'success') {
        normalizedStatus = 'completed'
      } else if (r.status === 'error') {
        normalizedStatus = 'failed'
      }

      return {
        id: r.id,
        input: parsedInput,
        output: outputData,
        status: normalizedStatus,
        error: r.error_message || r.error || null, // Use error_message from DB, fallback to error for backwards compatibility
        input_tokens: r.input_tokens || 0,
        output_tokens: r.output_tokens || 0,
        model: r.model || '',
        tools_used: r.tools_used || [],
      }
    })

    // For UI display: show total count (not just returned results count)
    const resultsDisplayCount = totalResultCount !== null ? totalResultCount : mappedResults.length

    return NextResponse.json(
      {
        success: true,
        batchId,
        status: batchData.status,
        totalRows,
        processedRows: completedRows,
        progressPercent,
        results: mappedResults,
        totalResults: resultsDisplayCount, // Total count (accurate for large batches)
        displayedResults: mappedResults.length, // Number of results in this response (max 100)
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




