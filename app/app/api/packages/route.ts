/**
 * API Route: Packages (Client View)
 * GET /api/packages - List packages assigned to current user (client)
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/utils/logger'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get packages assigned to this client
    const { data: assignments, error } = await supabase
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
      .eq('status', 'active')

    if (error) {
      logError('Error fetching client packages', error)
      return NextResponse.json(
        { error: 'Failed to fetch packages' },
        { status: 500 }
      )
    }

    return NextResponse.json({ packages: assignments || [] })
  } catch (error) {
    logError('Error in GET /api/packages', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

