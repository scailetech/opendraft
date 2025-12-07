/**
 * API Route: Package Runs
 * GET /api/packages/runs - Get recent package runs for current user
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

    // Fetch recent package runs
    const { data: runs, error } = await supabase
      .from('package_runs')
      .select('id, package_id, agent_id, batch_id, status, created_at, updated_at')
      .eq('client_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      logError('Error fetching package runs', error)
      return NextResponse.json(
        { error: 'Failed to fetch runs' },
        { status: 500 }
      )
    }

    return NextResponse.json({ runs: runs || [] })
  } catch (error) {
    logError('Error in GET /api/packages/runs', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

