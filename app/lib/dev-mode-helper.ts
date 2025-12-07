/**
 * ABOUTME: Dev mode helper for bypassing authentication during UI development
 * ABOUTME: Returns mock user data when DEV_MODE is enabled
 */

/**
 * Check if DEV_MODE is enabled and return mock user data
 * Use this in API routes that call supabase.auth.getUser() directly
 */
export function getDevModeUser() {
  if (process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
    console.log('[DEV MODE] Returning mock user for API route')
    return {
      id: 'dev-user-12345',
      email: 'dev@example.com',
      aud: 'authenticated',
      role: 'authenticated',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }
  return null
}

/**
 * Check if DEV_MODE is enabled
 */
export function isDevMode(): boolean {
  return process.env.NEXT_PUBLIC_DEV_MODE === 'true'
}
