/**
 * EmptyState Component
 * 
 * Reusable empty state component following DRY, SOLID, and KISS principles.
 * Provides consistent empty state UI across the application.
 * 
 * Usage:
 * <EmptyState
 *   icon={FileText}
 *   title="No batches yet"
 *   description="Get started by processing your first CSV file"
 *   action={{ label: "Create Batch", onClick: () => router.push('/agents') }}
 * />
 */

import React, { ReactNode } from 'react'
import { LucideIcon, Search, X } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  /** Icon to display (from lucide-react) */
  icon?: LucideIcon
  /** Emoji to display instead of icon */
  emoji?: string
  /** Main title text */
  title: string
  /** Description text below title */
  description?: string
  /** Optional action button */
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline'
  }
  /** Optional secondary action button */
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  /** Optional clear filter action (for filtered/search empty states) */
  clearFilter?: {
    label: string
    onClick: () => void
  }
  /** Optional custom content */
  children?: ReactNode
  /** Additional className */
  className?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Variant type for different contexts */
  variant?: 'default' | 'search' | 'chart' | 'table' | 'filtered'
}

export function EmptyState({
  icon: Icon,
  emoji,
  title,
  description,
  action,
  secondaryAction,
  clearFilter,
  children,
  className,
  size = 'md',
  variant = 'default',
}: EmptyStateProps) {
  // Default icons for specific variants
  const defaultIcons = {
    search: Search,
    filtered: Search,
    chart: undefined,
    table: undefined,
    default: undefined,
  }
  
  const displayIcon = Icon || defaultIcons[variant]
  const iconSizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  }

  const titleSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  const variantStyles = {
    default: '',
    search: 'py-8',
    chart: 'py-8',
    table: 'py-12',
    filtered: 'py-8',
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-4 text-center animate-fade-in',
        variantStyles[variant],
        variant === 'default' && 'py-12',
        className
      )}
      role="status"
      aria-live="polite"
    >
      {emoji ? (
        <div className={cn('mb-4', size === 'sm' ? 'text-3xl' : size === 'md' ? 'text-4xl' : 'text-5xl')}>
          <span role="img" aria-hidden="true">{emoji}</span>
        </div>
      ) : displayIcon && (
        <div className={cn('text-muted-foreground mb-4 p-3 rounded-full bg-secondary/50', iconSizes[size])}>
          {React.createElement(displayIcon, { className: "h-full w-full opacity-60", "aria-hidden": "true" })}
        </div>
      )}
      
      <h3 className={cn('font-medium text-foreground mb-2', titleSizes[size])}>
        {title}
      </h3>
      
      {description && (
        <p className="text-xs text-muted-foreground mb-6 max-w-sm">
          {description}
        </p>
      )}
      
      {(action || secondaryAction || clearFilter) && (
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'default'}
              size={size === 'sm' ? 'sm' : 'default'}
              className="gap-2"
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
              size={size === 'sm' ? 'sm' : 'default'}
              className="gap-2"
            >
              {secondaryAction.label}
            </Button>
          )}
          {clearFilter && (
            <Button
              onClick={clearFilter.onClick}
              variant="ghost"
              size={size === 'sm' ? 'sm' : 'default'}
              className="gap-2"
            >
              <X className="h-3 w-3" />
              {clearFilter.label}
            </Button>
          )}
        </div>
      )}
      
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}

