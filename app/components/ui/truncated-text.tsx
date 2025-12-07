/**
 * TruncatedText Component
 * 
 * Displays text with truncation and a tooltip showing the full text.
 * Addresses P2 issue: "Long Filenames truncate without hover tooltip"
 */

'use client'

import React, { useRef, useState, useEffect } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface TruncatedTextProps {
  /** The text to display */
  text: string
  /** Maximum number of characters before truncation */
  maxLength?: number
  /** CSS class name for styling */
  className?: string
  /** Truncation position: 'end' (default) or 'middle' */
  truncatePosition?: 'end' | 'middle'
  /** Show tooltip only if text is truncated */
  showTooltipOnlyWhenTruncated?: boolean
}

/**
 * Displays text with truncation and a tooltip showing the full text.
 * 
 * Usage:
 * ```tsx
 * <TruncatedText 
 *   text={filename} 
 *   maxLength={30}
 *   className="text-sm"
 * />
 * ```
 */
export function TruncatedText({
  text,
  maxLength = 30,
  className = '',
  truncatePosition = 'end',
  showTooltipOnlyWhenTruncated = true,
}: TruncatedTextProps) {
  const [isTruncated, setIsTruncated] = useState(false)
  const textRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (textRef.current && showTooltipOnlyWhenTruncated) {
      // Check if text is actually truncated
      setIsTruncated(text.length > maxLength)
    } else {
      setIsTruncated(true) // Always show tooltip if not checking
    }
  }, [text, maxLength, showTooltipOnlyWhenTruncated])

  const getTruncatedText = () => {
    if (text.length <= maxLength) {
      return text
    }

    if (truncatePosition === 'middle') {
      const start = Math.floor(maxLength / 2) - 2
      const end = text.length - Math.floor(maxLength / 2) + 2
      return `${text.slice(0, start)}...${text.slice(end)}`
    }

    return `${text.slice(0, maxLength)}...`
  }

  const displayText = getTruncatedText()
  const shouldShowTooltip = showTooltipOnlyWhenTruncated ? isTruncated : true

  if (!shouldShowTooltip || text.length <= maxLength) {
    return (
      <span ref={textRef} className={className} title={text}>
        {displayText}
      </span>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <span
            ref={textRef}
            className={`cursor-help ${className}`}
            aria-label={text}
          >
            {displayText}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-md">
          <p className="break-words">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

