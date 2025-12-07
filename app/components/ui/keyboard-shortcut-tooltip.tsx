/**
 * KeyboardShortcutTooltip Component
 * 
 * Wraps a component and shows keyboard shortcut in tooltip.
 */

'use client'

import { ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'
import { cn } from '@/lib/utils'

interface KeyboardShortcutTooltipProps {
  /** Child component to wrap */
  children: ReactNode
  /** Tooltip content */
  content: string
  /** Keyboard shortcut (e.g., "⌘T" or "Cmd+T") */
  shortcut?: string
  /** Additional className */
  className?: string
  /** Tooltip side */
  side?: 'top' | 'bottom' | 'left' | 'right'
}

export function KeyboardShortcutTooltip({
  children,
  content,
  shortcut,
  className,
  side = 'top',
}: KeyboardShortcutTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('inline-flex', className)}>
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs">{content}</span>
            {shortcut && (
              <kbd className="px-1.5 py-0.5 bg-background/50 border border-border rounded text-xs font-mono text-muted-foreground">
                {shortcut}
              </kbd>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

