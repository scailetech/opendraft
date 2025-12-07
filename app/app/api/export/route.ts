import { NextRequest, NextResponse } from 'next/server'
import { exportToCSV, exportToJSON, flattenBatchResultsForExport, type BatchResultRow } from '@/lib/export'
import { generateExportFilename, generateExportFilenameFromBatch } from '@/lib/export-filename'
import { logError } from '@/lib/errors'
import { supabaseAdmin } from '@/lib/supabase'
import { authenticateRequest } from '@/lib/auth-middleware'

/**
 * POST /api/export
 * Export results data to CSV or JSON format
 * SECURITY: Requires authentication
 * 
 * Request body:
 * {
 *   results: Array<Record<string, unknown>>,
 *   format: 'csv' | 'json',
 *   batchId?: string,
 *   timestamp?: string,
 *   visibleColumns?: string[] // Optional: only export these columns (user selection)
 * }
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    // SECURITY: Require authentication
    const userId = await authenticateRequest(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate request body
    if (!body.results || !Array.isArray(body.results)) {
      return NextResponse.json(
        { error: 'results must be an array' },
        { status: 400 }
      )
    }

    if (!body.format || (body.format !== 'csv' && body.format !== 'json')) {
      return NextResponse.json(
        { error: 'format must be either "csv" or "json"' },
        { status: 400 }
      )
    }

    const { results, format, batchId, timestamp, visibleColumns } = body

    // Use DRY shared function - ensures RUN and EXECUTIONS exports are always aligned
    let flattenedResults = flattenBatchResultsForExport(results as BatchResultRow[])

    // Filter columns if visibleColumns is provided (user selected specific columns)
    if (visibleColumns && Array.isArray(visibleColumns) && visibleColumns.length > 0) {
      // Always include # and status columns, plus user-selected columns, plus metadata
      const columnsToKeep = new Set([
        '#', 'status', 
        ...visibleColumns,
        // Always include metadata columns at the end
        'input_tokens', 'output_tokens', 'total_tokens', 'tools_used', 'model', 'error'
      ])
      flattenedResults = flattenedResults.map(row => {
        const filtered: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(row)) {
          if (columnsToKeep.has(key)) {
            filtered[key] = value
          }
        }
        return filtered as typeof row
      })
    }

    // Generate user-oriented filename
    let filename: string
    if (batchId) {
      // SECURITY: Verify user owns this batch before exporting
      try {
        const { data: batchData, error: batchError } = await supabaseAdmin
          .from('batches')
          .select('csv_filename, created_at, user_id')
          .eq('id', batchId)
          .single()

        if (batchError || !batchData) {
          return NextResponse.json(
            { error: 'Batch not found' },
            { status: 404 }
          )
        }

        // SECURITY: Verify ownership
        if (batchData.user_id !== userId) {
          return NextResponse.json(
            { error: 'Access denied - you do not own this batch' },
            { status: 403 }
          )
        }

        filename = generateExportFilenameFromBatch(batchData, format)
      } catch (err) {
        // Fallback on error
        const date = timestamp ? new Date(timestamp) : new Date()
        filename = generateExportFilename(null, date, format)
      }
    } else {
      // No batchId - use timestamp from request or current time
      const date = timestamp ? new Date(timestamp) : new Date()
      filename = generateExportFilename(null, date, format)
    }

    // Generate content based on format
    let content: string
    let contentType: string

    if (format === 'csv') {
      try {
        content = exportToCSV(flattenedResults, { batchId, timestamp })
        contentType = 'text/csv'
      } catch (err) {
        const error = err instanceof Error ? err : new Error('CSV export failed')
        logError(error, { format, resultsCount: results.length })
        return NextResponse.json(
          { error: 'Failed to generate CSV' },
          { status: 500 }
        )
      }
    } else {
      // format === 'json'
      try {
        content = exportToJSON(flattenedResults, { batchId, timestamp })
        contentType = 'application/json'
      } catch (err) {
        const error = err instanceof Error ? err : new Error('JSON export failed')
        logError(error, { format, resultsCount: results.length })
        return NextResponse.json(
          { error: 'Failed to generate JSON' },
          { status: 500 }
        )
      }
    }

    // Return file response with appropriate headers
    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': content.length.toString(),
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, { endpoint: '/api/export' })

    return NextResponse.json(
      {
        error: 'Export failed',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
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
    { error: 'Method not allowed. Use POST /api/export' },
    { status: 405 }
  )
}

