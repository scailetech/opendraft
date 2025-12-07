/**
 * ABOUTME: Custom hook for managing collapsible section state with localStorage persistence
 * ABOUTME: Provides SSR-safe state management for expandable/collapsible UI sections
 */

import { useState, useCallback } from 'react'

export interface UseCollapsibleStateOptions {
  /** Unique storage key for this collapsible section */
  storageKey: string
  /** Default open state (used on first load or when localStorage is unavailable) */
  defaultOpen?: boolean
}

export interface UseCollapsibleStateReturn {
  /** Current open/closed state */
  isOpen: boolean
  /** Toggle the open/closed state */
  toggle: () => void
  /** Set the open state explicitly */
  setIsOpen: (open: boolean) => void
}

/**
 * Manages collapsible section state with localStorage persistence
 *
 * Automatically persists the open/closed state to localStorage, allowing sections
 * to maintain their state across page reloads. SSR-safe with fallback to default state.
 *
 * @param options - Configuration options
 * @returns State and control functions for the collapsible section
 *
 * @example
 * const { isOpen, toggle, setIsOpen } = useCollapsibleState({
 *   storageKey: 'bulk-processor-output-settings',
 *   defaultOpen: true
 * })
 *
 * <CollapsibleSection
 *   title="Output Settings"
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 * >
 *   {children}
 * </CollapsibleSection>
 */
export function useCollapsibleState({
  storageKey,
  defaultOpen = true
}: UseCollapsibleStateOptions): UseCollapsibleStateReturn {
  // Initialize state from localStorage (SSR-safe)
  const [isOpen, setIsOpenState] = useState<boolean>(() => {
    // Return default during SSR
    if (typeof window === 'undefined') return defaultOpen

    // Try to load from localStorage
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored === null) return defaultOpen
      return stored === 'true'
    } catch (error) {
      // LocalStorage might be disabled or unavailable
      console.warn(`Failed to read collapsible state from localStorage (${storageKey}):`, error)
      return defaultOpen
    }
  })

  // Persist state changes to localStorage
  const setIsOpen = useCallback((open: boolean) => {
    setIsOpenState(open)

    // Persist to localStorage (client-side only)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, String(open))
      } catch (error) {
        // LocalStorage might be disabled or full
        console.warn(`Failed to persist collapsible state to localStorage (${storageKey}):`, error)
      }
    }
  }, [storageKey])

  // Toggle function for convenience
  const toggle = useCallback(() => {
    setIsOpen(!isOpen)
  }, [isOpen, setIsOpen])

  return {
    isOpen,
    toggle,
    setIsOpen
  }
}
