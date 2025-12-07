import { createServerSupabaseClient, supabaseAdmin } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getSiteUrl } from "@/lib/utils/get-site-url"
import { logAnalytics, logError } from "@/lib/utils/logger"

/**
 * SECURITY: Validate redirect path to prevent open redirects
 * Only allows relative paths starting with a single /
 */
function sanitizeRedirectPath(path: string | null | undefined): string {
  if (!path) return '/go'
  
  // Decode in case it's URL encoded
  let decoded = path
  try {
    decoded = decodeURIComponent(path)
  } catch {
    // If decode fails, use as-is
  }
  
  // Remove leading/trailing whitespace
  decoded = decoded.trim()
  
  // SECURITY: Only allow paths that:
  // 1. Start with exactly one forward slash
  // 2. Don't start with // (protocol-relative URLs)
  // 3. Don't contain :// (absolute URLs)
  // 4. Don't start with /\ (some browsers treat this as protocol-relative)
  if (
    !decoded.startsWith('/') ||
    decoded.startsWith('//') ||
    decoded.startsWith('/\\') ||
    decoded.includes('://')
  ) {
    return '/go'
  }
  
  return decoded
}

export async function GET(request: Request) {
  const { searchParams, origin: requestOrigin } = new URL(request.url)
  const code = searchParams.get("code")
  
  // Use configured site URL for production, fall back to request origin
  // This ensures redirects go to bulk.run, not Render's internal URL
  const siteUrl = getSiteUrl({ requestOrigin })
  
  // Try multiple sources for returnUrl: query param, Supabase state, or default
  // Note: LinkedIn OAuth doesn't support query params in redirect_uri, so we use cookies or default
  const cookieStore = await cookies()
  const storedReturnUrl = cookieStore.get('oauth_return_url')?.value
  // SECURITY: Sanitize the redirect path to prevent open redirect attacks
  const next = sanitizeRedirectPath(
    searchParams.get("next") ?? searchParams.get("returnUrl") ?? storedReturnUrl
  )

  if (!code) {
    return NextResponse.redirect(`${siteUrl}/auth?error=Missing authentication code`)
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    logError("Auth error", error)
    return NextResponse.redirect(`${siteUrl}/auth?error=${encodeURIComponent(error.message)}`)
  }

  if (!data?.session) {
    logError("No session created after OAuth exchange")
    return NextResponse.redirect(`${siteUrl}/auth?error=Failed to create session`)
  }

  const user = data?.user
  if (user?.id) {
    // Ensure user exists in public.users table (upsert to handle existing users)
    // LinkedIn OAuth may not provide email immediately, so use user metadata
    const userEmail = user.email || user.user_metadata?.email || user.user_metadata?.preferred_username
    
    // Extract LinkedIn profile picture from user metadata
    // LinkedIn OAuth provides profile picture in user_metadata.picture or user_metadata.avatar_url
    const linkedInAvatarUrl = user.user_metadata?.picture || user.user_metadata?.avatar_url || null
    
    try {
      // Check if user already exists to determine if this is a sign-up or sign-in
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()
      
      const isNewUser = !existingUser
      
      // Always use LinkedIn avatar URL if provided (user is authenticating with LinkedIn)
      // This ensures profile picture stays in sync with LinkedIn
      await supabaseAdmin
        .from('users')
        .upsert({
          id: user.id,
          email: userEmail || null,
          avatar_url: linkedInAvatarUrl,
          created_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        })
      
      // Track sign-up or sign-in event (logged for analytics)
      // New users can be identified by checking created_at timestamp in users table
      if (isNewUser) {
        logAnalytics('user_signed_up', {
          userId: user.id,
          email: userEmail || undefined,
          provider: 'linkedin',
        })
      } else {
        logAnalytics('user_signed_in', {
          userId: user.id,
          email: userEmail || undefined,
          provider: 'linkedin',
        })
      }
    } catch (err) {
      logError('Error creating user record', err)
      // Don't fail the auth flow, just log the error
    }
  }

  // SECURITY: next is already sanitized by sanitizeRedirectPath(), just normalize root to /go
  const normalizedNext = next === "/" ? "/go" : next
  const redirectUrl = `${siteUrl}${normalizedNext}`

  // Create response and ensure cookies are properly set
  // The Supabase client should have already set cookies via setAll callback
  const response = NextResponse.redirect(redirectUrl)
  
  // Clean up the oauth_return_url cookie after use
  response.cookies.delete('oauth_return_url')
  
  // Ensure session cookies are preserved with correct domain
  // Supabase SSR client handles this, but we ensure redirect uses same origin
  return response
}


