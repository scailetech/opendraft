/**
 * Business Context API - Get and update user's business context
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/utils/logger'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('business_contexts')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No business context yet
        return NextResponse.json({ context: null })
      }
      // If table doesn't exist in schema cache (PGRST205) or error message indicates missing table
      if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('Could not find the table')) {
        return NextResponse.json({ context: null })
      }
      logError('Error fetching business context', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ context: data })
  } catch (error) {
    logError('Unexpected error fetching business context', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Check if business context exists
    const { data: existing } = await supabase
      .from('business_contexts')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('business_contexts')
        .update({
          icp: body.icp || null,
          countries: body.countries || [],
          products: body.products || [],
          target_keywords: body.target_keywords || [],
          competitor_keywords: body.competitor_keywords || [],
        })
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        logError('Error updating business context', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ context: data })
    } else {
      // Create new
      const { data, error } = await supabase
        .from('business_contexts')
        .insert({
          user_id: user.id,
          icp: body.icp || null,
          countries: body.countries || [],
          products: body.products || [],
          target_keywords: body.target_keywords || [],
          competitor_keywords: body.competitor_keywords || [],
        })
        .select()
        .single()

      if (error) {
        logError('Error creating business context', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ context: data }, { status: 201 })
    }
  } catch (error) {
    logError('Unexpected error updating business context', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}


