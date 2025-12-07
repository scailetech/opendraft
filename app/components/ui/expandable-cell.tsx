/**
 * ExpandableCell Component
 * 
 * Table cell with expand/collapse functionality for long text.
 * Addresses P2 issue: "Results Table: Long text in cells may truncate without expand option"
 */

'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ExpandableCellProps {
  /** The text content to display */
  content: string
  /** Maximum number of characters before showing expand option */
  maxLength?: number
  /** Additional className */
  className?: string
  /** Whether to show expand button */
  showExpandButton?: boolean
}

/**
 * Table cell that can expand to show full content.
 * 
 * Usage:
 * ```tsx
 * <td>
 *   <ExpandableCell 
 *     content={longText} 
 *     maxLength={100}
 *   />
 * </td>
 * ```
 */
export function ExpandableCell({
  content,
  maxLength = 100,
  className,
  showExpandButton = true,
}: ExpandableCellProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const shouldTruncate = content.length > maxLength
  const displayText = isExpanded || !shouldTruncate 
    ? content 
    : `${content.slice(0, maxLength)}...`

  if (!shouldTruncate) {
    return <span className={className}>{content}</span>
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="break-words">{displayText}</span>
      {showExpandButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-6 px-2 text-xs self-start -ml-2"
          aria-label={isExpanded ? 'Collapse content' : 'Expand content'}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Show more
            </>
          )}
        </Button>
      )}
    </div>
  )
}

