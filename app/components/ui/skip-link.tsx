/**
 * SkipLink Component
 * 
 * Provides a "Skip to main content" link for keyboard users.
 * Hidden by default, visible when focused.
 */

'use client'

import { cn } from '@/lib/utils'

interface SkipLinkProps {
  /** ID of the main content element to skip to */
  href?: string
  /** Additional className */
  className?: string
  /** Label text */
  label?: string
}

export function SkipLink({
  href = '#main-content',
  className,
  label = 'Skip to main content',
}: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100]',
        'focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground',
        'focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'focus:font-medium focus:text-sm focus:shadow-lg',
        className
      )}
    >
      {label}
    </a>
  )
}

