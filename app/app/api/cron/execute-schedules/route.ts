/**
 * Vercel Cron Job endpoint to execute scheduled runs
 * This endpoint is called by Vercel Cron Jobs every minute
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/execute-schedules",
 *     "schedule": "* * * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { calculateNextRun } from '@/lib/utils/cron'
import { logError } from '@/lib/errors'

export const maxDuration = 60 // Max 60 seconds

export async function GET(request: NextRequest): Promise<Response> {
  // SECURITY: Verify this is called by Vercel Cron (check Authorization header)
  // CRON_SECRET is REQUIRED in production to prevent unauthorized batch executions
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const isProduction = process.env.NODE_ENV === 'production'
  
  if (!cronSecret && isProduction) {
    logError(new Error('CRITICAL: CRON_SECRET not configured in production!'), {
      source: 'api/cron/execute-schedules',
    })
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }
  
  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } else {
    // Only allow without secret in development
    console.warn('[CRON] Running without CRON_SECRET (development mode only)')
  }

  try {
    // Find all schedules that are due to run
    const now = new Date()
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000)

    const { data: dueSchedules, error: fetchError } = await supabaseAdmin
      .from('scheduled_runs')
      .select('*')
      .eq('status', 'active')
      .eq('is_enabled', true)
      .lte('next_run_at', now.toISOString())
      .gte('next_run_at', twoMinutesAgo.toISOString())
      .order('next_run_at', { ascending: true })
      .limit(10) // Process max 10 schedules per minute

    if (fetchError) {
      logError(new Error('Failed to fetch due schedules'), {
        source: 'api/cron/execute-schedules',
        supabaseError: fetchError,
      })
      return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 })
    }

    if (!dueSchedules || dueSchedules.length === 0) {
      return NextResponse.json({ 
        message: 'No schedules due for execution',
        executed: 0 
      }, { status: 200 })
    }

    const results = []
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000'

    // Execute each schedule
    for (const schedule of dueSchedules) {
      try {
        // Call the execute endpoint
        const executeUrl = `${baseUrl}/api/schedules/${schedule.id}/execute`
        const response = await fetch(executeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          results.push({
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            status: 'success',
            batchId: data.batchId,
          })

          // Update next_run_at (already done by execute endpoint, but ensure it's updated)
          const nextRunAt = calculateNextRun(schedule.cron_expression, schedule.timezone || 'UTC')
          await supabaseAdmin
            .from('scheduled_runs')
            .update({ next_run_at: nextRunAt })
            .eq('id', schedule.id)
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          results.push({
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            status: 'failed',
            error: errorData.error || 'Execution failed',
          })

          // Update error count
          await supabaseAdmin
            .from('scheduled_runs')
            .update({
              error_count: (schedule.error_count || 0) + 1,
              last_error_message: errorData.error || 'Execution failed',
            })
            .eq('id', schedule.id)
        }
      } catch (error) {
        logError(error instanceof Error ? error : new Error('Schedule execution error'), {
          source: 'api/cron/execute-schedules',
          scheduleId: schedule.id,
        })

        results.push({
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        })

        // Update error count
        await supabaseAdmin
          .from('scheduled_runs')
          .update({
            error_count: (schedule.error_count || 0) + 1,
            last_error_message: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', schedule.id)
      }
    }

    return NextResponse.json({
      message: `Processed ${dueSchedules.length} schedule(s)`,
      executed: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed' || r.status === 'error').length,
      results,
    }, { status: 200 })
  } catch (error) {
    logError(error instanceof Error ? error : new Error('Cron job error'), {
      source: 'api/cron/execute-schedules',
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

