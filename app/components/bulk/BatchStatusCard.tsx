/**
 * ABOUTME: Batch status card component - visual summary of batch processing progress
 * ABOUTME: Shows success/error/pending counts with enhanced progress visualization
 */

'use client'

import { memo, useMemo } from 'react'
import { StatusIcon } from '@/components/ui/status-icon'
import { ProgressBar } from '@/components/ui/progress-bar'

interface Progress {
  completed: number
  total: number
}

interface BatchStatusCardProps {
  progress?: Progress
  successCount: number
  errorCount: number
  estimatedSeconds?: number | null
  isTesting?: boolean
  testStartTime?: number
  processingStartTime?: number
  totalInputTokens?: number
  totalOutputTokens?: number
}

export const BatchStatusCard = memo(function BatchStatusCard({
  progress,
  successCount,
  errorCount,
  estimatedSeconds,
  isTesting = false,
  testStartTime,
  processingStartTime,
  totalInputTokens,
  totalOutputTokens
}: BatchStatusCardProps) {
  const testEstimatedDuration = estimatedSeconds ? estimatedSeconds * 1000 : 60000 // Use provided estimate or default 60s

  // Use progress.completed from EventSource for real-time updates (most accurate)
  // Fallback to successCount + errorCount if progress.completed is not available
  const actualCompleted = useMemo(() => {
    if (!progress) return 0
    return progress.completed !== undefined ? progress.completed : (successCount + errorCount)
  }, [progress, successCount, errorCount])
  // Calculate percentage - ensure it never exceeds 100% and shows accurate progress
  const progressPercentage = useMemo(() => {
    if (!progress || progress.total === 0) return 0
    // Only show up to 100% - don't show misleading percentages
    return Math.min(100, (actualCompleted / progress.total) * 100)
  }, [progress, actualCompleted])

  // For testing mode, show loading state with progress bar
  if (isTesting && !progress) {
    return (
      <div className="px-6 py-4 border-b border-border bg-gradient-to-br from-secondary/50 to-background/50">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Testing with first row...</p>
              <p className="text-xs text-muted-foreground">
                Processing AI response{estimatedSeconds ? ` (~${Math.ceil(estimatedSeconds)}s)` : ''}
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <ProgressBar
            isActive={isTesting && !progress}
            estimatedDuration={testEstimatedDuration}
            startTime={testStartTime}
            height="md"
          />
        </div>
      </div>
    )
  }

  if (!progress) return null

  return (
    <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border/40 bg-gradient-to-br from-secondary/30 to-background/30">
      {/* Status Summary - Compact */}
      <div className="mb-4">
        {/* Status Inline - Compact Row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-4 flex-1">
            {/* Success Count */}
            <div className="flex items-center gap-1.5">
              <StatusIcon variant="success" size="md" />
              <span className="text-xs text-muted-foreground">Success:</span>
              <span className="font-bold text-green-500">{successCount}</span>
            </div>

            {/* Failed Count */}
            {errorCount > 0 && (
              <div className="flex items-center gap-1.5">
                <StatusIcon variant="error" size="md" />
                <span className="text-xs text-muted-foreground">Failed:</span>
                <span className="font-bold text-red-500">{errorCount}</span>
              </div>
            )}
          </div>

          {/* Status Badge */}
          {actualCompleted >= progress.total ? (
            <span className="text-sm font-semibold text-green-500 whitespace-nowrap">✓ Complete</span>
          ) : null}
        </div>

        {/* Progress Info and Bar - Single Block */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              {actualCompleted} of {progress.total} processed
            </span>
            <span className="text-xs text-muted-foreground">
              {Math.round(progressPercentage)}%
            </span>
          </div>

          {/* Progress Bar */}
          <ProgressBar
            isActive={actualCompleted < progress.total}
            estimatedDuration={estimatedSeconds ? estimatedSeconds * 1000 : 60000}
            startTime={processingStartTime}
            actualProgress={actualCompleted > 0 ? progressPercentage : undefined}
            height="sm"
          />
        </div>
      </div>

      {/* Token Consumption - Inline */}
      {(totalInputTokens !== undefined && totalInputTokens > 0) || (totalOutputTokens !== undefined && totalOutputTokens > 0) ? (
        <div className="flex items-center gap-4 text-xs border-t border-border/30 pt-3">
          <span className="text-muted-foreground font-medium">Tokens:</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Input:</span>
              <span className="font-mono font-semibold text-foreground">{totalInputTokens?.toLocaleString() || 0}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Output:</span>
              <span className="font-mono font-semibold text-foreground">{totalOutputTokens?.toLocaleString() || 0}</span>
            </div>
            <div className="flex items-center gap-1.5 pl-2 border-l border-border/40">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-mono font-bold text-primary">
                {((totalInputTokens || 0) + (totalOutputTokens || 0)).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
})
