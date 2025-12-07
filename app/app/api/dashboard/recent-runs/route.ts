/**
 * API Route: Dashboard Recent Runs
 * GET /api/dashboard/recent-runs - Get recent agent runs (batches)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10')

    // Fetch recent batches
    const { data: batches, error: batchesError } = await supabase
      .from('batches')
      .select('id, csv_filename, status, total_rows, processed_rows, created_at, updated_at, agent_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (batchesError) {
      logError('Error fetching recent batches', batchesError)
      return NextResponse.json(
        { error: 'Failed to fetch recent runs' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      runs: batches || [],
    })
  } catch (error) {
    logError('Error in GET /api/dashboard/recent-runs', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

