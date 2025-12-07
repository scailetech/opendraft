/**
 * API Route: Agents
 * GET /api/agents - List all agent definitions
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/utils/logger'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Agent definitions are public read-only
    // Try to get user, but don't require auth (for public access)
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data: agents, error } = await supabase
      .from('agent_definitions')
      .select('*')
      .eq('enabled', true)
      .order('name', { ascending: true })

    if (error) {
      logError('Error fetching agents', error, { 
        userId: user?.id,
        errorCode: error.code,
        errorMessage: error.message 
      })
      return NextResponse.json(
        { error: 'Failed to fetch agents', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ agents: agents || [] })
  } catch (error) {
    logError('Error in GET /api/agents', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

