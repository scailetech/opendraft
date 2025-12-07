/**
 * Hook for responsive breakpoints
 * Detects screen size and provides mobile/tablet/desktop flags
 */

import { useState, useEffect } from 'react'

export interface BreakpointState {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  width: number
}

const MOBILE_BREAKPOINT = 640
const TABLET_BREAKPOINT = 1024

export function useMediaQuery() {
  const [breakpoint, setBreakpoint] = useState<BreakpointState>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: 1024,
      }
    }
    
    const width = window.innerWidth
    return {
      isMobile: width < MOBILE_BREAKPOINT,
      isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
      isDesktop: width >= TABLET_BREAKPOINT,
      width,
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      const width = window.innerWidth
      setBreakpoint({
        isMobile: width < MOBILE_BREAKPOINT,
        isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
        isDesktop: width >= TABLET_BREAKPOINT,
        width,
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return breakpoint
}

