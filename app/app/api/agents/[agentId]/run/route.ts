/**
 * API Route: Run Agent
 * POST /api/agents/[agentId]/run - Execute agent
 * REUSES: GTMAPIClient pattern from bulk agent
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AgentRunRequest } from '@/lib/types/agents'
import { logError, logDebug } from '@/lib/utils/logger'
import { analyzeAEOKeywords } from '@/lib/services/aeo-analytics'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
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

    // Verify agent exists
    const { data: agent, error: agentError } = await supabase
      .from('agent_definitions')
      .select('*')
      .eq('id', params.agentId)
      .eq('enabled', true)
      .single()

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found or disabled' },
        { status: 404 }
      )
    }

    const body: AgentRunRequest = await request.json()
    const { input_resource_ids, config, schedule } = body

    // Build agent_config with input_resource_ids if provided
    const agentConfig = {
      ...(config || {}),
      ...(input_resource_ids && input_resource_ids.length > 0 && { input_resource_ids }),
    }
    
    // ========================================================================
    // AEO Analytics Agent - REUSES GTM backend pattern from bulk agent
    // ========================================================================
    if (params.agentId === 'aeo_analytics') {
      try {
        // Get input keyword resources
        if (!input_resource_ids || input_resource_ids.length === 0) {
          return NextResponse.json(
            { error: 'Please select at least one keyword resource' },
            { status: 400 }
          )
        }

        const { data: keywordResources, error: resourcesError } = await supabase
          .from('resources')
          .select('id, data')
          .eq('type', 'keyword')
          .in('id', input_resource_ids)
          .eq('user_id', user.id)

        if (resourcesError || !keywordResources || keywordResources.length === 0) {
          return NextResponse.json(
            { error: 'Invalid or missing keyword resources' },
            { status: 400 }
          )
        }

        // Get user session token for GTM authentication (REUSE bulk agent pattern)
        const { data: { session } } = await supabase.auth.getSession()
        const authToken = session?.access_token || ''

        if (!authToken) {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          )
        }

        // Get business context (optional, for domain)
        const { data: businessContext } = await supabase
          .from('business_contexts')
          .select('*')
          .eq('user_id', user.id)
          .single()

        logDebug('[AEO] Starting AEO analytics', {
          keywordCount: keywordResources.length,
          domain: config?.domain || businessContext?.domain,
        })

        // Call AEO analytics service (REUSES GTMAPIClient)
        const aeoResults = await analyzeAEOKeywords(
          {
            keywords: keywordResources.map((r) => ({
              id: r.id,
              keyword: (r.data as { keyword?: string }).keyword || '',
              domain: (config?.domain as string) || undefined,
            })),
            businessContext: {
              domain: (config?.domain as string) || businessContext?.domain || undefined,
              brand: businessContext?.brand || undefined,
            },
          },
          authToken
        )

        // Create batch record
        const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        const { error: batchError } = await supabase
          .from('batches')
          .insert({
            id: batchId,
            user_id: user.id,
            status: 'completed',
            csv_filename: `aeo_analytics_${Date.now()}.csv`,
            total_rows: aeoResults.length,
            processed_rows: aeoResults.length,
            prompt: `AEO Analytics: ${aeoResults.length} keywords`,
            agent_id: 'aeo_analytics',
            agent_config: agentConfig,
          })

        if (batchError) {
          logError('Error creating AEO batch', batchError)
          return NextResponse.json(
            { error: 'Failed to create batch' },
            { status: 500 }
          )
        }

        // Create analytics resources directly (REUSE resource creation pattern)
        const analyticsResources = aeoResults.map((result) => ({
          user_id: user.id,
          type: 'analytics' as const,
          data: {
            keyword: result.keyword,
            keywordId: result.keywordId,
            metrics: result.metrics,
            aeo_insights: result.aeo_insights,
            insights: result.insights,
            recommendations: result.recommendations,
            metadata: result.metadata,
          },
          source_type: 'generated' as const,
          source_name: 'AEO Analytics',
          batch_id: batchId,
          agent_id: 'aeo_analytics',
          related_resource_ids: [result.keywordId],
          tags: [`batch_${batchId}`, 'aeo_analytics'],
        }))

        const { error: insertError } = await supabaseAdmin
          .from('resources')
          .insert(analyticsResources)

        if (insertError) {
          logError('Error creating analytics resources', insertError)
          // Don't fail - batch is created, resources can be retried
        }

        // Track usage (estimate - GTM backend doesn't provide exact token counts)
        const estimatedTokens = aeoResults.length * 200 // Rough estimate per keyword
        await supabase
          .from('usage_tracking')
          .insert({
            user_id: user.id,
            batch_id: batchId,
            agent_id: 'aeo_analytics',
            usage_type: 'self_service',
            model: 'gtm-backend',
            input_tokens: estimatedTokens,
            output_tokens: estimatedTokens * 0.5,
            total_tokens: estimatedTokens * 1.5,
            api_cost: estimatedTokens * 0.00001, // Rough estimate
            billing_amount: estimatedTokens * 0.0001, // 10x markup
            covered_by_credits: false,
          })
          .then(({ error }) => {
            if (error) logError('Error tracking usage', error)
          })

        // Handle scheduling (REUSE existing pattern)
        if (schedule?.enabled && schedule.cron) {
          await supabase
            .from('scheduled_runs')
            .insert({
              user_id: user.id,
              agent_type: 'aeo_analytics',
              cron_expression: schedule.cron,
              status: 'active',
              action: 'run',
              name: `Scheduled AEO Analytics`,
              config: agentConfig,
            })
            .then(({ error }) => {
              if (error) logError('Error creating schedule', error)
            })
        }

        logDebug('[AEO] AEO analytics complete', {
          batchId,
          resourcesCreated: analyticsResources.length,
        })

        return NextResponse.json({
          batch_id: batchId,
          status: 'completed',
          message: `AEO analytics complete. Created ${analyticsResources.length} analytics resources.`,
        })
      } catch (error) {
        logError('Error in AEO analytics', error)
        return NextResponse.json(
          { error: 'Failed to run AEO analytics' },
          { status: 500 }
        )
      }
    }

    // ========================================================================
    // Default/Other Agents - STUBBED (existing code)
    // ========================================================================
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const { error: batchError } = await supabase
      .from('batches')
      .insert({
        id: batchId,
        user_id: user.id,
        status: 'pending',
        csv_filename: `agent_${params.agentId}_${Date.now()}.csv`,
        total_rows: 0,
        processed_rows: 0,
        prompt: `Agent: ${agent.name}`,
        agent_id: params.agentId,
        agent_config: agentConfig,
      })
      .select()
      .single()

    if (batchError) {
      logError('Error creating batch', batchError)
      return NextResponse.json(
        { error: 'Failed to create batch' },
        { status: 500 }
      )
    }

    // Track usage (placeholder values until Modal backend integration)
    // When Modal backend is integrated, actual token counts and costs will be:
    // - Retrieved from Modal execution response
    // - Calculated based on model pricing (input/output token rates)
    // - Billing amount calculated with markup (typically 10x API cost)
    // - Credit coverage checked against user's available credits
    const mockTokens = {
      input_tokens: 100,
      output_tokens: 50,
      total_tokens: 150,
    }

    const { error: usageError } = await supabase
      .from('usage_tracking')
      .insert({
        user_id: user.id,
        batch_id: batchId,
        agent_id: params.agentId,
        usage_type: 'self_service',
        // Placeholder: Will be replaced with actual model from Modal execution response
        model: 'gpt-4',
        input_tokens: mockTokens.input_tokens,
        output_tokens: mockTokens.output_tokens,
        total_tokens: mockTokens.total_tokens,
        // Placeholder: Will be calculated from actual API costs based on model pricing
        api_cost: 0.001,
        // Placeholder: Will be calculated with markup (typically 10x API cost)
        billing_amount: 0.01,
        // Placeholder: Will check user's available credits before execution
        covered_by_credits: false,
      })

    if (usageError) {
      logError('Error tracking usage', usageError)
      // Don't fail the request if usage tracking fails
    }

    // STUBBED: If schedule provided, create scheduled run
    if (schedule?.enabled && schedule.cron) {
      const { error: scheduleError } = await supabase
        .from('scheduled_runs')
        .insert({
          user_id: user.id,
          agent_type: params.agentId,
          cron_expression: schedule.cron,
          status: 'active',
          action: 'run',
          name: `Scheduled ${agent.name}`,
          config: agentConfig,
        })

      if (scheduleError) {
        logError('Error creating schedule', scheduleError)
        // Don't fail the request if scheduling fails
      }
    }

    return NextResponse.json({
      batch_id: batchId,
      status: 'queued',
      message: 'Agent execution queued (stubbed - Modal backend integration pending)',
    })
  } catch (error) {
    logError('Error in POST /api/agents/[agentId]/run', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

