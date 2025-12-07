/**
 * Queue Status Card
 * Displays real-time queue position and estimated wait time
 * Shows while batch is waiting in queue
 */

'use client'

import { memo, useMemo } from 'react'
import { Users } from 'lucide-react'
import { ProgressBar } from '@/components/ui/progress-bar'
import type { QueueInfo } from '@/hooks/useBatchProcessor'

interface QueueStatusCardProps {
  queueInfo: QueueInfo | null
  isQueued: boolean
}

export const QueueStatusCard = memo(function QueueStatusCard({
  queueInfo,
  isQueued
}: QueueStatusCardProps) {
  // Calculate queue position progress (how many batches ahead)
  const positionProgress = useMemo(() => {
    if (!queueInfo || queueInfo.totalInQueue === 0) return 0
    // Show progress as position moved (1 = first in queue)
    return ((queueInfo.totalInQueue - queueInfo.position) / queueInfo.totalInQueue) * 100
  }, [queueInfo])

  if (!isQueued || !queueInfo) return null

  // Format wait time nicely
  const getWaitTimeDisplay = () => {
    const mins = queueInfo.estimatedWaitMinutes
    if (mins < 1) return 'Less than 1 minute'
    if (mins === 1) return '~1 minute'
    return `~${mins} minutes`
  }

  return (
    <div className="px-4 sm:px-6 py-2 sm:py-3 border-b border-border/60 bg-gradient-to-br from-blue-500/5 to-background/30 animate-slide-in-up">
      {/* Header + Status Inline */}
      <div className="flex items-center gap-3 mb-3">
        <div className="h-7 w-7 rounded-full border-2 border-blue-500 border-t-transparent animate-spin flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Batch Queued</h3>
          <p className="text-xs text-muted-foreground">Position: <span className="font-semibold text-blue-500">{queueInfo.position}</span> of {queueInfo.totalInQueue}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-muted-foreground">Est. Wait</p>
          <p className="text-sm font-semibold text-amber-500">{getWaitTimeDisplay()}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">Queue Progress</span>
          <span className="text-xs text-muted-foreground">
            {queueInfo.totalInQueue - queueInfo.position} ahead
          </span>
        </div>
        <ProgressBar
          isActive={isQueued}
          actualProgress={positionProgress}
          estimatedDuration={60000}
          height="sm"
        />
      </div>

      {/* Queue Stats - Inline */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground">{queueInfo.totalPending} pending</span>
          <span className="text-muted-foreground/50">•</span>
          <span className="text-muted-foreground">{queueInfo.processingCount} processing</span>
        </div>
      </div>
    </div>
  )
})
