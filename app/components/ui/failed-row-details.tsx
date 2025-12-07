/**
 * FailedRowDetails Component
 * 
 * Displays error details and retry option for failed rows.
 * Addresses P2 issue: "Failed Row Details: Failed rows show no error details or retry option"
 */

'use client'

import React, { useState } from 'react'
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FailedRowDetailsProps {
  /** Error message to display */
  errorMessage?: string | null
  /** Row index or identifier */
  rowIndex?: number
  /** Callback when retry is clicked */
  onRetry?: () => void | Promise<void>
  /** Whether retry is in progress */
  isRetrying?: boolean
  /** Additional error details */
  errorDetails?: {
    code?: string
    timestamp?: string
    model?: string
  }
  /** Whether to show expandable details */
  expandable?: boolean
  /** Additional className */
  className?: string
}

/**
 * Displays error details and retry option for failed rows.
 * 
 * Usage:
 * ```tsx
 * <FailedRowDetails
 *   errorMessage="Failed to process row"
 *   rowIndex={3}
 *   onRetry={handleRetry}
 *   errorDetails={{ model: 'gpt-4', timestamp: '2025-01-16' }}
 * />
 * ```
 */
export function FailedRowDetails({
  errorMessage,
  rowIndex,
  onRetry,
  isRetrying = false,
  errorDetails,
  expandable = true,
  className,
}: FailedRowDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasError = !!errorMessage || !!errorDetails

  if (!hasError) {
    return null
  }

  const displayMessage = errorMessage || 'An error occurred while processing this row'

  return (
    <div className={cn('space-y-2', className)}>
      {/* Error Badge */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-xs font-medium">Failed</span>
        </div>
        
        {expandable && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 px-2 text-xs"
            aria-label={isExpanded ? 'Hide error details' : 'Show error details'}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Hide details
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Show details
              </>
            )}
          </Button>
        )}

        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
            className="h-6 px-2 text-xs"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </>
            )}
          </Button>
        )}
      </div>

      {/* Expanded Error Details */}
      {isExpanded && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-destructive">{displayMessage}</p>
              
              {errorDetails && (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {errorDetails.code && (
                    <div>
                      <span className="font-medium">Error Code:</span> {errorDetails.code}
                    </div>
                  )}
                  {errorDetails.model && (
                    <div>
                      <span className="font-medium">Model:</span> {errorDetails.model}
                    </div>
                  )}
                  {errorDetails.timestamp && (
                    <div>
                      <span className="font-medium">Time:</span> {errorDetails.timestamp}
                    </div>
                  )}
                </div>
              )}
              
              {rowIndex !== undefined && (
                <p className="text-xs text-muted-foreground">
                  Row {rowIndex + 1}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

