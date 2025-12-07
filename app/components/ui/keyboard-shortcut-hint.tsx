/**
 * KeyboardShortcutHint Component
 * 
 * Displays keyboard shortcut hints next to actions.
 * Makes keyboard shortcuts discoverable without requiring inspection.
 */

'use client'

import React from 'react'
import { Keyboard } from 'lucide-react'
import { formatKeyboardShortcut } from '@/lib/utils/keyboard-shortcuts'
import { cn } from '@/lib/utils'

interface KeyboardShortcutHintProps {
  /** Keyboard shortcut keys */
  keys: string[]
  /** Additional className */
  className?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'text-[10px] px-1.5 py-0.5',  // Compact size for subtle kbd hints
  md: 'text-xs px-2 py-1',
  lg: 'text-sm px-2.5 py-1.5',
}

/**
 * Displays keyboard shortcut hint.
 * 
 * Usage:
 * ```tsx
 * <KeyboardShortcutHint keys={['Meta', 'K']} />
 * ```
 */
export function KeyboardShortcutHint({
  keys,
  className,
  size = 'sm',
}: KeyboardShortcutHintProps) {
  const shortcut = formatKeyboardShortcut(keys)

  return (
    <kbd
      className={cn(
        'inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-muted-foreground',
        sizeClasses[size],
        className
      )}
      aria-label={`Keyboard shortcut: ${shortcut}`}
    >
      <Keyboard className="h-3 w-3" aria-hidden="true" />
      <span>{shortcut}</span>
    </kbd>
  )
}

