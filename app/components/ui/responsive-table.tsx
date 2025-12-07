/**
 * ResponsiveTable Component
 * 
 * Wraps tables to provide mobile-friendly card layout on small screens.
 * Shows horizontal scroll on mobile as fallback, with card layout option.
 */

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ResponsiveTableProps {
  /** Table content */
  children: ReactNode
  /** Additional className */
  className?: string
  /** Minimum table width before scrolling */
  minWidth?: string
  /** Show card layout on mobile */
  cardLayout?: boolean
}

export function ResponsiveTable({
  children,
  className,
  minWidth = '600px',
  cardLayout = false,
}: ResponsiveTableProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* Mobile card layout */}
      {cardLayout && (
        <div className="block md:hidden space-y-3">
          {/* Card layout will be rendered by parent component */}
        </div>
      )}
      
      {/* Desktop table with mobile scroll */}
      <div className={cn(
        'overflow-x-auto -mx-4 sm:mx-0',
        cardLayout && 'hidden md:block'
      )}>
        <div 
          className="inline-block min-w-full align-middle px-4 sm:px-0"
          style={{ minWidth: cardLayout ? undefined : minWidth }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

