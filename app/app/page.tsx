'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LandingPage } from '@/components/landing/LandingPage'

export default function HomePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // DEV MODE: Skip auth and go straight to /go for UI development
    if (process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
      console.log('[DEV MODE] Redirecting to /go without auth')
      router.push('/go')
      return
    }

    async function checkAuth() {
      try {
        const supabase = createClient()
        if (!supabase) {
          setIsLoading(false)
          return
        }

        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // User is authenticated, redirect to app
          setIsAuthenticated(true)
          router.push('/go')
        } else {
          // Not authenticated, show landing page
          setIsLoading(false)
        }
      } catch {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  // Show loading while checking auth
  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <span className="text-4xl animate-bounce">🤖</span>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show landing page for unauthenticated users
  return <LandingPage />
}
