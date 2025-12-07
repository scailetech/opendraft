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
    console.error('Showcase page error:', error)
  }, [error])

  return (
    <div className="container mx-auto p-6">
      <ErrorDisplay
        message={error.message || 'Something went wrong loading the showcase'}
        title="Error Loading Component Showcase"
        onRetry={reset}
        variant="card"
        details={error.digest ? `Error ID: ${error.digest}` : undefined}
      />
    </div>
  )
}

