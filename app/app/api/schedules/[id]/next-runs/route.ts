import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { authenticateRequest } from '@/lib/auth-middleware'
import { calculateNextRuns } from '@/lib/utils/cron'
import { logError } from '@/lib/errors'

/**
 * GET /api/schedules/[id]/next-runs
 * Get preview of next N run times for a schedule
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

    const { searchParams } = new URL(request.url)
    const count = parseInt(searchParams.get('count') || '5', 10)

    if (isNaN(count) || count < 1 || count > 20) {
      return NextResponse.json({ error: 'count must be between 1 and 20' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: schedule, error } = await supabase
      .from('scheduled_runs')
      .select('cron_expression, timezone')
      .eq('id', scheduleId)
      .eq('user_id', userId)
      .single()

    if (error || !schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    try {
      const nextRuns = calculateNextRuns(
        schedule.cron_expression,
        schedule.timezone || 'UTC',
        count
      )

      return NextResponse.json({
        schedule_id: scheduleId,
        next_runs: nextRuns,
        timezone: schedule.timezone || 'UTC',
      }, { status: 200 })
    } catch (calcError) {
      return NextResponse.json(
        { error: `Failed to calculate next runs: ${calcError instanceof Error ? calcError.message : 'Unknown error'}` },
        { status: 400 }
      )
    }
  } catch (error) {
    logError(error instanceof Error ? error : new Error('Unknown error'), {
      source: 'api/schedules/[id]/next-runs',
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

