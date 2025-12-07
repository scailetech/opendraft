// ABOUTME: Authentication form component - LinkedIn OAuth + optional email auth
// ABOUTME: Clean single-purpose component for OAuth login

'use client'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { logError } from '@/lib/errors'
import { signInWithLinkedIn } from '@/lib/auth/linkedin'
import { useSearchParams } from 'next/navigation'

interface AuthFormProps {
  returnUrl?: string
}

export function AuthForm({ returnUrl = '/go' }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showEmailAuth, setShowEmailAuth] = useState(false)
  const searchParams = useSearchParams()

  // Enable email auth ONLY on localhost when ?test=1 is in URL
  // Production only allows LinkedIn OAuth
  useEffect(() => {
    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    
    if (isLocalhost && searchParams.get('test') === '1') {
      setShowEmailAuth(true)
    }
  }, [searchParams])

  const supabase = createClient()

  const handleSignInWithLinkedIn = async () => {
    if (!supabase) {
      setError('Authentication service unavailable')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Store returnUrl in cookie to restore after OAuth callback
      document.cookie = `oauth_return_url=${encodeURIComponent(returnUrl)}; path=/; max-age=600; SameSite=Lax`
      
      const data = await signInWithLinkedIn(supabase)

      if (data?.url) {
        window.location.href = data.url
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in with LinkedIn'
      setError(errorMessage)
      logError(err instanceof Error ? err : new Error(errorMessage), {
        source: 'AuthForm',
        action: 'signInWithLinkedIn',
      })
      setIsLoading(false)
    }
  }

  const handleEmailSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!supabase) {
      setError('Authentication service unavailable')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Use FormData to get values from DOM (works with browser automation)
      const formData = new FormData(e.currentTarget)
      const formEmail = formData.get('email') as string
      const formPassword = formData.get('password') as string

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formEmail,
        password: formPassword,
      })

      if (signInError) {
        setError(signInError.message)
        setIsLoading(false)
        return
      }

      // Redirect on success
      window.location.href = returnUrl
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in'
      setError(errorMessage)
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive"
        >
          {error}
        </div>
      )}

      <Button
        type="button"
        onClick={handleSignInWithLinkedIn}
        disabled={isLoading}
        className="w-full min-h-[44px] bg-[#0A66C2] hover:bg-[#004182] text-white"
      >
        {isLoading ? (
          <>
            <div className="mr-2 h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" />
            Connecting...
          </>
        ) : (
          <>
            <svg
              className="mr-2 h-4 w-4"
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            Continue with LinkedIn
          </>
        )}
      </Button>

      {/* Email auth - only shown when ?test=1 */}
      {showEmailAuth && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Test Mode</span>
            </div>
          </div>

          <form onSubmit={handleEmailSignIn} className="space-y-3">
            <input
              type="email"
              name="email"
              placeholder="Email"
              defaultValue={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              defaultValue={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
              required
            />
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[44px]"
              variant="outline"
            >
              {isLoading ? 'Signing in...' : 'Sign in with Email'}
            </Button>
          </form>
        </>
      )}
    </div>
  )
}
