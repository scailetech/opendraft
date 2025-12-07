/**
 * SuccessState Component
 * 
 * Reusable success state component for displaying success feedback.
 * Provides consistent success UI with animations across the application.
 * 
 * Usage:
 * <SuccessState
 *   icon={CheckCircle2}
 *   title="Profile updated!"
 *   description="Your changes have been saved successfully"
 *   onDismiss={() => setShowSuccess(false)}
 * />
 */

import { ReactNode, useEffect } from 'react'
import { LucideIcon, CheckCircle2, X } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface SuccessStateProps {
  /** Icon to display (from lucide-react), defaults to CheckCircle2 */
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
  /** Optional custom content */
  children?: ReactNode
  /** Additional className */
  className?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Auto-dismiss after milliseconds (0 = no auto-dismiss) */
  autoDismiss?: number
  /** Callback when dismissed */
  onDismiss?: () => void
  /** Show dismiss button */
  showDismiss?: boolean
  /** Variant type */
  variant?: 'default' | 'banner' | 'inline'
}

export function SuccessState({
  icon: Icon = CheckCircle2,
  emoji,
  title,
  description,
  action,
  children,
  className,
  size = 'md',
  autoDismiss = 0,
  onDismiss,
  showDismiss = false,
  variant = 'default',
}: SuccessStateProps) {
  useEffect(() => {
    if (autoDismiss > 0 && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss()
      }, autoDismiss)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [autoDismiss, onDismiss])

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }

  const titleSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  const variantStyles = {
    default: 'flex flex-col items-center justify-center py-12 px-4 text-center',
    banner: 'flex items-center gap-3 p-4 rounded-lg border border-green-500/20 bg-green-500/10',
    inline: 'flex items-center gap-2 p-3 rounded-md border border-green-500/20 bg-green-500/10',
  }

  if (variant === 'banner' || variant === 'inline') {
    return (
      <div
        className={cn(
          variantStyles[variant],
          'text-green-400 animate-in fade-in slide-in-from-top-2 duration-300',
          className
        )}
        role="status"
        aria-live="polite"
      >
        {emoji ? (
          <span className="text-xl" role="img" aria-hidden="true">{emoji}</span>
        ) : (
          <Icon className={cn('flex-shrink-0', iconSizes[size])} aria-hidden="true" />
        )}
        <div className="flex-1 min-w-0">
          <p className={cn('font-medium', titleSizes[size])}>{title}</p>
          {description && (
            <p className="text-xs text-green-300/80 mt-0.5">{description}</p>
          )}
        </div>
        {showDismiss && onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-green-400/60 hover:text-green-400 transition-colors"
            aria-label="Dismiss"
          >
            <X className={cn(iconSizes[size])} />
          </button>
        )}
        {action && (
          <Button
            onClick={action.onClick}
            variant={action.variant || 'outline'}
            size={size === 'sm' ? 'sm' : 'default'}
            className="ml-2 gap-2"
          >
            {action.label}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        variantStyles.default,
        'animate-in fade-in zoom-in-95 duration-500',
        className
      )}
      role="status"
      aria-live="polite"
    >
      {emoji ? (
        <div className={cn('mb-4 animate-in zoom-in duration-500', size === 'sm' ? 'text-4xl' : size === 'md' ? 'text-5xl' : 'text-6xl')}>
          <span role="img" aria-hidden="true">{emoji}</span>
        </div>
      ) : (
        <div className={cn('text-green-400 mb-4', size === 'sm' ? 'h-12 w-12' : size === 'md' ? 'h-16 w-16' : 'h-20 w-20')}>
          <Icon className="h-full w-full animate-in zoom-in duration-500" aria-hidden="true" />
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
      
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}

