import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { authenticateRequest } from '@/lib/auth-middleware'
import { logError } from '@/lib/errors'

/**
 * POST /api/schedules/[id]/toggle
 * Toggle enable/disable a schedule
 */
export async function POST(
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

    const body = await request.json()
    const isEnabled = body.is_enabled !== undefined ? body.is_enabled : body.enabled

    if (typeof isEnabled !== 'boolean') {
      return NextResponse.json({ error: 'is_enabled must be a boolean' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: schedule, error } = await supabase
      .from('scheduled_runs')
      .update({ is_enabled: isEnabled })
      .eq('id', scheduleId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error || !schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    return NextResponse.json({ schedule }, { status: 200 })
  } catch (error) {
    logError(error instanceof Error ? error : new Error('Unknown error'), {
      source: 'api/schedules/[id]/toggle',
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

