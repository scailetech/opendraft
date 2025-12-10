/**
 * API Route: Generate Thesis
 * Creates thesis entry in theses table and triggers Modal processing
 * Supports both waitlist users (free) and direct generation (paid)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { authenticateRequest } from '@/lib/auth-middleware'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user (supports dev mode bypass)
    const userId = await authenticateRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // In dev mode, use service role to bypass RLS for mock user
    const isDev = process.env.NEXT_PUBLIC_DEV_MODE === 'true'
    const supabase = isDev
      ? createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } }
        )
      : await createServerClient()

    // Parse request body
    const body = await request.json()
    const {
      topic,
      language = 'en',
      academic_level = 'master',
      waitlist_id = null, // NULL for direct/paid generation
      author_name,
      institution,
      department,
      faculty,
      advisor,
      second_examiner,
      location,
      student_id,
    } = body

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    // Create thesis entry in theses table with "pending" status
    // Local worker (or Render worker) will poll for pending theses
    const { data: thesis, error: createError } = await supabase
      .from('theses')
      .insert({
        user_id: userId,
        waitlist_id,
        topic,
        language,
        academic_level,
        status: 'pending',  // Worker polls for 'pending' status
        current_phase: null,
        progress_percent: 0,
        author_name,
        institution,
        department,
        faculty,
        advisor,
        second_examiner,
        location,
        student_id,
      })
      .select()
      .single()

    if (createError) {
      console.error('Failed to create thesis:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    console.log(`📝 Created thesis: ${thesis.id} for user: ${userId} (status: pending)`)
    console.log(`✅ Worker will pick up thesis automatically (polls every 10s)`)

    return NextResponse.json({
      success: true,
      thesis_id: thesis.id,
      status: 'pending',
      message: 'Thesis generation started',
    })
  } catch (error) {
    console.error('Generate thesis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
