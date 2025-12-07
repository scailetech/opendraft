'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { logError } from '@/lib/errors'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { validatePassword } from '@/lib/validation/auth'

function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const supabase = createClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!password || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (!validatePassword(password)) {
      setError('Password must be at least 8 characters and contain both letters and numbers')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!supabase) {
      setError('Authentication service unavailable')
      return
    }

    try {
      setIsLoading(true)

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        throw updateError
      }

      setSuccess(true)
      trackEvent(ANALYTICS_EVENTS.PASSWORD_RESET_COMPLETED)

      // Redirect to sign-in after 2 seconds
      setTimeout(() => {
        router.push('/auth')
      }, 2000)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password'
      setError(errorMessage)
      logError(err instanceof Error ? err : new Error(errorMessage), {
        source: 'ResetPasswordForm',
        action: 'resetPassword',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md bg-card border border-border rounded-lg overflow-hidden shadow-lg">
          <div className="px-6 py-6 text-center">
            <div className="mx-auto mb-4 flex justify-center">
              <Logo size="lg" showText={false} />
            </div>
            <h1 className="text-sm font-medium tracking-tight text-foreground mb-1">
              Password Reset Successful
            </h1>
            <p className="text-xs text-muted-foreground mb-4">
              Your password has been updated. Redirecting to sign in...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md bg-card border border-border rounded-lg overflow-hidden shadow-lg">
        <div className="px-6 py-6 text-center border-b border-border">
          <div className="mx-auto mb-4 flex justify-center">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="text-sm font-medium tracking-tight text-foreground mb-1">
            Reset Your Password
          </h1>
          <p className="text-xs text-muted-foreground">
            Enter your new password below
          </p>
        </div>
        <div className="px-6 py-6">
          <form onSubmit={handleResetPassword} className="space-y-4">
            {error && (
              <div
                id="form-error"
                role="alert"
                aria-live="polite"
                className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive"
              >
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  autocomplete="new-password"
                  aria-describedby={error ? 'form-error' : undefined}
                  aria-invalid={!!error}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center sm:min-w-0 sm:min-h-0"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters with letters and numbers
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-xs font-medium">
                Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  autocomplete="new-password"
                  aria-describedby={error ? 'form-error' : undefined}
                  aria-invalid={!!error}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center sm:min-w-0 sm:min-h-0"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full min-h-[44px] lg:min-h-0" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" />
                  Updating password...
                </>
              ) : (
                'Update Password'
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/auth')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors min-h-[44px] sm:min-h-0"
              >
                Back to sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md bg-card border border-border rounded-lg p-6 text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="text-sm font-medium tracking-tight text-foreground">Loading...</h1>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}

