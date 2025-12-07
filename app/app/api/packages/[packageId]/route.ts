/**
 * API Route: Package by ID
 * GET /api/packages/[packageId] - Get package details
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/utils/logger'

export async function GET(
  _request: NextRequest,
  { params }: { params: { packageId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get package assignment for this client
    const { data: assignment, error } = await supabase
      .from('client_package_assignments')
      .select(`
        *,
        agency_packages (
          id,
          name,
          description,
          agent_configs,
          monthly_cost,
          is_active
        )
      `)
      .eq('client_user_id', user.id)
      .eq('package_id', params.packageId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Package not found' },
          { status: 404 }
        )
      }
      logError('Error fetching package', error)
      return NextResponse.json(
        { error: 'Failed to fetch package' },
        { status: 500 }
      )
    }

    return NextResponse.json({ package: assignment })
  } catch (error) {
    logError('Error in GET /api/packages/[packageId]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

