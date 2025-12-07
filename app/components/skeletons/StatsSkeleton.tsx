/**
 * Stats skeleton loader for stat cards and metrics
 * Matches exact dimensions of stat cards
 */

import { Skeleton } from '@/components/ui/skeleton'

interface StatsSkeletonProps {
  count?: number
}

export function StatsSkeleton({ count = 4 }: StatsSkeletonProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border border-border rounded-lg p-4 bg-secondary/30 transition-colors"
        >
          {/* Label skeleton */}
          <Skeleton className="h-3 w-20 mb-2 rounded" />
          {/* Value skeleton - matches stat number size */}
          <Skeleton className="h-8 w-24 mb-1 rounded" />
          {/* Description skeleton */}
          <Skeleton className="h-2 w-32 rounded" />
        </div>
      ))}
    </div>
  )
}

