/**
 * API Route: Billing Usage Summary
 * GET /api/billing/usage - Get usage summary for current period
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
    const periodStart = searchParams.get('period_start')
    const periodEnd = searchParams.get('period_end')

    // Default to current month if not provided
    const now = new Date()
    const start = periodStart 
      ? new Date(periodStart)
      : new Date(now.getFullYear(), now.getMonth(), 1)
    const end = periodEnd
      ? new Date(periodEnd)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // Get user profile to check if client
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_type, agency_id')
      .eq('user_id', user.id)
      .single()

    // Get package assignment if client
    let creditInfo = null
    if (profile?.user_type === 'client') {
      const { data: assignment } = await supabase
        .from('client_package_assignments')
        .select('*')
        .eq('client_user_id', user.id)
        .eq('status', 'active')
        .single()

      if (assignment) {
        const remaining = assignment.included_self_service_credits + 
                         assignment.rolled_over_credits - 
                         assignment.used_self_service_credits

        creditInfo = {
          included_credits: Number(assignment.included_self_service_credits),
          used_credits: Number(assignment.used_self_service_credits),
          rolled_over_credits: Number(assignment.rolled_over_credits),
          remaining_credits: Math.max(0, remaining),
          overage_amount: remaining < 0 ? Math.abs(remaining) : 0,
        }
      }
    }

    // Get usage tracking for period
    const { data: usage, error } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    if (error) {
      logError('Error fetching usage', error)
      return NextResponse.json(
        { error: 'Failed to fetch usage' },
        { status: 500 }
      )
    }

    // Calculate summary
    const totalTokens = usage?.reduce((sum, u) => sum + u.total_tokens, 0) || 0
    const totalApiCost = usage?.reduce((sum, u) => sum + Number(u.api_cost), 0) || 0
    const totalBillingAmount = usage?.reduce((sum, u) => sum + Number(u.billing_amount), 0) || 0

    // Group by agent
    const usageByAgent: Record<string, { tokens: number; api_cost: number; billing_amount: number }> = {}
    usage?.forEach(u => {
      if (!u.agent_id) return
      if (!usageByAgent[u.agent_id]) {
        usageByAgent[u.agent_id] = { tokens: 0, api_cost: 0, billing_amount: 0 }
      }
      usageByAgent[u.agent_id].tokens += u.total_tokens
      usageByAgent[u.agent_id].api_cost += Number(u.api_cost)
      usageByAgent[u.agent_id].billing_amount += Number(u.billing_amount)
    })

    // Group by model
    const usageByModel: Record<string, { tokens: number; api_cost: number; billing_amount: number }> = {}
    usage?.forEach(u => {
      if (!usageByModel[u.model]) {
        usageByModel[u.model] = { tokens: 0, api_cost: 0, billing_amount: 0 }
      }
      usageByModel[u.model].tokens += u.total_tokens
      usageByModel[u.model].api_cost += Number(u.api_cost)
      usageByModel[u.model].billing_amount += Number(u.billing_amount)
    })

    return NextResponse.json({
      period_start: start.toISOString(),
      period_end: end.toISOString(),
      total_tokens: totalTokens,
      total_api_cost: totalApiCost,
      total_billing_amount: totalBillingAmount,
      usage_by_agent: usageByAgent,
      usage_by_model: usageByModel,
      credit_info: creditInfo,
    })
  } catch (error) {
    logError('Error in GET /api/billing/usage', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

