import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { authenticateRequest } from '@/lib/auth-middleware'
import { validateCronExpression, calculateNextRun } from '@/lib/utils/cron'
import type { CreateScheduleInput, ScheduledRun } from '@/lib/types/schedules'
import { logError } from '@/lib/errors'

/**
 * GET /api/schedules
 * List all schedules for the authenticated user
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const userId = await authenticateRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: schedules, error } = await supabase
      .from('scheduled_runs')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active') // Only return active schedules (not deleted)
      .order('created_at', { ascending: false })

    if (error) {
      logError(new Error('Failed to fetch schedules'), {
        source: 'api/schedules/GET',
        supabaseError: error,
        userId,
      })
      return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 })
    }

    return NextResponse.json({ schedules: schedules || [] }, { status: 200 })
  } catch (error) {
    logError(error instanceof Error ? error : new Error('Unknown error'), {
      source: 'api/schedules/GET',
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/schedules
 * Create a new schedule
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const userId = await authenticateRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CreateScheduleInput = await request.json()

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    if (!body.cron_expression || typeof body.cron_expression !== 'string') {
      return NextResponse.json({ error: 'cron_expression is required' }, { status: 400 })
    }

    if (!body.action || !['test', 'run'].includes(body.action)) {
      return NextResponse.json({ error: 'action must be "test" or "run"' }, { status: 400 })
    }

    if (!body.config || typeof body.config !== 'object') {
      return NextResponse.json({ error: 'config is required' }, { status: 400 })
    }

    // Validate cron expression
    const cronValidation = validateCronExpression(body.cron_expression)
    if (!cronValidation.valid) {
      return NextResponse.json(
        { error: `Invalid cron expression: ${cronValidation.error}` },
        { status: 400 }
      )
    }

    // Calculate next run time
    const timezone = body.timezone || 'UTC'
    let nextRunAt: string
    try {
      nextRunAt = calculateNextRun(body.cron_expression, timezone)
    } catch (error) {
      return NextResponse.json(
        { error: `Failed to calculate next run: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 400 }
      )
    }

    // Prepare schedule data
    const scheduleData: Partial<ScheduledRun> = {
      user_id: userId,
      name: body.name.trim(),
      description: body.description?.trim(),
      cron_expression: body.cron_expression,
      timezone: timezone,
      action: body.action,
      config: body.config,
      csv_data: body.csv_data || undefined,
      csv_file_path: body.csv_file_path || undefined,
      csv_url: body.csv_url || undefined,
      csv_filename: body.csv_filename || undefined,
      agent_type: body.agent_type || 'bulk_agent',
      status: 'active',
      is_enabled: true,
      next_run_at: nextRunAt,
    }

    // Insert schedule
    const supabase = await createServerSupabaseClient()
    const { data: schedule, error } = await supabase
      .from('scheduled_runs')
      .insert(scheduleData)
      .select()
      .single()

    if (error) {
      logError(new Error('Failed to create schedule'), {
        source: 'api/schedules/POST',
        supabaseError: error,
        userId,
      })
      return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 })
    }

    return NextResponse.json({ schedule }, { status: 201 })
  } catch (error) {
    logError(error instanceof Error ? error : new Error('Unknown error'), {
      source: 'api/schedules/POST',
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

