/**
 * AccessibleStatusBadge Component
 * 
 * Status badge with icon and text (not just color) for accessibility.
 * Addresses P2 issue: "Status Colors: Failed batches use red, but color alone conveys meaning"
 */

'use client'

import React from 'react'
import { CheckCircle2, XCircle, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatusType = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'completed_with_errors' 
  | 'failed'

interface AccessibleStatusBadgeProps {
  /** The status type */
  status: StatusType
  /** Optional custom label (defaults to status-based label) */
  label?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Additional className */
  className?: string
}

const statusConfig: Record<StatusType, {
  label: string
  icon: React.ComponentType<{ className?: string }>
  className: string
  iconClassName: string
}> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-secondary text-secondary-foreground border-border',
    iconClassName: 'text-muted-foreground',
  },
  processing: {
    label: 'Processing',
    icon: Loader2,
    className: 'bg-primary/10 text-primary border-primary/30',
    iconClassName: 'text-primary animate-spin',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
    iconClassName: 'text-green-600 dark:text-green-400',
  },
  completed_with_errors: {
    label: 'Completed with errors',
    icon: AlertCircle,
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    iconClassName: 'text-amber-600 dark:text-amber-400',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    className: 'bg-destructive/10 text-destructive border-destructive/30',
    iconClassName: 'text-destructive',
  },
}

const sizeConfig = {
  sm: {
    container: 'px-2.5 py-1 text-xs gap-1.5',
    icon: 'h-3.5 w-3.5',
  },
  md: {
    container: 'px-3 py-1.5 text-xs gap-2',
    icon: 'h-4 w-4',
  },
  lg: {
    container: 'px-4 py-2 text-sm gap-2',
    icon: 'h-4 w-4',
  },
}

/**
 * Accessible status badge with icon and text (not just color).
 * 
 * Usage:
 * ```tsx
 * <AccessibleStatusBadge status="completed" />
 * <AccessibleStatusBadge status="failed" size="sm" />
 * ```
 */
export function AccessibleStatusBadge({
  status,
  label,
  size = 'md',
  className,
}: AccessibleStatusBadgeProps) {
  const config = statusConfig[status]
  const sizes = sizeConfig[size]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center border rounded-md font-semibold',
        config.className,
        sizes.container,
        className
      )}
      role="status"
      aria-label={`Status: ${label || config.label}`}
    >
      <Icon 
        className={cn(sizes.icon, config.iconClassName)} 
        aria-hidden="true"
      />
      <span className="leading-none">{label || config.label}</span>
    </span>
  )
}

