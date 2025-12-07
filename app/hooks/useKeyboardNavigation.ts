/**
 * useKeyboardNavigation Hook
 * 
 * Provides keyboard navigation for lists, dropdowns, and other interactive elements.
 * Supports arrow keys, Enter/Space activation, and Home/End navigation.
 */

import { useState, useEffect, useRef, useCallback } from 'react'

interface UseKeyboardNavigationOptions {
  /** Whether navigation is enabled */
  enabled?: boolean
  /** Number of items in the list */
  itemCount: number
  /** Callback when an item is selected via keyboard */
  onSelect?: (index: number) => void
  /** Whether to loop navigation (wrap around) */
  loop?: boolean
  /** Initial selected index */
  initialIndex?: number
  /** Orientation of navigation */
  orientation?: 'horizontal' | 'vertical' | 'both'
}

interface UseKeyboardNavigationReturn {
  /** Currently focused index */
  focusedIndex: number
  /** Set focused index programmatically */
  setFocusedIndex: (index: number) => void
  /** Container ref to attach keyboard handlers */
  containerRef: React.RefObject<HTMLElement>
}

/**
 * Hook for keyboard navigation in lists
 */
export function useKeyboardNavigation({
  enabled = true,
  itemCount,
  onSelect,
  loop = false,
  initialIndex = -1,
  orientation = 'vertical',
}: UseKeyboardNavigationOptions): UseKeyboardNavigationReturn {
  const [focusedIndex, setFocusedIndexState] = useState(initialIndex)
  const containerRef = useRef<HTMLElement>(null)

  const setFocusedIndex = useCallback((index: number) => {
    if (index >= -1 && index < itemCount) {
      setFocusedIndexState(index)
    }
  }, [itemCount])

  useEffect(() => {
    if (!enabled || !containerRef.current || itemCount === 0) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) return

      let newIndex = focusedIndex

      switch (e.key) {
        case 'ArrowDown':
          if (orientation === 'vertical' || orientation === 'both') {
            e.preventDefault()
            newIndex = focusedIndex < itemCount - 1 ? focusedIndex + 1 : (loop ? 0 : focusedIndex)
            setFocusedIndex(newIndex)
          }
          break

        case 'ArrowUp':
          if (orientation === 'vertical' || orientation === 'both') {
            e.preventDefault()
            newIndex = focusedIndex > 0 ? focusedIndex - 1 : (loop ? itemCount - 1 : focusedIndex)
            setFocusedIndex(newIndex)
          }
          break

        case 'ArrowRight':
          if (orientation === 'horizontal' || orientation === 'both') {
            e.preventDefault()
            newIndex = focusedIndex < itemCount - 1 ? focusedIndex + 1 : (loop ? 0 : focusedIndex)
            setFocusedIndex(newIndex)
          }
          break

        case 'ArrowLeft':
          if (orientation === 'horizontal' || orientation === 'both') {
            e.preventDefault()
            newIndex = focusedIndex > 0 ? focusedIndex - 1 : (loop ? itemCount - 1 : focusedIndex)
            setFocusedIndex(newIndex)
          }
          break

        case 'Home':
          e.preventDefault()
          setFocusedIndex(0)
          break

        case 'End':
          e.preventDefault()
          setFocusedIndex(itemCount - 1)
          break

        case 'Enter':
        case ' ':
          if (focusedIndex >= 0 && onSelect) {
            e.preventDefault()
            onSelect(focusedIndex)
          }
          break
      }
    }

    const container = containerRef.current
    container.addEventListener('keydown', handleKeyDown)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, itemCount, focusedIndex, loop, orientation, onSelect, setFocusedIndex])

  // Focus the element at focusedIndex
  useEffect(() => {
    if (!containerRef.current || focusedIndex < 0) return

    const items = containerRef.current.querySelectorAll('[data-keyboard-nav-item]')
    const item = items[focusedIndex] as HTMLElement
    if (item) {
      item.focus()
    }
  }, [focusedIndex])

  return {
    focusedIndex,
    setFocusedIndex,
    containerRef,
  }
}

