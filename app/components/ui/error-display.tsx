/**
 * ErrorDisplay Component
 * 
 * Reusable error display component with retry functionality.
 * Provides consistent error messaging across the application.
 */

'use client'

import React from 'react'
import { AlertCircle, RefreshCw, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ErrorDisplayVariant = 'default' | 'inline' | 'banner' | 'card'

interface ErrorDisplayProps {
  /** Error message to display */
  message: string
  /** Optional error title */
  title?: string
  /** Emoji to display instead of icon */
  emoji?: string
  /** Callback when retry is clicked */
  onRetry?: () => void | Promise<void>
  /** Whether retry is in progress */
  isRetrying?: boolean
  /** Variant style */
  variant?: ErrorDisplayVariant
  /** Additional error details */
  details?: string | React.ReactNode
  /** Whether to show dismiss button */
  onDismiss?: () => void
  /** Additional className */
  className?: string
}

const variantStyles: Record<ErrorDisplayVariant, string> = {
  default: 'rounded-md bg-destructive/10 border border-destructive/20 p-4',
  inline: 'text-destructive text-sm',
  banner: 'rounded-md bg-destructive/10 border-l-4 border-destructive p-4',
  card: 'rounded-lg bg-card border border-destructive/20 p-6 shadow-sm',
}

/**
 * Reusable error display component with retry functionality.
 * 
 * Usage:
 * ```tsx
 * <ErrorDisplay
 *   message="Failed to load data"
 *   onRetry={handleRetry}
 *   variant="banner"
 * />
 * ```
 */
export function ErrorDisplay({
  message,
  title,
  emoji,
  onRetry,
  isRetrying = false,
  variant = 'default',
  details,
  onDismiss,
  className,
}: ErrorDisplayProps) {
  return (
    <div
      className={cn(
        variantStyles[variant],
        'space-y-3',
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        {emoji ? (
          <span className="text-xl flex-shrink-0" role="img" aria-hidden="true">{emoji}</span>
        ) : (
          <AlertCircle 
            className={cn(
              'h-5 w-5 text-destructive flex-shrink-0 mt-0.5',
              variant === 'inline' && 'h-4 w-4'
            )} 
            aria-hidden="true"
          />
        )}
        <div className="flex-1 space-y-1">
          {title && (
            <h3 className="text-sm font-semibold text-destructive">{title}</h3>
          )}
          <p className={cn(
            'text-sm text-destructive',
            variant === 'inline' && 'text-xs'
          )}>
            {message}
          </p>
          {details && (
            <div className={cn(
              'text-xs text-muted-foreground',
              typeof details === 'string' ? 'mt-1' : 'mt-2'
            )}>
              {details}
            </div>
          )}
        </div>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0"
            aria-label="Dismiss error"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        )}
      </div>

      {onRetry && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
            className="h-8"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                Retry
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

