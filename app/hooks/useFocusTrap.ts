/**
 * useFocusTrap Hook
 * 
 * Traps focus within a container element (e.g., modal, dropdown).
 * Ensures keyboard users can't tab outside the container.
 */

import { useEffect, useRef } from 'react'

interface UseFocusTrapOptions {
  /** Whether the trap is active */
  enabled?: boolean
  /** Optional callback when escape key is pressed */
  onEscape?: () => void
  /** Whether to return focus to the trigger element on close */
  returnFocus?: boolean
  /** Element to return focus to (defaults to previously focused element) */
  returnFocusTo?: HTMLElement | null
}

/**
 * Hook to trap focus within a container
 */
export function useFocusTrap({
  enabled = true,
  onEscape,
  returnFocus = true,
  returnFocusTo,
}: UseFocusTrapOptions = {}) {
  const containerRef = useRef<HTMLElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!enabled || !containerRef.current) return

    const container = containerRef.current
    const previouslyFocused = document.activeElement as HTMLElement

    // Store the previously focused element
    if (returnFocus && !returnFocusTo) {
      previousFocusRef.current = previouslyFocused
    }

    // Get all focusable elements within the container
    const getFocusableElements = (): HTMLElement[] => {
      const selector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ')

      return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
        (el) => {
          // Filter out hidden elements
          const style = window.getComputedStyle(el)
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0'
          )
        }
      )
    }

    const focusableElements = getFocusableElements()

    if (focusableElements.length === 0) return

    // Focus the first element
    const firstElement = focusableElements[0]
    firstElement.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault()
        onEscape()
        return
      }

      if (e.key !== 'Tab') return

      const currentFocusIndex = focusableElements.indexOf(
        document.activeElement as HTMLElement
      )

      if (e.shiftKey) {
        // Shift + Tab: move backwards
        if (currentFocusIndex === 0 || currentFocusIndex === -1) {
          e.preventDefault()
          focusableElements[focusableElements.length - 1].focus()
        }
      } else {
        // Tab: move forwards
        if (
          currentFocusIndex === focusableElements.length - 1 ||
          currentFocusIndex === -1
        ) {
          e.preventDefault()
          focusableElements[0].focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)

      // Return focus to the previously focused element
      if (returnFocus) {
        const elementToFocus = returnFocusTo || previousFocusRef.current
        if (elementToFocus && typeof elementToFocus.focus === 'function') {
          // Use setTimeout to ensure the element is still in the DOM
          setTimeout(() => {
            elementToFocus.focus()
          }, 0)
        }
      }
    }
  }, [enabled, onEscape, returnFocus, returnFocusTo])

  return containerRef
}
