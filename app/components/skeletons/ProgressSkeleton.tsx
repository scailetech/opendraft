/**
 * Progress bar skeleton loader for usage stats and progress indicators
 * Matches exact dimensions of progress bars
 */

import { Skeleton } from '@/components/ui/skeleton'

interface ProgressSkeletonProps {
  count?: number
  showLabels?: boolean
}

export function ProgressSkeleton({ count = 2, showLabels = true }: ProgressSkeletonProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          {showLabels && (
            <div className="flex items-center justify-between">
              {/* Label with icon space */}
              <Skeleton className="h-3 w-24 rounded" />
              {/* Value skeleton */}
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          )}
          {/* Progress bar skeleton - matches h-2 height */}
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  )
}

