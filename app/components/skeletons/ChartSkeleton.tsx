/**
 * Chart skeleton loader for analytics charts
 * Matches chart container dimensions and structure
 */

import { Skeleton } from '@/components/ui/skeleton'

interface ChartSkeletonProps {
  height?: number
  showHeader?: boolean
  showLegend?: boolean
}

export function ChartSkeleton({ height = 200, showHeader = true, showLegend = false }: ChartSkeletonProps) {
  return (
    <div className="space-y-3 animate-fade-in">
      {showHeader && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
      )}
      <div className="relative" style={{ height: `${height}px` }}>
        {/* Chart area skeleton */}
        <Skeleton className="h-full w-full rounded-md" />
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between py-2">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-8" />
        </div>
        {/* X-axis labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-8 pb-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
      {showLegend && (
        <div className="flex items-center justify-center gap-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
      )}
    </div>
  )
}


