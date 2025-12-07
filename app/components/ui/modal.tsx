/**
 * ABOUTME: Reusable modal component with focus trap and accessibility
 * ABOUTME: Follows shadcn/ui pattern for consistent modal dialogs across the app
 */

'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { cn } from '@/lib/utils'

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback to close the modal */
  onClose: () => void
  /** Modal title */
  title: string
  /** Icon component to display next to title */
  titleIcon?: React.ComponentType<{ className?: string }>
  /** Color class for title icon (e.g. 'text-blue-400') */
  titleIconColor?: string
  /** Emoji to display next to title (alternative to titleIcon) */
  titleEmoji?: string
  /** Modal content */
  children: React.ReactNode
  /** Optional footer content (buttons, actions) */
  footer?: React.ReactNode
  /** Modal size variant */
  size?: 'sm' | 'md' | 'lg'
  /** ID for aria-labelledby (defaults to generated ID) */
  ariaLabelledBy?: string
  /** Additional className for dialog container */
  className?: string
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-3xl',
}

export function Modal({
  isOpen,
  onClose,
  title,
  titleIcon: TitleIcon,
  titleIconColor = 'text-muted-foreground',
  titleEmoji,
  children,
  footer,
  size = 'md',
  ariaLabelledBy,
  className,
}: ModalProps) {
  const modalRef = useFocusTrap({
    enabled: isOpen,
    onEscape: onClose,
    returnFocus: true,
  })
  const generatedId = React.useId()
  const titleId = ariaLabelledBy || `modal-title-${generatedId}`

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
      tabIndex={-1}
    >
      <div
        ref={modalRef as React.RefObject<HTMLDivElement>}
        className={cn(
          'bg-card border border-border/50 shadow-2xl shadow-black/20 w-full overflow-hidden flex flex-col',
          'rounded-xl max-h-[85vh]',
          'animate-in zoom-in-95 fade-in duration-150',
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby={titleId}
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {titleEmoji ? (
              <span className="text-lg flex-shrink-0" role="img" aria-hidden="true">{titleEmoji}</span>
            ) : TitleIcon ? (
              <TitleIcon className={cn('h-5 w-5 flex-shrink-0', titleIconColor)} />
            ) : null}
            <h2 id={titleId} className="text-base font-semibold text-foreground truncate" title={title}>
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md p-1.5 -mr-1 flex-shrink-0"
            aria-label={`Close ${title}`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Content - scrollable area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 overscroll-contain">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="flex items-center justify-end px-5 py-4 border-t border-border/50 bg-secondary/30 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
