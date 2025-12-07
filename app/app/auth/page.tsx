// ABOUTME: Authentication page - LinkedIn OAuth only
// ABOUTME: Redirects authenticated users, shows login for others

"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthForm } from "@/components/auth/AuthForm"
import { Logo } from "@/components/brand/Logo"
import { createClient } from "@/lib/supabase/client"

/** Validate returnUrl to prevent open redirect attacks */
function isValidReturnUrl(url: string): boolean {
  if (!url.startsWith('/') || url.startsWith('//')) return false
  if (url.includes(':')) return false
  return true
}

function AuthPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // Redirect if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        if (!supabase) {
          setIsCheckingAuth(false)
          return
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const returnUrl = searchParams.get('returnUrl') || '/go'
          router.replace(isValidReturnUrl(returnUrl) ? returnUrl : '/go')
          return
        }
      } catch {
        // Auth check failed, show login form
      }
      setIsCheckingAuth(false)
    }

    checkAuth()
  }, [router, searchParams])

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md bg-card border border-border rounded-lg p-6 text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <span className="text-4xl animate-bounce">👟</span>
          </div>
          <p className="text-sm text-muted-foreground">Getting ready...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Skip to main content
      </a>
      
      {/* Left side - Login form */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
        <div id="main-content" className="w-full max-w-md bg-card border border-border rounded-lg overflow-hidden shadow-lg" tabIndex={-1}>
          {/* Mobile marathon runners image - matches LinkedIn banner */}
          <div className="lg:hidden relative h-32 overflow-hidden">
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('/hero-runners.webp')` }}
            />
            <div className="absolute inset-0 bg-black/60" />
            {/* Text overlay - matches LinkedIn banner */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <h2 className="text-2xl font-bold tracking-tight">
                <span className="text-white">bulk</span>
                <span className="text-white/50">.run</span>
              </h2>
              <p className="text-white text-xs font-medium">
                Run AI on your data, <span className="text-green-400 font-semibold">1000x faster</span>
              </p>
            </div>
          </div>
          
          <div className="px-6 py-5 text-center">
            <p className="text-2xl mb-1">👋</p>
            <h1 className="text-base font-semibold text-foreground">Welcome</h1>
          </div>
          <div className="px-6 py-6">
            <AuthForm returnUrl={searchParams.get('returnUrl') || '/go'} />
          </div>
        </div>
      </div>

      {/* Right side - Marathon runners image (desktop only) */}
      {/* Photo by Quino Al on Unsplash - Málaga Marathon 2018 */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900" />
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('/hero-runners.webp')` }}
        />
        <div className="absolute inset-0 bg-black/50" />
        {/* Text overlay - matches LinkedIn banner */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12">
          <h2 className="text-4xl xl:text-5xl font-bold tracking-tight mb-4">
            <span className="text-white">bulk</span>
            <span className="text-white/50">.run</span>
          </h2>
          <p className="text-white text-xl xl:text-2xl font-medium">
            Run AI on your data, <span className="text-green-400 font-semibold">1000x faster</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md bg-card border border-border rounded-lg p-6 text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <Logo size="lg" showText={false} />
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  )
}
