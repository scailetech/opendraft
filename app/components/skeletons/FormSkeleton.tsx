/**
 * Form skeleton loader for profile forms and other form-based pages
 * Matches exact dimensions of actual form fields
 */

import { Skeleton } from '@/components/ui/skeleton'

interface FormSkeletonProps {
  fields?: number
  showActions?: boolean
}

export function FormSkeleton({ fields = 4, showActions = true }: FormSkeletonProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          {/* Label skeleton - matches Label component */}
          <Skeleton className="h-3 w-20" />
          {/* Input skeleton - matches Input height (h-9) */}
          <Skeleton className="h-9 w-full rounded-md" />
          {/* Helper text skeleton - only show for some fields */}
          {i === 0 && <Skeleton className="h-3 w-32" />}
          {i === fields - 1 && <Skeleton className="h-3 w-40" />}
        </div>
      ))}
      {showActions && (
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          {/* Primary button skeleton */}
          <Skeleton className="h-10 flex-1 rounded-md" />
          {/* Secondary button skeleton */}
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>
      )}
    </div>
  )
}

