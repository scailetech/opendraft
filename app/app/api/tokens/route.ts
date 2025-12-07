import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { logError } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/tokens
 * Get current user's session token for API access
 *
 * Returns the session access_token which can be used as Bearer token
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      token: session.access_token,
      expires_at: session.expires_at,
      user: {
        id: session.user.id,
        email: session.user.email,
      },
    })
  } catch (error) {
    logError('Token error', error)
    return NextResponse.json(
      { error: 'Failed to get token' },
      { status: 500 }
    )
  }
}
