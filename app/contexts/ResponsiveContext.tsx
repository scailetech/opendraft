/**
 * ResponsiveContext - Global responsive state with single resize listener
 * Provides responsive breakpoint utilities to all components via context
 * Performance: Single resize listener instead of per-component listeners
 */

'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface ResponsiveState {
  /** Is extra small device (< 475px) */
  isXS: boolean
  /** Is mobile device (< 640px) */
  isMobile: boolean
  /** Is small tablet device (640px - 768px) */
  isSM: boolean
  /** Is tablet device (768px - 1024px) */
  isTablet: boolean
  /** Is medium desktop (1024px - 1280px) */
  isMD: boolean
  /** Is large desktop (1280px - 1536px) */
  isLG: boolean
  /** Is extra large desktop (> 1536px) */
  isXL: boolean
  /** Is desktop device (> 1024px) - legacy support */
  isDesktop: boolean
  /** Current window width */
  width: number
  /** Current window height */
  height: number
  /** Is touch device */
  isTouch: boolean
}

const BREAKPOINTS = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
}

const DEFAULT_STATE: ResponsiveState = {
  isXS: false,
  isMobile: false,
  isSM: false,
  isTablet: false,
  isMD: false,
  isLG: false,
  isXL: false,
  isDesktop: true,
  width: 0,
  height: 0,
  isTouch: false,
}

const ResponsiveContext = createContext<ResponsiveState>(DEFAULT_STATE)

function getResponsiveState(): ResponsiveState {
  if (typeof window === 'undefined') {
    return DEFAULT_STATE
  }

  const width = window.innerWidth
  const height = window.innerHeight
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  return {
    isXS: width < BREAKPOINTS.xs,
    isMobile: width < BREAKPOINTS.sm,
    isSM: width >= BREAKPOINTS.sm && width < BREAKPOINTS.md,
    isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isMD: width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl,
    isLG: width >= BREAKPOINTS.xl && width < BREAKPOINTS['2xl'],
    isXL: width >= BREAKPOINTS['2xl'],
    isDesktop: width >= BREAKPOINTS.lg,
    width,
    height,
    isTouch,
  }
}

/**
 * ResponsiveProvider - Provides responsive state to all children
 * Maintains a single debounced resize listener for the entire app
 */
export function ResponsiveProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ResponsiveState>(getResponsiveState)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let timeoutId: NodeJS.Timeout | null = null

    // Debounced resize handler (150ms)
    const handleResize = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(() => {
        setState(getResponsiveState())
        timeoutId = null
      }, 150)
    }

    // Initial calculation
    setState(getResponsiveState())

    // Add resize listener
    window.addEventListener('resize', handleResize, { passive: true })

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <ResponsiveContext.Provider value={state}>
      {children}
    </ResponsiveContext.Provider>
  )
}

/**
 * Hook to access responsive state
 * More efficient than the old useResponsive - uses shared context
 */
export function useResponsiveContext(): ResponsiveState {
  const context = useContext(ResponsiveContext)
  if (!context) {
    throw new Error('useResponsiveContext must be used within ResponsiveProvider')
  }
  return context
}

/**
 * Hook for mobile detection
 */
export function useIsMobileContext(): boolean {
  const { isMobile } = useResponsiveContext()
  return isMobile
}

/**
 * Hook for touch device detection
 */
export function useIsTouchContext(): boolean {
  const { isTouch } = useResponsiveContext()
  return isTouch
}
