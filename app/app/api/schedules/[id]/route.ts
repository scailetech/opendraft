import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { authenticateRequest } from '@/lib/auth-middleware'
import { validateCronExpression, calculateNextRun } from '@/lib/utils/cron'
import type { UpdateScheduleInput } from '@/lib/types/schedules'
import { logError } from '@/lib/errors'

/**
 * GET /api/schedules/[id]
 * Get a specific schedule
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const userId = await authenticateRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const scheduleId = params.id
    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: schedule, error } = await supabase
      .from('scheduled_runs')
      .select('*')
      .eq('id', scheduleId)
      .eq('user_id', userId)
      .single()

    if (error || !schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    return NextResponse.json({ schedule }, { status: 200 })
  } catch (error) {
    logError(error instanceof Error ? error : new Error('Unknown error'), {
      source: 'api/schedules/[id]/GET',
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/schedules/[id]
 * Update a schedule
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const userId = await authenticateRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const scheduleId = params.id
    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 })
    }

    const body: UpdateScheduleInput = await request.json()

    // Verify schedule exists and belongs to user
    const supabase = await createServerSupabaseClient()
    const { data: existingSchedule, error: fetchError } = await supabase
      .from('scheduled_runs')
      .select('id, cron_expression, timezone')
      .eq('id', scheduleId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !existingSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: Partial<UpdateScheduleInput> = {}

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 })
      }
      updateData.name = body.name.trim()
    }

    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || undefined
    }

    if (body.cron_expression !== undefined) {
      const cronValidation = validateCronExpression(body.cron_expression)
      if (!cronValidation.valid) {
        return NextResponse.json(
          { error: `Invalid cron expression: ${cronValidation.error}` },
          { status: 400 }
        )
      }
      updateData.cron_expression = body.cron_expression
    }

    if (body.timezone !== undefined) {
      updateData.timezone = body.timezone
    }

    if (body.action !== undefined) {
      if (!['test', 'run'].includes(body.action)) {
        return NextResponse.json({ error: 'action must be "test" or "run"' }, { status: 400 })
      }
      updateData.action = body.action
    }

    if (body.config !== undefined) {
      updateData.config = body.config
    }

    if (body.csv_data !== undefined) {
      updateData.csv_data = body.csv_data
    }

    if (body.csv_file_path !== undefined) {
      updateData.csv_file_path = body.csv_file_path
    }

    if (body.csv_url !== undefined) {
      updateData.csv_url = body.csv_url
    }

    if (body.csv_filename !== undefined) {
      updateData.csv_filename = body.csv_filename
    }

    if (body.status !== undefined) {
      if (!['active', 'paused', 'deleted'].includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updateData.status = body.status
    }

    if (body.is_enabled !== undefined) {
      updateData.is_enabled = body.is_enabled
    }

    // Recalculate next_run_at if cron_expression or timezone changed
    const cronExpr = updateData.cron_expression || existingSchedule.cron_expression
    const timezone = updateData.timezone || existingSchedule.timezone || 'UTC'
    
    if (updateData.cron_expression || updateData.timezone) {
      try {
        updateData.next_run_at = calculateNextRun(cronExpr as string, timezone as string)
      } catch (error) {
        return NextResponse.json(
          { error: `Failed to calculate next run: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 400 }
        )
      }
    }

    // Update schedule
    const { data: schedule, error: updateError } = await supabase
      .from('scheduled_runs')
      .update(updateData)
      .eq('id', scheduleId)
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError) {
      logError(new Error('Failed to update schedule'), {
        source: 'api/schedules/[id]/PUT',
        supabaseError: updateError,
        scheduleId,
        userId,
      })
      return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 })
    }

    return NextResponse.json({ schedule }, { status: 200 })
  } catch (error) {
    logError(error instanceof Error ? error : new Error('Unknown error'), {
      source: 'api/schedules/[id]/PUT',
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/schedules/[id]
 * Delete a schedule (soft delete - sets status to 'deleted')
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const userId = await authenticateRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const scheduleId = params.id
    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { error } = await supabase
      .from('scheduled_runs')
      .update({ status: 'deleted' })
      .eq('id', scheduleId)
      .eq('user_id', userId)

    if (error) {
      logError(new Error('Failed to delete schedule'), {
        source: 'api/schedules/[id]/DELETE',
        supabaseError: error,
        scheduleId,
        userId,
      })
      return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    logError(error instanceof Error ? error : new Error('Unknown error'), {
      source: 'api/schedules/[id]/DELETE',
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

