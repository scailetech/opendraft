/**
 * File list skeleton loader for context files and file upload lists
 * Matches exact dimensions of file list items
 */

import { Skeleton } from '@/components/ui/skeleton'

interface FileListSkeletonProps {
  count?: number
}

export function FileListSkeleton({ count = 3 }: FileListSkeletonProps) {
  return (
    <div className="space-y-2 animate-fade-in">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-3 border border-border rounded-md bg-secondary/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            {/* Icon skeleton - matches FileText icon size */}
            <Skeleton className="h-4 w-4 rounded flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-1">
              {/* File name skeleton */}
              <Skeleton className="h-3 w-32 rounded" />
              {/* File metadata skeleton */}
              <Skeleton className="h-2 w-24 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

