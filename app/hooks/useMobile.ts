/**
 * useMobile Hook
 * 
 * Detects mobile/tablet viewport and provides responsive utilities.
 * Uses Tailwind's md breakpoint (768px) for mobile detection to match
 * BulkProcessor's responsive layouts.
 */

import { useState, useEffect } from 'react'

interface UseMobileReturn {
  /** True if viewport is mobile (< 768px) - matches Tailwind's md breakpoint */
  isMobile: boolean
  /** True if viewport is tablet (768px - 1024px) */
  isTablet: boolean
  /** True if viewport is desktop (>= 1024px) */
  isDesktop: boolean
  /** Viewport width */
  width: number
}

/**
 * Hook to detect mobile/tablet/desktop viewport
 * Mobile: < 768px (matches Tailwind's md: breakpoint)
 * Tablet: 768px - 1024px
 * Desktop: >= 1024px
 */
export function useMobile(): UseMobileReturn {
  const [state, setState] = useState<UseMobileReturn>(() => {
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
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
      width,
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      const width = window.innerWidth
      setState({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        width,
      })
    }

    // Run immediately on mount to ensure correct state after hydration
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return state
}

