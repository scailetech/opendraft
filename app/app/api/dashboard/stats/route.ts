/**
 * API Route: Dashboard Stats
 * GET /api/dashboard/stats - Get aggregated dashboard statistics
 */

import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, createSuccessResponse, createUnauthorizedResponse } from '@/lib/api-response'
import { BulkGPTError, logError } from '@/lib/errors'

// Cache the response for 15 seconds to avoid excessive DB queries
export const revalidate = 15

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createUnauthorizedResponse()
    }

    // Fetch recent batches
    const { data: batches, error: batchesError} = await supabase
      .from('batches')
      .select(`
        id,
        csv_filename,
        status,
        total_rows,
        processed_rows,
        created_at,
        updated_at,
        agent_id
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (batchesError) {
      logError(new Error(`Failed to fetch batches: ${batchesError.message}`), {
        source: 'dashboard-stats',
      })
      return createErrorResponse(
        new BulkGPTError('API_ERROR', 'Failed to fetch batches'),
        500
      )
    }

    // Fetch agent definitions separately to avoid relying on non-existent foreign key
    const agentIds = Array.from(new Set((batches || []).map(b => b.agent_id).filter(Boolean)))
    let agentMap: Record<string, { name?: string, icon?: string }> = {}

    if (agentIds.length > 0) {
      const { data: agents } = await supabase
        .from('agent_definitions')
        .select('id, name, icon')
        .in('id', agentIds)

      if (agents) {
        agentMap = Object.fromEntries(agents.map(a => [a.id, { name: a.name, icon: a.icon }]))
      }
    }

    const allBatches = batches || []
    const totalBatches = allBatches.length
    const completedBatches = allBatches.filter(b => 
      b.status === 'completed' || b.status === 'completed_with_errors'
    ).length
    const totalRowsProcessed = allBatches.reduce((sum, b) => sum + (b.processed_rows || 0), 0)
    const successRate = totalBatches > 0 ? Math.round((completedBatches / totalBatches) * 100) : 0

    // Calculate processing metrics
    const completedBatchesWithTime = allBatches.filter(b => 
      (b.status === 'completed' || b.status === 'completed_with_errors') && 
      b.created_at && b.updated_at
    )
    
    let totalProcessingTime = 0
    let totalRowsForSpeed = 0
    
    completedBatchesWithTime.forEach(batch => {
      const startTime = new Date(batch.created_at).getTime()
      const endTime = new Date(batch.updated_at).getTime()
      const duration = (endTime - startTime) / 1000 // seconds
      if (duration > 0 && batch.processed_rows) {
        totalProcessingTime += duration
        totalRowsForSpeed += batch.processed_rows
      }
    })

    const averageProcessingTime = completedBatchesWithTime.length > 0 
      ? totalProcessingTime / completedBatchesWithTime.length 
      : 0
    
    const rowsPerSecond = totalProcessingTime > 0 
      ? totalRowsForSpeed / totalProcessingTime 
      : 0

    // Fetch token usage from usage_tracking table
    const { data: tokenData, error: tokenError } = await supabase
      .from('usage_tracking')
      .select('total_tokens')
      .eq('user_id', user.id)

    // Token usage tracking
    if (tokenError) {
      logError(new Error(`Error fetching token data: ${tokenError.message}`), {
        source: 'dashboard-stats',
      })
    }

    const totalTokens = (tokenData || []).reduce((sum, usage) => {
      return sum + (usage.total_tokens || 0)
    }, 0)

    const resourceCounts = {
      leads: 0,
      keywords: 0,
      content: 0,
      campaigns: 0,
    }

    // Include recent batches - agent info from agentMap
    const recentBatches = allBatches.slice(0, 5).map(b => {
      const agentInfo = b.agent_id ? agentMap[b.agent_id] : null
      return {
        id: b.id,
        csv_filename: b.csv_filename || `${agentInfo?.name || 'Agent'} Run`,
        status: b.status,
        created_at: b.created_at,
        total_rows: b.total_rows || 0,
        processed_rows: b.processed_rows || 0,
        agent_id: b.agent_id || null,
        agent_name: agentInfo?.name || null,
        agent_icon: agentInfo?.icon || null,
      }
    })

    return createSuccessResponse({
      totalBatches,
      completedBatches,
      totalRowsProcessed,
      successRate,
      averageProcessingTime,
      totalTokens,
      rowsPerSecond,
      resourceCounts,
      recentBatches,
    })
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error : new BulkGPTError('UNKNOWN_ERROR', String(error)),
      500,
      { endpoint: '/api/dashboard/stats' }
    )
  }
}

