/**
 * useResponsive Hook
 *
 * Provides responsive breakpoint utilities for mobile-first design.
 * Helps ensure touch targets and spacing are appropriate for mobile devices.
 *
 * PERFORMANCE: Now uses ResponsiveContext for shared state.
 * All components share a single debounced resize listener.
 */

'use client'

import { useResponsiveContext, useIsMobileContext, useIsTouchContext } from '@/contexts/ResponsiveContext'

// Re-export ResponsiveState type for backward compatibility
export type { ResponsiveState } from '@/contexts/ResponsiveContext'

/**
 * Hook for responsive design utilities.
 *
 * PERFORMANCE OPTIMIZED: Now uses shared ResponsiveContext.
 * All components share a single debounced resize listener.
 *
 * Usage:
 * ```tsx
 * const { isMobile, isTablet, isDesktop } = useResponsive()
 *
 * return (
 *   <Button size={isMobile ? 'sm' : 'md'}>
 *     Click me
 *   </Button>
 * )
 * ```
 */
export function useResponsive() {
  return useResponsiveContext()
}

/**
 * Hook for mobile-specific utilities.
 *
 * Usage:
 * ```tsx
 * const isMobile = useIsMobile()
 * ```
 */
export function useIsMobile(): boolean {
  return useIsMobileContext()
}

/**
 * Hook for touch device detection.
 *
 * Usage:
 * ```tsx
 * const isTouch = useIsTouch()
 * ```
 */
export function useIsTouch(): boolean {
  return useIsTouchContext()
}

