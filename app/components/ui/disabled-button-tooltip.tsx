/**
 * DisabledButtonTooltip Component
 * 
 * Provides helpful tooltips for disabled buttons explaining why they're disabled.
 * Addresses P0 accessibility issue: "Disabled State Clarity"
 */

'use client'

import React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface DisabledButtonTooltipProps {
  /** Why the button is disabled */
  reason?: string
  /** Additional helpful information */
  details?: string
  /** Requirements that need to be met */
  requirements?: string[]
  /** Children (the disabled button) */
  children: React.ReactElement
}

/**
 * Wraps a disabled button with a tooltip explaining why it's disabled.
 * 
 * Usage:
 * ```tsx
 * <DisabledButtonTooltip
 *   reason="Missing required fields"
 *   requirements={["CSV file", "Prompt", "Output column name"]}
 * >
 *   <Button disabled>Run All</Button>
 * </DisabledButtonTooltip>
 * ```
 */
export function DisabledButtonTooltip({
  reason,
  details,
  requirements,
  children,
}: DisabledButtonTooltipProps) {
  // Only show tooltip if button is disabled
  const isDisabled = children?.props?.disabled

  if (!isDisabled) {
    return children
  }

  const tooltipContent = (
    <div className="max-w-xs space-y-2">
      <div className="font-medium text-sm">{reason}</div>
      {details && <p className="text-xs text-muted-foreground">{details}</p>}
      {requirements && requirements.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium">Required:</p>
          <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
            {requirements.map((req, idx) => (
              <li key={idx}>{req}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )

  // Extract flex classes from button to preserve layout
  const buttonClassName = children?.props?.className || ''
  const flexMatch = buttonClassName.match(/\b(flex-\d+|flex-\[.*?\])\b/)
  const flexClass = flexMatch ? flexMatch[1] : 'flex-1'

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div className={`${flexClass}`}>
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Hook to determine why a button should be disabled
 * Returns an object with reason, details, and requirements
 */
export function useDisabledButtonReason(options: {
  hasCSV: boolean
  hasPrompt: boolean
  hasOutputColumn: boolean
  isProcessing?: boolean
  hasDailyLimit?: boolean
}) {
  const { hasCSV, hasPrompt, hasOutputColumn, isProcessing, hasDailyLimit } = options

  if (isProcessing) {
    return {
      reason: 'Processing in progress',
      details: 'Please wait for the current batch to complete before starting a new one.',
    }
  }

  if (hasDailyLimit) {
    return {
      reason: 'Daily batch limit reached',
      details: 'You have reached your daily batch processing limit. Please try again tomorrow or upgrade your plan.',
    }
  }

  const missing: string[] = []
  if (!hasCSV) missing.push('CSV file')
  if (!hasPrompt) missing.push('Prompt')
  if (!hasOutputColumn) missing.push('Output column name')

  if (missing.length > 0) {
    return {
      reason: 'Missing required fields',
      details: 'Please complete all required fields to proceed.',
      requirements: missing,
    }
  }

  return null
}

