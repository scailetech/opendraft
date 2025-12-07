// ABOUTME: LinkedIn OAuth authentication utility
// ABOUTME: Handles OAuth flow via Supabase

'use client'

import type { SupabaseClient } from '@supabase/supabase-js'
import { logError } from '@/lib/errors'
import { getAuthCallbackUrl } from '@/lib/utils/get-site-url'

/**
 * Signs in user with LinkedIn OAuth via Supabase
 */
export async function signInWithLinkedIn(supabase: SupabaseClient) {
  try {
    const redirectUrl = getAuthCallbackUrl()

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: redirectUrl,
        scopes: 'openid profile email',
      },
    })

    if (error) throw error

    return data
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), {
      source: 'signInWithLinkedIn',
      context: 'LinkedIn OAuth',
    })
    throw err
  }
}
