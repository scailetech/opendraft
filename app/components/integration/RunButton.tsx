/**
 * RunButton Component
 * 
 * Pre-integrated Run button with DisabledButtonTooltip, KeyboardShortcutHint,
 * and MobileOptimizedButton. Ready to drop into your bulk processing page.
 * 
 * Usage:
 * ```tsx
 * <RunButton
 *   csvFile={csvFile}
 *   prompt={prompt}
 *   outputColumn={outputColumn}
 *   isProcessing={isProcessing}
 *   hasDailyLimit={hasReachedLimit}
 *   rowCount={rowCount}
 *   onRun={handleRun}
 * />
 * ```
 */

'use client'

import React from 'react'
import { DisabledButtonTooltip, useDisabledButtonReason } from '@/components/ui/disabled-button-tooltip'
import { KeyboardShortcutHint } from '@/components/ui/keyboard-shortcut-hint'
import { MobileOptimizedButton } from '@/components/ui/mobile-optimized-button'

interface RunButtonProps {
  /** CSV file object (or null if not uploaded) */
  csvFile: File | null | undefined
  /** Prompt text */
  prompt: string
  /** Output column name */
  outputColumn: string
  /** Whether processing is in progress */
  isProcessing?: boolean
  /** Whether daily limit has been reached */
  hasDailyLimit?: boolean
  /** Number of rows to process */
  rowCount?: number
  /** Click handler */
  onRun: () => void
  /** Additional className */
  className?: string
  /** Button variant */
  variant?: 'default' | 'outline' | 'destructive' | 'ghost' | 'link'
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function RunButton({
  csvFile,
  prompt,
  outputColumn,
  isProcessing = false,
  hasDailyLimit = false,
  rowCount = 0,
  onRun,
  className = '',
  variant = 'default',
  size = 'default',
}: RunButtonProps) {
  const reason = useDisabledButtonReason({
    hasCSV: !!csvFile,
    hasPrompt: !!prompt.trim(),
    hasOutputColumn: !!outputColumn.trim(),
    isProcessing,
    hasDailyLimit,
  })

  const canRun = !reason && !isProcessing
  const buttonText = rowCount > 0 ? `Run All (${rowCount})` : 'Run All'
  const buttonEmoji = isProcessing ? '🏃' : '👟'  // Running or ready to run!

  return (
    <DisabledButtonTooltip
      reason={reason?.reason || 'Ready to run'}
      details={reason?.details}
      requirements={reason?.requirements}
    >
      <MobileOptimizedButton
        disabled={!canRun}
        onClick={onRun}
        variant={variant}
        size={size}
        className={className}
      >
        <span className="mr-1.5">{buttonEmoji}</span>
        {buttonText}
        <KeyboardShortcutHint keys={['Meta', 'Enter']} />
      </MobileOptimizedButton>
    </DisabledButtonTooltip>
  )
}

