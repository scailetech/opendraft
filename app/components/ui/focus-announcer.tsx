/**
 * FocusAnnouncer Component
 * 
 * Provides screen reader announcements for dynamic content changes.
 */

'use client'

import { useEffect, useRef } from 'react'

interface FocusAnnouncerProps {
  /** Message to announce to screen readers */
  message: string
  /** Priority level (polite or assertive) */
  priority?: 'polite' | 'assertive'
  /** Clear the message after announcement */
  clearAfter?: number
}

export function FocusAnnouncer({
  message,
  priority = 'polite',
  clearAfter,
}: FocusAnnouncerProps) {
  const announcerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!message || !announcerRef.current) return undefined

    announcerRef.current.textContent = message

    if (clearAfter) {
      const timer = setTimeout(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = ''
        }
      }, clearAfter)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [message, clearAfter])

  return (
    <div
      ref={announcerRef}
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    />
  )
}

