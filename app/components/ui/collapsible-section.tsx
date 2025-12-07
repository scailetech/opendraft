/**
 * ABOUTME: CollapsibleSection component for expandable/collapsible content sections
 * ABOUTME: Built on Radix UI Collapsible primitive with shadcn/ui styling
 */

'use client'

import * as React from 'react'
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible'
import { ChevronDown } from 'lucide-react'
import { StatusIcon, type StatusVariant } from '@/components/ui/status-icon'

import { cn } from '@/lib/utils'

const Collapsible = CollapsiblePrimitive.Root

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  /** Controlled mode: current open state */
  open?: boolean
  /** Controlled mode: callback when open state changes */
  onOpenChange?: (open: boolean) => void
  /** Uncontrolled mode: initial open state */
  defaultOpen?: boolean
  className?: string
  triggerClassName?: string
  contentClassName?: string
  /** Status indicator (e.g., 'ready', 'error', 'complete') */
  status?: 'ready' | 'error' | 'complete' | 'warning'
  /** Status message to display */
  statusMessage?: string
  /** Highlight this section as the current/next step in the flow */
  highlight?: boolean
}

const CollapsibleSection = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Root>,
  CollapsibleSectionProps
>(
  (
    {
      title,
      children,
      open: controlledOpen,
      onOpenChange,
      defaultOpen = false,
      className,
      triggerClassName,
      contentClassName,
      status,
      statusMessage,
      highlight,
      ...props
    },
    ref
  ) => {
    // Uncontrolled state (only used if open/onOpenChange not provided)
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)

    // Determine if controlled or uncontrolled
    const isControlled = controlledOpen !== undefined
    const isOpen = isControlled ? controlledOpen : uncontrolledOpen
    const setIsOpen = isControlled ? onOpenChange : setUncontrolledOpen

    // Map collapsible status to StatusIcon variant
    const statusToVariant: Record<string, StatusVariant> = {
      ready: 'success',
      complete: 'success',
      error: 'error',
      warning: 'warning',
    }
    const statusVariant = status ? statusToVariant[status] : null

    return (
      <Collapsible
        ref={ref}
        open={isOpen}
        onOpenChange={setIsOpen}
        className={cn(
          'transition-all duration-300',
          highlight && 'border-green-500/50',
          className
        )}
        {...props}
      >
        <CollapsibleTrigger
          className={cn(
            'flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50',
            triggerClassName
          )}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="truncate uppercase tracking-wider">{title}</span>
            {status && statusVariant && (
              <StatusIcon
                variant={statusVariant}
                size="sm"
                withBackground
                label={statusMessage}
              />
            )}
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0',
              isOpen && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </CollapsibleTrigger>
        <CollapsibleContent
          className={cn(
            'overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
            contentClassName
          )}
        >
          <div className={cn(
            'p-3',
            contentClassName?.includes('pt-0') && 'pt-0',
            contentClassName?.includes('pb-0') && 'pb-0',
            contentClassName?.includes('px-0') && 'px-0'
          )}>{children}</div>
        </CollapsibleContent>
      </Collapsible>
    )
  }
)
CollapsibleSection.displayName = 'CollapsibleSection'

export {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  CollapsibleSection,
}
