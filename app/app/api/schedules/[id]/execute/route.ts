import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, supabaseAdmin } from '@/lib/supabase'
import { authenticateRequest } from '@/lib/auth-middleware'
import { calculateNextRun } from '@/lib/utils/cron'
import { logError } from '@/lib/errors'

/**
 * POST /api/schedules/[id]/execute
 * Execute a schedule immediately (called by cron job or manual trigger)
 * 
 * This endpoint:
 * 1. Loads the schedule configuration
 * 2. Loads CSV data (from JSONB, file, or URL)
 * 3. Creates a batch using the existing /api/process endpoint logic
 * 4. Updates schedule execution tracking
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  let scheduleId: string | null = null
  let userId: string | null = null

  try {
    // Allow service role key for cron-triggered executions
    const authHeader = request.headers.get('authorization')
    const isServiceRole = authHeader?.includes(process.env.SUPABASE_SERVICE_ROLE_KEY || '')
    
    if (!isServiceRole) {
      // For manual triggers, require user authentication
      userId = await authenticateRequest(request)
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    scheduleId = params.id
    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 })
    }

    const supabase = isServiceRole ? supabaseAdmin : await createServerSupabaseClient()

    // Load schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('scheduled_runs')
      .select('*')
      .eq('id', scheduleId)
      .eq('status', 'active')
      .eq('is_enabled', true)
      .single()

    if (scheduleError || !schedule) {
      return NextResponse.json({ error: 'Schedule not found or not enabled' }, { status: 404 })
    }

    // If not service role, verify ownership
    if (!isServiceRole && schedule.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    userId = schedule.user_id

    // Update schedule status to running
    await supabase
      .from('scheduled_runs')
      .update({
        last_run_status: 'running',
        last_run_at: new Date().toISOString(),
      })
      .eq('id', scheduleId)

    // Create execution record
    const { data: execution, error: execError } = await supabase
      .from('scheduled_run_executions')
      .insert({
        scheduled_run_id: scheduleId,
        status: 'running',
      })
      .select()
      .single()

    if (execError) {
      logError(new Error('Failed to create execution record'), {
        source: 'api/schedules/[id]/execute',
        supabaseError: execError,
        scheduleId,
      })
    }

    const executionId = execution?.id

    try {
      // Load CSV data
      let csvRows: Array<Record<string, string>> = []
      const csvFilename = schedule.csv_filename || 'scheduled-run.csv'

      if (schedule.csv_data) {
        // Use stored CSV data
        const csvData = schedule.csv_data as { columns: string[]; rows: Array<Record<string, unknown>> }
        csvRows = csvData.rows.map(row => {
          const result: Record<string, string> = {}
          csvData.columns.forEach(col => {
            result[col] = String(row[col] || '')
          })
          return result
        })
        // csvFilename already set from schedule.csv_filename above
      } else if (schedule.csv_file_path) {
        // Load from context file (would need to implement file loading)
        return NextResponse.json(
          { error: 'Loading CSV from file path not yet implemented' },
          { status: 501 }
        )
      } else if (schedule.csv_url) {
        // Load from Google Sheets URL (would need to implement)
        return NextResponse.json(
          { error: 'Loading CSV from Google Sheets URL not yet implemented' },
          { status: 501 }
        )
      } else {
        return NextResponse.json(
          { error: 'No CSV data source configured for schedule' },
          { status: 400 }
        )
      }

      if (csvRows.length === 0) {
        throw new Error('No CSV rows to process')
      }

      // Prepare batch creation payload
      const config = schedule.config as {
        prompt: string
        outputFields?: Array<{ name: string; type?: string }>
        selectedTools?: string[]
        selectedInputColumns?: string[]
      }

      const outputColumns = config.outputFields?.map(f => f.name) || []
      const tools = config.selectedTools || []
      const selectedInputColumns = config.selectedInputColumns

      // Determine if test mode
      const testMode = schedule.action === 'test'
      const rowsToProcess = testMode ? csvRows.slice(0, 1) : csvRows

      // Create batch by calling internal process logic
      // We'll use the same logic as /api/process but inline it
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Create batch record
      const { error: batchError } = await supabaseAdmin
        .from('batches')
        .insert({
          id: batchId,
          user_id: userId,
          csv_filename: csvFilename,
          total_rows: rowsToProcess.length,
          status: 'pending',
          prompt: config.prompt,
          tools: tools.length > 0 ? tools : null,
          selected_input_columns: selectedInputColumns && Array.isArray(selectedInputColumns) ? selectedInputColumns : null,
          data: rowsToProcess,
          context: '',
          output_schema: outputColumns.length > 0 ? outputColumns.map(col => ({ name: col })) : null,
        })

      if (batchError) {
        throw new Error(`Failed to create batch: ${batchError.message}`)
      }

      // Update execution record with batch ID
      if (executionId) {
        await supabase
          .from('scheduled_run_executions')
          .update({ batch_id: batchId })
          .eq('id', executionId)
      }

      // Update schedule with batch ID and success status
      const nextRunAt = calculateNextRun(schedule.cron_expression, schedule.timezone || 'UTC')
      await supabase
        .from('scheduled_runs')
        .update({
          last_run_status: 'success',
          last_run_batch_id: batchId,
          next_run_at: nextRunAt,
          run_count: schedule.run_count + 1,
        })
        .eq('id', scheduleId)

      // Update execution record
      if (executionId) {
        await supabase
          .from('scheduled_run_executions')
          .update({
            status: 'success',
            completed_at: new Date().toISOString(),
            batch_id: batchId,
          })
          .eq('id', executionId)
      }

      return NextResponse.json({
        success: true,
        batchId,
        scheduleId,
        executionId,
        message: `Schedule executed successfully. Batch ${batchId} created.`,
      }, { status: 200 })
    } catch (executionError) {
      // Update schedule with error status
      const errorMessage = executionError instanceof Error ? executionError.message : 'Unknown error'
      await supabase
        .from('scheduled_runs')
        .update({
          last_run_status: 'failed',
          error_count: (schedule.error_count || 0) + 1,
          last_error_message: errorMessage,
        })
        .eq('id', scheduleId)

      // Update execution record
      if (executionId) {
        await supabase
          .from('scheduled_run_executions')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: errorMessage,
          })
          .eq('id', executionId)
      }

      logError(executionError instanceof Error ? executionError : new Error('Execution failed'), {
        source: 'api/schedules/[id]/execute',
        scheduleId,
        userId,
      })

      return NextResponse.json(
        { error: 'Failed to execute schedule', details: errorMessage },
        { status: 500 }
      )
    }
  } catch (error) {
    logError(error instanceof Error ? error : new Error('Unknown error'), {
      source: 'api/schedules/[id]/execute',
      scheduleId,
      userId,
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

