/**
 * ABOUTME: Skeleton loader component - placeholder loading state for tables
 * ABOUTME: Shows shimmer animation while content is being fetched
 */

'use client'

interface SkeletonLoaderProps {
  rows?: number
  columns?: number
}

export function SkeletonLoader({ rows = 3, columns = 3 }: SkeletonLoaderProps) {
  return (
    <div className="p-6 space-y-4 animate-fade-in">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 bg-accent/50 rounded animate-pulse" />
        <div className="h-8 w-20 bg-accent/50 rounded animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary/50 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left w-8">
                <div className="h-3 w-6 bg-accent/50 rounded animate-pulse" />
              </th>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3 text-left">
                  <div className="h-3 w-20 bg-accent/50 rounded animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-secondary/40' : 'bg-transparent'}>
                <td className="px-4 py-3">
                  <div className="h-3 w-6 bg-accent/50 rounded animate-pulse" />
                </td>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="px-4 py-3">
                    <div
                      className="h-3 bg-accent/50 rounded animate-pulse"
                      style={{ width: `${60 + Math.random() * 40}%` }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Loading message */}
      <div className="flex items-center justify-center gap-2 py-4">
        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse animation-delay-150" />
        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse animation-delay-300" />
        <span className="text-xs text-muted-foreground ml-2">Preparing your data...</span>
      </div>
    </div>
  )
}
