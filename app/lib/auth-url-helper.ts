/**
 * Dynamic Auth URL Helper
 *
 * Automatically determines the correct redirect URL for Supabase auth
 * Works with any localhost port or production URL
 */

/**
 * Get the appropriate redirect URL for auth callbacks
 *
 * Development: Uses the actual request URL (works with any port)
 * Production: Uses the hardcoded production URL
 *
 * This avoids hardcoding localhost URLs while supporting any development port
 */
export function getAuthRedirectUrl(request?: Request | null): string {
  // In production, always use the hardcoded URL
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_URL) {
    return 'https://www.bulk-gpt.com'
  }

  // In development, try to get the actual URL from the request
  if (request) {
    try {
      const url = new URL(request.url)
      return `${url.protocol}//${url.host}`
    } catch {
      // Fallback if URL parsing fails
    }
  }

  // Fallback for development (browser-side or when request unavailable)
  // This uses whatever port the dev server is actually running on
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  // Last resort fallback
  return 'http://localhost:3000'
}

/**
 * Get auth callback path
 * Supabase redirects to this path after authentication
 */
export const AUTH_CALLBACK_PATH = '/auth/callback'

/**
 * Get full callback URL for Supabase to redirect to
 */
export function getAuthCallbackUrl(request?: Request | null): string {
  return `${getAuthRedirectUrl(request)}${AUTH_CALLBACK_PATH}`
}
