'use client'

import { ErrorDisplay } from '@/components/ui/error-display'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Authenticated route error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <ErrorDisplay
          message={error.message || 'Something went wrong'}
          title="Page Error"
          onRetry={reset}
          variant="card"
          details={error.digest ? `Error ID: ${error.digest}` : undefined}
        />
      </div>
    </div>
  )
}

