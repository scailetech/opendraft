/**
 * HelpText Component
 * 
 * Provides inline help text with optional icon and tooltip.
 */

'use client'

import { Info, HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'
import { cn } from '@/lib/utils'

interface HelpTextProps {
  /** Help text content */
  text: string
  /** Optional longer description for tooltip */
  description?: string
  /** Icon variant */
  icon?: 'info' | 'help'
  /** Size variant */
  size?: 'sm' | 'md'
  /** Additional className */
  className?: string
  /** Show tooltip on hover */
  showTooltip?: boolean
}

export function HelpText({
  text,
  description,
  icon = 'info',
  size = 'sm',
  className,
  showTooltip = false,
}: HelpTextProps) {
  const IconComponent = icon === 'info' ? Info : HelpCircle
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  const content = (
    <div className={cn('flex items-start gap-1.5 text-muted-foreground', className)}>
      <IconComponent className={cn(iconSize, 'flex-shrink-0 mt-0.5')} aria-hidden="true" />
      <span className={cn(textSize, 'leading-relaxed')}>{text}</span>
    </div>
  )

  if (showTooltip && description) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">
              {content}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <p className="text-xs leading-relaxed">{description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return content
}

