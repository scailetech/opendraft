/**
 * Consistency Helpers
 * 
 * Utility functions to ensure consistent spacing, typography, and styling.
 */

import { cn } from './utils'

/**
 * Standard spacing classes following 4px/8px grid
 */
export const standardSpacing = {
  // Padding (multiples of 4px)
  p1: 'p-1',      // 4px
  p2: 'p-2',      // 8px
  p3: 'p-3',      // 12px
  p4: 'p-4',      // 16px
  p5: 'p-5',      // 20px
  p6: 'p-6',      // 24px
  
  // Padding X (horizontal)
  px1: 'px-1',    // 4px
  px2: 'px-2',    // 8px
  px3: 'px-3',    // 12px
  px4: 'px-4',    // 16px
  px6: 'px-6',    // 24px
  
  // Padding Y (vertical)
  py1: 'py-1',    // 4px
  py2: 'py-2',    // 8px
  py3: 'py-3',    // 12px
  py4: 'py-4',    // 16px
  py6: 'py-6',    // 24px
  
  // Gap
  gap1: 'gap-1',  // 4px
  gap2: 'gap-2',  // 8px
  gap3: 'gap-3',  // 12px
  gap4: 'gap-4',  // 16px
  gap6: 'gap-6',  // 24px
  
  // Space Y (vertical spacing between children)
  spaceY1: 'space-y-1',  // 4px
  spaceY2: 'space-y-2',  // 8px
  spaceY3: 'space-y-3',  // 12px
  spaceY4: 'space-y-4',  // 16px
  spaceY6: 'space-y-6',  // 24px
} as const

/**
 * Standard typography classes
 */
export const standardTypography = {
  xs: 'text-xs',      // 12px
  sm: 'text-sm',      // 14px
  base: 'text-base',  // 16px
  lg: 'text-lg',      // 18px
  xl: 'text-xl',      // 20px
} as const

/**
 * Standard border radius classes
 */
export const standardRadius = {
  sm: 'rounded-sm',   // 4px
  md: 'rounded-md',    // 6px
  lg: 'rounded-lg',    // 8px
  xl: 'rounded-xl',    // 12px
} as const

/**
 * Helper to combine standard spacing classes
 */
export function combineSpacing(...classes: (string | undefined)[]): string {
  return cn(...classes.filter(Boolean))
}

