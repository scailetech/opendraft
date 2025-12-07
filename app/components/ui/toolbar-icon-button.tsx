'use client'

import * as React from 'react'
import { Button, ButtonProps } from './button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'
import { cn } from '@/lib/utils'

export interface ToolbarIconButtonProps extends Omit<ButtonProps, 'size' | 'children'> {
  icon: React.ReactNode
  tooltip: string
  isLoading?: boolean
  loadingIcon?: React.ReactNode
  'aria-label'?: string
}

/**
 * Standardized icon button for toolbars
 * Clean, consistent sizing with proper icon alignment
 */
export const ToolbarIconButton = React.forwardRef<HTMLButtonElement, ToolbarIconButtonProps>(
  ({ icon, tooltip, isLoading, loadingIcon, className, 'aria-label': ariaLabel, disabled, ...props }, ref) => {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Button
                ref={ref}
                variant="outline"
                size="icon"
                className={cn(
                  'h-10 w-10 sm:h-8 sm:w-8 flex-shrink-0 transition-all', // 40px on mobile, 32px on desktop
                  'flex items-center justify-center',
                  'border-border/60 hover:border-border hover:bg-accent/50',
                  'active:scale-95 disabled:active:scale-100',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50', // Subtle focus ring
                  '[&_svg]:h-4 [&_svg]:w-4',
                  className
                )}
                aria-label={ariaLabel || tooltip}
                disabled={disabled}
                {...props}
              >
                {isLoading ? (
                  loadingIcon || (
                    <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" />
                  )
                ) : (
                  icon
                )}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8} className="max-w-[280px]">
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
)
ToolbarIconButton.displayName = 'ToolbarIconButton'

/**
 * Primary action icon button (e.g., Process/Run button)
 * Prominent styling for main actions
 */
export const ToolbarPrimaryButton = React.forwardRef<HTMLButtonElement, ToolbarIconButtonProps>(
  ({ icon, tooltip, isLoading, loadingIcon, className, 'aria-label': ariaLabel, disabled, ...props }, ref) => {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Button
                ref={ref}
                variant="default"
                size="icon"
                className={cn(
                  'h-10 w-10 sm:h-8 sm:w-8 flex-shrink-0 transition-all', // 40px on mobile, 32px on desktop
                  'flex items-center justify-center',
                  'bg-primary text-primary-foreground shadow-sm',
                  'hover:bg-primary/90',
                  'active:scale-95 disabled:active:scale-100',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50', // Subtle focus ring
                  '[&_svg]:h-4 [&_svg]:w-4',
                  className
                )}
                aria-label={ariaLabel || tooltip}
                disabled={disabled}
                {...props}
              >
                {isLoading ? (
                  loadingIcon || (
                    <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" />
                  )
                ) : (
                  icon
                )}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8} className="max-w-[280px]">
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
)
ToolbarPrimaryButton.displayName = 'ToolbarPrimaryButton'

/**
 * Ghost variant icon button (for grouped buttons or less prominent actions)
 */
export interface ToolbarGhostButtonProps extends Omit<ToolbarIconButtonProps, 'variant'> {
  withoutTooltip?: boolean
}

export const ToolbarGhostButton = React.forwardRef<HTMLButtonElement, ToolbarGhostButtonProps>(
  ({ icon, tooltip, isLoading, loadingIcon, className, 'aria-label': ariaLabel, withoutTooltip = false, ...props }, ref) => {
    const button = (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        className={cn(
          'h-10 w-10 sm:h-8 sm:w-8 flex-shrink-0 transition-all', // 40px on mobile, 32px on desktop
          'flex items-center justify-center',
          'hover:bg-accent/50',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50',
          '[&_svg]:h-4 [&_svg]:w-4',
          className
        )}
        aria-label={ariaLabel || tooltip}
        {...props}
      >
        {isLoading ? (
          loadingIcon || (
            <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" />
          )
        ) : (
          icon
        )}
      </Button>
    )

    if (withoutTooltip) {
      return button
    }

    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8} className="max-w-[280px]">
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
)
ToolbarGhostButton.displayName = 'ToolbarGhostButton'

/**
 * Vertical divider for separating button groups within a toolbar
 */
export function ToolbarDivider({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        'w-px h-4 bg-border/60 mx-0.5',
        className
      )}
      role="separator"
      aria-orientation="vertical"
    />
  )
}

/**
 * Button group wrapper for toolbar buttons
 * Groups related buttons with connected styling
 */
export interface ToolbarButtonGroupProps {
  children: React.ReactNode
  className?: string
}

export function ToolbarButtonGroup({ children, className }: ToolbarButtonGroupProps) {
  return (
    <div 
      className={cn(
        'inline-flex items-center rounded-lg border border-border/60 bg-background/50 p-0.5 gap-0.5',
        className
      )}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          // Don't modify ToolbarDivider
          if ((child.type as { displayName?: string })?.displayName === 'ToolbarDivider') {
            return child
          }
          return React.cloneElement(child as React.ReactElement<{ className?: string }>, {
            className: cn(
              'border-0 rounded-md',
              child.props.className
            ),
          })
        }
        return child
      })}
    </div>
  )
}

ToolbarDivider.displayName = 'ToolbarDivider'
