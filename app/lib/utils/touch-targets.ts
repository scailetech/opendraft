/**
 * Touch Target Utilities
 * 
 * Utilities for ensuring touch targets meet accessibility guidelines.
 * WCAG 2.5.5: Target Size (Level AAA) recommends at least 44x44 CSS pixels.
 */

/**
 * Minimum touch target size in pixels (WCAG 2.5.5 Level AAA)
 */
export const MIN_TOUCH_TARGET_SIZE = 44

/**
 * Recommended touch target size in pixels
 */
export const RECOMMENDED_TOUCH_TARGET_SIZE = 48

/**
 * Calculates appropriate padding to meet touch target size
 * @param elementHeight Current element height in pixels
 * @returns Padding value to add to meet minimum size
 */
export function calculateTouchTargetPadding(elementHeight: number): number {
  const padding = Math.max(0, (MIN_TOUCH_TARGET_SIZE - elementHeight) / 2)
  return Math.ceil(padding)
}

/**
 * Gets Tailwind classes for touch-friendly button sizing
 * @param isMobile Whether on mobile device
 * @returns Tailwind classes for button sizing
 */
export function getTouchTargetClasses(isMobile: boolean = true): string {
  if (isMobile) {
    return 'min-h-[36px] px-4 py-2'
  }
  return 'min-h-[32px] px-3 py-1.5'
}

/**
 * Gets appropriate icon size for touch targets
 * @param isMobile Whether on mobile device
 * @returns Icon size class
 */
export function getTouchIconSize(isMobile: boolean = true): string {
  return isMobile ? 'h-5 w-5' : 'h-4 w-4'
}

/**
 * Gets appropriate spacing between touch targets
 * @param isMobile Whether on mobile device
 * @returns Spacing class
 */
export function getTouchSpacing(isMobile: boolean = true): string {
  return isMobile ? 'gap-3' : 'gap-2'
}

