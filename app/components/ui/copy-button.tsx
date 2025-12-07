/**
 * ABOUTME: Reusable copy button with inline feedback animation
 * ABOUTME: Shows checkmark briefly after successful copy
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CopyButtonProps {
  value: string
  className?: string
  iconClassName?: string
  label?: string
  showLabel?: boolean
  onCopy?: () => void
}

export function CopyButton({ 
  value, 
  className, 
  iconClassName,
  label = 'Copy',
  showLabel = false,
  onCopy 
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()

  // Cleanup timeout on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleCopy = useCallback(async () => {
    // Validate input - early return if empty
    if (!value) {
      console.warn('CopyButton: No value to copy')
      return
    }

    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      onCopy?.()
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      // Reset after 1.5s
      timeoutRef.current = setTimeout(() => {
        setCopied(false)
      }, 1500)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [value, onCopy])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md',
        'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
        'transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        copied && 'text-green-500 hover:text-green-500',
        className
      )}
      aria-label={copied ? 'Copied!' : label}
    >
      <span className="relative h-4 w-4">
        <Copy 
          className={cn(
            'h-4 w-4 absolute inset-0 transition-all duration-200',
            copied ? 'opacity-0 scale-75' : 'opacity-100 scale-100',
            iconClassName
          )} 
          aria-hidden="true"
        />
        <Check 
          className={cn(
            'h-4 w-4 absolute inset-0 transition-all duration-200',
            copied ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          )} 
          aria-hidden="true"
        />
      </span>
      {showLabel && (
        <span className="text-xs transition-all duration-200">
          {copied ? 'Copied!' : label}
        </span>
      )}
    </button>
  )
}

/**
 * Inline copy text - shows text with copy button
 */
interface CopyTextProps {
  text: string
  className?: string
  truncate?: boolean
  maxLength?: number
}

export function CopyText({ text, className, truncate = true, maxLength = 30 }: CopyTextProps) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()

  // Cleanup timeout on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleCopy = useCallback(async () => {
    // Validate input - early return if empty
    if (!text) {
      console.warn('CopyText: No text to copy')
      return
    }

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [text])

  const displayText = truncate && text && text.length > maxLength 
    ? `${text.slice(0, maxLength)}...` 
    : (text || '')

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'group inline-flex items-center gap-1.5 font-mono text-sm',
        'hover:text-primary transition-colors cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded',
        className
      )}
      title={text}
      aria-label={copied ? 'Copied to clipboard' : `Copy ${displayText}`}
    >
      <span className={truncate ? 'truncate' : ''}>{displayText}</span>
      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        )}
      </span>
    </button>
  )
}
