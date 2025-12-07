/**
 * ABOUTME: Auth context that provides user state across the app
 * ABOUTME: Eliminates duplicate supabase.auth.getUser() calls - fetch once, share everywhere
 */

'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AuthContextValue {
  user: User | null
  loading: boolean
  userEmail: string | null
  userAvatar: string | null
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  userEmail: null,
  userAvatar: null,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    if (!supabase) {
      setLoading(false)
      return
    }

    // Initial user fetch
    supabase.auth.getUser().then(({ data, error }) => {
      if (!error && data.user) {
        setUser(data.user)
      }
      setLoading(false)
    })

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Derive email and avatar from user
  const userEmail = user?.email || null
  const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null

  return (
    <AuthContext.Provider value={{ user, loading, userEmail, userAvatar }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

