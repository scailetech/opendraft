/**
 * Skeleton loader for BulkProcessor component
 * Matches the actual layout structure for better UX
 */

'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function BulkProcessorSkeleton() {
  return (
    <div className="h-full bg-background text-foreground flex flex-col">
      {/* Main Content Skeleton */}
      <div className="flex-1 overflow-hidden min-h-0">
        <div className="h-full overflow-hidden bg-card">
          {/* Mobile: Tabs layout skeleton */}
          <div className="md:hidden h-full flex flex-col">
            <div className="w-full border-b border-border bg-secondary/50 p-1 flex gap-1">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 flex-1" />
            </div>
            <div className="flex-1 overflow-y-auto px-4 pt-5 pb-4 space-y-4 bg-secondary/20">
              <Skeleton className="h-32 w-full rounded-md" />
              <Skeleton className="h-48 w-full rounded-md" />
              <Skeleton className="h-24 w-full rounded-md" />
            </div>
          </div>

          {/* Desktop: Side-by-side panels skeleton */}
          <div className="hidden md:grid h-full grid-cols-2 overflow-hidden">
            {/* Left Panel - Configuration */}
            <div className="h-full border-r border-border/40 bg-secondary/20 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto px-4 lg:px-5 pt-5 lg:pt-6 pb-4 lg:pb-5 space-y-4 min-h-0">
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
              {/* Action buttons skeleton */}
              <div className="flex-shrink-0 px-4 py-3 border-t border-border/50 bg-background/80">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-9 w-9 rounded-md" />
                    <Skeleton className="h-9 w-9 rounded-md" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-24 rounded-lg" />
                    <Skeleton className="h-10 w-24 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Results */}
            <div className="h-full bg-background flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-4">
                <div className="h-full flex items-center justify-center">
                  <Skeleton className="h-32 w-48 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

