/**
 * Table skeleton loader for API keys, batches, and other table-based data
 * Matches exact dimensions of table rows
 */

import { Skeleton } from '@/components/ui/skeleton'

interface TableSkeletonProps {
  rows?: number
  columns?: number
  showHeader?: boolean
}

export function TableSkeleton({ rows = 3, columns = 3, showHeader = true }: TableSkeletonProps) {
  return (
    <div className="border border-border rounded-lg divide-y divide-border overflow-hidden animate-fade-in">
      {showHeader && (
        <div className="px-4 py-3 bg-secondary/50 border-b border-border">
          <div className="flex items-center gap-4">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-20 rounded" />
            ))}
          </div>
        </div>
      )}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className={`p-4 flex items-center gap-4 transition-colors ${
            rowIndex % 2 === 0 ? 'bg-secondary/30' : 'bg-transparent'
          }`}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className="h-3 rounded"
              style={{ width: `${60 + Math.random() * 40}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

