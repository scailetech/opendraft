/**
 * ABOUTME: Reusable animated progress bar component
 * ABOUTME: Used for AI optimization and test operations
 */

'use client'

import { useState, useEffect } from 'react'

interface ProgressBarProps {
  /** Whether the progress bar should be animating */
  isActive: boolean
  /** Estimated duration in milliseconds */
  estimatedDuration: number
  /** Optional start time (for time-based progress) */
  startTime?: number
  /** Optional actual progress (0-100), overrides time-based calculation */
  actualProgress?: number
  /** Height of the progress bar */
  height?: 'sm' | 'md' | 'lg'
  /** Custom className for the container */
  className?: string
}

export function ProgressBar({
  isActive,
  estimatedDuration,
  startTime,
  actualProgress,
  height = 'md',
  className = '',
}: ProgressBarProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!isActive) {
      setProgress(0)
      return
    }

    // If actual progress is provided, use it directly
    if (actualProgress !== undefined) {
      setProgress(Math.min(100, Math.max(0, actualProgress)))
      return
    }

    // Otherwise, calculate based on elapsed time
    if (!startTime) {
      setProgress(0)
      return
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.min(95, (elapsed / estimatedDuration) * 100) // Cap at 95% until complete
      setProgress(newProgress)
    }, 50) // Update every 50ms for smooth animation

    return () => clearInterval(interval)
  }, [isActive, estimatedDuration, startTime, actualProgress])

  const heightClasses = {
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2',
  }

  // Determine if progress is complete (100%)
  const isComplete = actualProgress !== undefined ? actualProgress >= 100 : progress >= 100

  return (
    <div className={`w-full ${heightClasses[height]} ${isComplete ? 'bg-green-600/20' : 'bg-primary/20'} rounded-full overflow-hidden ${className}`}>
      <div 
        className={`h-full rounded-full transition-all duration-300 ease-out ${
          isComplete ? 'bg-green-600' : 'bg-primary'
        }`}
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

