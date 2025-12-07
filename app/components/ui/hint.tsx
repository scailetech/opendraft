/**
 * Contextual hint component for providing helpful tips and guidance
 * 
 * Following 2026 SaaS UX standards for progressive disclosure
 */

import React from 'react'
import { Lightbulb, Info, AlertTriangle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export type HintVariant = 'tip' | 'info' | 'warning' | 'feature'

interface HintProps {
  variant?: HintVariant
  title: string
  description: string
  className?: string
}

const variantConfig = {
  tip: {
    icon: Lightbulb,
    bg: 'bg-primary/10 dark:bg-primary/10',
    border: 'border-primary/20 dark:border-primary/20',
    iconColor: 'text-primary dark:text-primary',
    titleColor: 'text-primary/90 dark:text-primary/90',
    descColor: 'text-primary/70 dark:text-primary/70',
  },
  info: {
    icon: Info,
    bg: 'bg-muted/50 dark:bg-muted/30',
    border: 'border-border',
    iconColor: 'text-muted-foreground',
    titleColor: 'text-foreground',
    descColor: 'text-muted-foreground',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    iconColor: 'text-amber-600 dark:text-amber-400',
    titleColor: 'text-amber-900 dark:text-amber-100',
    descColor: 'text-amber-700 dark:text-amber-300',
  },
  feature: {
    icon: Sparkles,
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-200 dark:border-purple-800',
    iconColor: 'text-purple-600 dark:text-purple-400',
    titleColor: 'text-purple-900 dark:text-purple-100',
    descColor: 'text-purple-700 dark:text-purple-300',
  },
}

export default function Hint({ variant = 'tip', title, description, className }: HintProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-shadow',
        config.bg,
        config.border,
        className
      )}
      role="note"
      aria-label={`${variant}: ${title}`}
    >
      <div className="flex gap-3">
        <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', config.iconColor)} aria-hidden="true" />
        <div className="flex-1 space-y-1">
          <p className={cn('font-semibold text-sm', config.titleColor)}>{title}</p>
          <p className={cn('text-sm', config.descColor)}>{description}</p>
        </div>
      </div>
    </div>
  )
}



