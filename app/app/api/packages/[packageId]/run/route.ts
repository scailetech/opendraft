/**
 * API Route: Run Package
 * POST /api/packages/[packageId]/run - Execute pre-configured package run
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, createSuccessResponse, createUnauthorizedResponse, createNotFoundResponse } from '@/lib/api-response'
import { BulkGPTError, logError } from '@/lib/errors'

export async function POST(
  _request: NextRequest,
  { params }: { params: { packageId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createUnauthorizedResponse()
    }

    // Get package assignment for this client
    const { data: assignment, error: assignmentError } = await supabase
      .from('client_package_assignments')
      .select(`
        *,
        agency_packages (
          id,
          name,
          agent_configs,
          monthly_cost
        )
      `)
      .eq('client_user_id', user.id)
      .eq('package_id', params.packageId)
      .eq('status', 'active')
      .single()

    if (assignmentError || !assignment) {
      return createNotFoundResponse('Package assignment')
    }

    const packageData = assignment.agency_packages as { 
      name?: string
      agent_configs?: Array<{
        agent_id: string
        config: Record<string, unknown>
        schedule?: string
      }>
    }
    const agentConfigs = packageData.agent_configs || []

    // Create package runs for each agent config
    const packageRuns = []
    for (const agentConfig of agentConfigs) {
      // STUBBED: Create batch record (actual execution will be handled by Modal backend later)
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const { error: batchError } = await supabase
        .from('batches')
        .insert({
          id: batchId,
          user_id: user.id,
          status: 'pending',
          csv_filename: `package_${params.packageId}_${agentConfig.agent_id}_${Date.now()}.csv`,
          total_rows: 0,
          processed_rows: 0,
          prompt: `Package: ${packageData.name} - Agent: ${agentConfig.agent_id}`,
          agent_id: agentConfig.agent_id,
          agent_config: agentConfig.config,
        })
        .select()
        .single()

      if (batchError) {
        logError(new Error(`Error creating batch for package run: ${batchError.message}`), {
          agent_id: agentConfig.agent_id,
          package_id: params.packageId,
        })
        continue
      }

      // Create package run record
      const { data: packageRun, error: runError } = await supabase
        .from('package_runs')
        .insert({
          client_user_id: user.id,
          package_id: params.packageId,
          agent_id: agentConfig.agent_id,
          batch_id: batchId,
          config: agentConfig.config,
          status: 'running',
        })
        .select()
        .single()

      if (runError) {
        logError(new Error(`Error creating package run: ${runError.message}`), {
          agent_id: agentConfig.agent_id,
          package_id: params.packageId,
        })
        continue
      }

      packageRuns.push(packageRun)

      // Track usage (package runs are covered by subscription)
      // Note: Model and tokens are determined during actual execution by Modal backend
      // and will be updated when the batch completes via the webhook callback
      await supabase
        .from('usage_tracking')
        .insert({
          user_id: user.id,
          batch_id: batchId,
          agent_id: agentConfig.agent_id,
          usage_type: 'package',
          package_id: params.packageId,
          model: 'unknown', // Will be set during execution
          input_tokens: 0, // Updated when batch completes
          output_tokens: 0, // Updated when batch completes
          total_tokens: 0, // Updated when batch completes
          api_cost: 0,
          billing_amount: 0, // Covered by package subscription
          covered_by_credits: false,
        })
    }

    return createSuccessResponse({
      package_runs: packageRuns,
      message: 'Package execution queued (stubbed - Modal backend integration pending)',
    })
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error : new BulkGPTError('UNKNOWN_ERROR', String(error)),
      500,
      { endpoint: '/api/packages/[packageId]/run', packageId: params.packageId }
    )
  }
}

