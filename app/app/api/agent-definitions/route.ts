/**
 * Agent Definitions API - Fetch available agent definitions
 * Public read-only endpoint (no auth required for reading)
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { AgentDefinition } from '@/lib/types/agent-definitions'
import { logError } from '@/lib/utils/logger'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('agent_definitions')
      .select('*')
      .eq('enabled', true)
      .order('name', { ascending: true })

    if (error) {
      logError('Error fetching agent definitions', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ agents: data as AgentDefinition[] })
  } catch (error) {
    logError('Unexpected error fetching agent definitions', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}


