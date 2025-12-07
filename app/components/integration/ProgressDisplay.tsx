/**
 * ProgressDisplay Component
 * 
 * Pre-integrated progress display with accurate percentage calculation.
 * Fixes the "100.0%" issue when batch is incomplete.
 * 
 * Usage:
 * ```tsx
 * <ProgressDisplay
 *   processed={4}
 *   total={5}
 *   showCount={true}
 * />
 * // Output: "4/5 (80%)" instead of "4/5 (100.0%)"
 * ```
 */

'use client'

import React from 'react'
import { formatProgress, formatProgressWithCount } from '@/lib/utils/progress-calculator'

interface ProgressDisplayProps {
  /** Number of items processed */
  processed: number
  /** Total number of items */
  total: number
  /** Whether to show count (e.g., "4/5 (80%)") */
  showCount?: boolean
  /** Additional className */
  className?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

export function ProgressDisplay({
  processed,
  total,
  showCount = true,
  className = '',
  size = 'md',
}: ProgressDisplayProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  const displayText = showCount
    ? formatProgressWithCount(processed, total)
    : formatProgress(processed, total)

  return (
    <span className={`${sizeClasses[size]} ${className}`}>
      {displayText}
    </span>
  )
}

