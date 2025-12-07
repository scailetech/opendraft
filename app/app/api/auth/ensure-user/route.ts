import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, createServerSupabaseClient } from '@/lib/supabase'
import { logError } from '@/lib/utils/logger'

/**
 * POST /api/auth/ensure-user
 * SECURITY: This endpoint ensures a user record exists after authentication.
 * It verifies the caller is the authenticated user before creating/updating records.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    // SECURITY: Verify the request comes from an authenticated user
    const supabase = await createServerSupabaseClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, email } = await request.json()

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 })
    }

    // SECURITY: Verify the userId matches the authenticated user
    // This prevents users from creating records for other users
    if (userId !== authData.user.id) {
      logError('User ID mismatch in ensure-user', null, { 
        providedUserId: userId, 
        authenticatedUserId: authData.user.id 
      })
      return NextResponse.json({ error: 'Forbidden - User ID mismatch' }, { status: 403 })
    }

    // Upsert user record (only for the authenticated user)
    const { error } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      })

    if (error) {
      logError('Error ensuring user exists', error, { userId, email })
      return NextResponse.json({ error: 'Failed to create user record' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logError('Error in ensure-user', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

