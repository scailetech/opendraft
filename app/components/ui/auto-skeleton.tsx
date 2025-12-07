/**
 * AutoSkeleton Component
 * 
 * Automatically generates skeleton loaders from actual component structure.
 * Follows DRY, SOLID, and KISS principles:
 * - DRY: No duplicate skeleton code to maintain
 * - SOLID: Single responsibility - skeleton generation
 * - KISS: Simple wrapper component
 * 
 * Usage:
 * <AutoSkeleton isLoading={isLoading}>
 *   <YourActualComponent />
 * </AutoSkeleton>
 * 
 * The skeleton will automatically match the structure and dimensions of YourActualComponent.
 */

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AutoSkeletonProps {
  isLoading: boolean
  children: ReactNode
  className?: string
  /** Optional: Custom skeleton fallback if auto-generation doesn't work well */
  fallback?: ReactNode
}

export function AutoSkeleton({ 
  isLoading, 
  children, 
  className,
  fallback 
}: AutoSkeletonProps) {
  if (!isLoading) {
    return <>{children}</>
  }

  // Use custom fallback if provided, otherwise use CSS-based auto-skeleton
  if (fallback) {
    return <>{fallback}</>
  }

  return (
    <div 
      className={cn('skeleton-auto', className)} 
      aria-busy="true" 
      aria-live="polite"
      aria-label="Loading content"
    >
      {children}
    </div>
  )
}

