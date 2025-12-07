'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether buttons should be connected (no gaps, shared border)
   */
  connected?: boolean
}

/**
 * Groups related buttons together visually
 * Use `connected` prop for button groups that should appear as a single control
 */
export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, connected = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center flex-shrink-0',
          connected && 'border border-border/60 rounded-lg bg-background/50 overflow-hidden',
          !connected && 'gap-2',
          className
        )}
        {...props}
      >
        {React.Children.map(children, (child, index) => {
          if (React.isValidElement(child) && connected) {
            // Add border-right to all but the last child
            const isLast = index === React.Children.count(children) - 1
            return React.cloneElement(child as React.ReactElement<{ className?: string }>, {
              className: cn(
                'rounded-none border-0',
                !isLast && 'border-r border-border/60',
                child.props.className
              ),
            })
          }
          return child
        })}
      </div>
    )
  }
)
ButtonGroup.displayName = 'ButtonGroup'

