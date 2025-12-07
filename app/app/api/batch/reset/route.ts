import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { releaseBatch } from '@/middleware/rateLimits'
import { logError } from '@/lib/errors'

/**
 * POST /api/batch/reset
 * Reset stuck batch state for current user
 * Use this if you get "Please wait for your current batch to complete" error
 */
export async function POST(): Promise<Response> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Release the stuck batch from rate limiter
    releaseBatch(data.user.id)

    return NextResponse.json({
      success: true,
      message: 'Batch state reset successfully. You can now start a new batch.',
    })
  } catch (error) {
    logError(error instanceof Error ? error : new Error('Batch reset failed'), {
      source: 'api/batch/reset/POST'
    })
    return NextResponse.json(
      { error: 'Failed to reset batch state' },
      { status: 500 }
    )
  }
}
