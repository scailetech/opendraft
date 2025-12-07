/**
 * useFocusManagement Hook
 * 
 * Utilities for managing focus programmatically.
 */

import { useCallback, useRef } from 'react'

interface UseFocusManagementReturn {
  /** Focus the first focusable element in a container */
  focusFirst: (container?: HTMLElement | null) => void
  /** Focus the last focusable element in a container */
  focusLast: (container?: HTMLElement | null) => void
  /** Focus a specific element by selector */
  focusBySelector: (selector: string, container?: HTMLElement | null) => void
  /** Get all focusable elements in a container */
  getFocusableElements: (container?: HTMLElement | null) => HTMLElement[]
  /** Store a reference to the currently focused element */
  storeFocus: () => void
  /** Restore focus to the stored element */
  restoreFocus: () => void
}

/**
 * Hook for programmatic focus management
 */
export function useFocusManagement(
  containerRef?: React.RefObject<HTMLElement>
): UseFocusManagementReturn {
  const storedFocusRef = useRef<HTMLElement | null>(null)

  const getFocusableElements = useCallback(
    (container?: HTMLElement | null): HTMLElement[] => {
      const targetContainer = container || containerRef?.current || document.body

      const selector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ')

      return Array.from(
        targetContainer.querySelectorAll<HTMLElement>(selector)
      ).filter((el) => {
        const style = window.getComputedStyle(el)
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          !el.hasAttribute('aria-hidden')
        )
      })
    },
    [containerRef]
  )

  const focusFirst = useCallback(
    (container?: HTMLElement | null) => {
      const elements = getFocusableElements(container)
      if (elements.length > 0) {
        elements[0].focus()
      }
    },
    [getFocusableElements]
  )

  const focusLast = useCallback(
    (container?: HTMLElement | null) => {
      const elements = getFocusableElements(container)
      if (elements.length > 0) {
        elements[elements.length - 1].focus()
      }
    },
    [getFocusableElements]
  )

  const focusBySelector = useCallback(
    (selector: string, container?: HTMLElement | null) => {
      const targetContainer = container || containerRef?.current || document.body
      const element = targetContainer.querySelector<HTMLElement>(selector)
      if (element) {
        element.focus()
      }
    },
    [containerRef]
  )

  const storeFocus = useCallback(() => {
    storedFocusRef.current = document.activeElement as HTMLElement
  }, [])

  const restoreFocus = useCallback(() => {
    if (storedFocusRef.current && typeof storedFocusRef.current.focus === 'function') {
      setTimeout(() => {
        storedFocusRef.current?.focus()
      }, 0)
    }
  }, [])

  return {
    focusFirst,
    focusLast,
    focusBySelector,
    getFocusableElements,
    storeFocus,
    restoreFocus,
  }
}

