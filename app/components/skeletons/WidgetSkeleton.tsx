/**
 * Widget skeleton loader for analytics widgets
 * Matches widget card structure
 */

import { Skeleton } from '@/components/ui/skeleton'

interface WidgetSkeletonProps {
  showIcon?: boolean
  showStats?: boolean
  showChart?: boolean
}

export function WidgetSkeleton({ showIcon = true, showStats = true, showChart = false }: WidgetSkeletonProps) {
  return (
    <div className="p-4 border border-border rounded-lg bg-card space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showIcon && <Skeleton className="h-4 w-4 rounded" />}
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
      
      {/* Stats */}
      {showStats && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      )}
      
      {/* Chart */}
      {showChart && (
        <div className="h-[120px]">
          <Skeleton className="h-full w-full rounded" />
        </div>
      )}
    </div>
  )
}


