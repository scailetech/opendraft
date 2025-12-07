import { useCallback } from 'react'
import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { createClient } from '@/lib/supabase/client'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  organization: string | null
}

const fetcher = async (): Promise<UserProfile | null> => {
  const supabase = createClient()
  if (!supabase) {
    throw new Error('Supabase client not configured')
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user) {
    if (authError) {
      console.error('Error fetching auth user:', authError)
    }
    return null
  }

  // Ensure we have email from auth user
  const userEmail = user.email || user.user_metadata?.email || ''
  if (!userEmail) {
    console.warn('User email not found in auth user:', user.id)
  }

  // Fetch user profile from public.users table
  const { data, error: fetchError } = await supabase
    .from('users')
    .select('id, full_name, avatar_url, organization')
    .eq('id', user.id)
    .single()

  if (fetchError) {
    // User might not exist in public.users yet
    if (fetchError.code === 'PGRST116') {
      // Create user record
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: user.id,
        })
        .select('id, full_name, avatar_url, organization')
        .single()

      if (createError) throw createError
      // Return with email from auth user
      return {
        ...newUser,
        email: userEmail,
      }
    } else {
      throw fetchError
    }
  }

  // Return with email from auth user (email is in auth.users, not public.users)
  return {
    ...data,
    email: userEmail,
  }
}

export function useProfile() {
  const { data: profile, isLoading, error, mutate } = useSWR<UserProfile | null>(
    'profile',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5000,
      revalidateIfStale: false, // Don't revalidate stale data automatically (use cache)
      keepPreviousData: true,
      revalidateOnMount: false, // Don't revalidate on mount if we have cached data
    }
  )

  const { trigger: updateProfile } = useSWRMutation(
    'profile',
    async (_key, { arg }: { arg: Partial<UserProfile> }) => {
      const supabase = createClient()
      if (!supabase || !profile) {
        throw new Error('Cannot update profile')
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          ...arg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (updateError) throw updateError

      // Optimistically update cache
      mutate(
        (current) => current ? { ...current, ...arg } : null,
        false
      )

      return { ...profile, ...arg }
    }
  )

  const updateProfileData = useCallback(
    async (updates: Partial<UserProfile>) => {
      try {
        await updateProfile(updates)
        return true
      } catch (error) {
        // Rollback on error
        mutate()
        throw error
      }
    },
    [updateProfile, mutate]
  )

  return {
    profile,
    isLoading,
    error,
    updateProfile: updateProfileData,
    refreshProfile: mutate,
  }
}

