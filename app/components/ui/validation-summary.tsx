/**
 * ValidationSummary Component
 * 
 * Displays a summary of all validation errors in a form.
 * Provides a quick overview of what needs to be fixed.
 */

import { AlertCircle, X, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface ValidationError {
  /** Field ID or identifier */
  field: string
  /** Error message */
  message: string
  /** Optional: Scroll to field on click */
  scrollToField?: () => void
}

interface ValidationSummaryProps {
  /** Array of validation errors */
  errors: ValidationError[]
  /** Optional title */
  title?: string
  /** Whether to show success state when no errors */
  showSuccess?: boolean
  /** Success message */
  successMessage?: string
  /** Additional className */
  className?: string
  /** Callback when dismissed */
  onDismiss?: () => void
  /** Whether summary is dismissible */
  dismissible?: boolean
}

export function ValidationSummary({
  errors,
  title = 'Please fix the following issues',
  showSuccess = false,
  successMessage = 'All fields are valid',
  className,
  onDismiss,
  dismissible = false,
}: ValidationSummaryProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) {
    return null
  }

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  // Show success state if no errors and showSuccess is true
  if (errors.length === 0 && showSuccess) {
    return (
      <div
        className={cn(
          'rounded-lg border border-green-500/20 bg-green-500/10 p-4 space-y-2',
          className
        )}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1">
            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-green-500">{successMessage}</p>
            </div>
          </div>
          {dismissible && (
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-green-500/60 hover:text-green-500 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    )
  }

  // Don't render if no errors
  if (errors.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-destructive/20 bg-destructive/10 p-4 space-y-2',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-destructive mb-2">{title}</p>
            <ul className="space-y-1.5">
              {errors.map((error, index) => (
                <li key={error.field || index} className="flex items-start gap-2">
                  <span className="text-destructive/80 text-xs">•</span>
                  <button
                    onClick={error.scrollToField}
                    className={cn(
                      'text-xs text-destructive/90 hover:text-destructive text-left transition-colors',
                      error.scrollToField && 'underline cursor-pointer'
                    )}
                  >
                    {error.message}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-destructive/60 hover:text-destructive transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

