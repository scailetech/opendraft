import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * Server-side Supabase client
 * Note: This is async - use await createClient() in async functions
 */
export async function createClient() {
  return await createServerSupabaseClient()
}

