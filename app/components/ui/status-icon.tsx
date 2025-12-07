/**
 * ABOUTME: Centralized StatusIcon component for consistent status visualization
 * ABOUTME: Icons carry semantic color, backgrounds remain neutral - Cursor-style
 */

import * as React from 'react'
import { CheckCircle, XCircle, AlertTriangle, Circle, Loader2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatusVariant = 'success' | 'error' | 'warning' | 'pending' | 'processing' | 'info'

interface StatusIconProps {
  /** Status variant determines icon and color */
  variant: StatusVariant
  /** Size of the icon */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Whether to show with background badge */
  withBackground?: boolean
  /** Optional label text */
  label?: string
  /** Use emoji instead of icon */
  useEmoji?: boolean
  /** Additional className */
  className?: string
}

const statusConfig = {
  success: {
    icon: CheckCircle,
    emoji: '🏁',  // Finish line - completed the run!
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    label: 'Success',
  },
  error: {
    icon: XCircle,
    emoji: '🤕',  // Injury - run failed
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    label: 'Error',
  },
  warning: {
    icon: AlertTriangle,
    emoji: '⚠️',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    label: 'Warning',
  },
  pending: {
    icon: Circle,
    emoji: '👟',  // Shoe ready - waiting to run
    color: 'text-muted-foreground',
    bg: 'bg-muted/50',
    label: 'Pending',
  },
  processing: {
    icon: Loader2,
    emoji: '🏃',  // Running!
    color: 'text-primary',
    bg: 'bg-primary/10',
    label: 'Processing',
  },
  info: {
    icon: Info,
    emoji: '💡',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    label: 'Info',
  },
} as const

const sizeConfig = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
} as const

const emojiSizeConfig = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
} as const

export function StatusIcon({
  variant,
  size = 'sm',
  withBackground = false,
  label,
  useEmoji = false,
  className,
}: StatusIconProps) {
  const config = statusConfig[variant]
  const Icon = config.icon
  const isProcessing = variant === 'processing'

  const iconElement = useEmoji ? (
    <span 
      className={cn(emojiSizeConfig[size], className)}
      role="img" 
      aria-hidden="true"
    >
      {config.emoji}
    </span>
  ) : (
    <Icon
      className={cn(
        sizeConfig[size],
        config.color,
        isProcessing && 'animate-spin',
        className
      )}
      aria-hidden="true"
    />
  )

  if (withBackground) {
    return (
      <div className={cn('flex items-center gap-1.5 px-1.5 py-0.5 rounded', config.bg)}>
        {iconElement}
        {label && (
          <span className={cn('text-xs font-medium', config.color)}>
            {label}
          </span>
        )}
        <span className="sr-only">{label || config.label}</span>
      </div>
    )
  }

  return (
    <>
      {iconElement}
      <span className="sr-only">{label || config.label}</span>
    </>
  )
}

// Export config for components that need to customize behavior
export { statusConfig, sizeConfig }


