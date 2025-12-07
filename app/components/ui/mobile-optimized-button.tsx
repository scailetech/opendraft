/**
 * MobileOptimizedButton Component
 * 
 * Button component optimized for mobile with appropriate touch targets.
 * Ensures buttons meet WCAG 2.5.5 Target Size requirements.
 */

'use client'

import React from 'react'
import { Button, ButtonProps } from '@/components/ui/button'
import { useResponsive } from '@/hooks/useResponsive'
import { getTouchTargetClasses } from '@/lib/utils/touch-targets'
import { cn } from '@/lib/utils'

interface MobileOptimizedButtonProps extends ButtonProps {
  /** Whether to force mobile sizing */
  forceMobile?: boolean
  /** Whether to use touch-optimized sizing */
  touchOptimized?: boolean
}

/**
 * Button component optimized for mobile devices with appropriate touch targets.
 * 
 * Usage:
 * ```tsx
 * <MobileOptimizedButton variant="default">
 *   Click me
 * </MobileOptimizedButton>
 * ```
 */
export function MobileOptimizedButton({
  className,
  forceMobile = false,
  touchOptimized = true,
  children,
  ...props
}: MobileOptimizedButtonProps) {
  const { isMobile, isTouch } = useResponsive()
  const shouldOptimize = touchOptimized && (isMobile || isTouch || forceMobile)

  return (
    <Button
      className={cn(
        shouldOptimize && getTouchTargetClasses(isMobile),
        className
      )}
      {...props}
    >
      {children}
    </Button>
  )
}

/**
 * Wrapper for icon buttons to ensure touch-friendly sizing
 */
export function MobileOptimizedIconButton({
  className,
  children,
  ...props
}: MobileOptimizedButtonProps) {
  const { isMobile, isTouch } = useResponsive()
  const shouldOptimize = isMobile || isTouch

  return (
    <Button
      className={cn(
        shouldOptimize && 'min-h-[36px] min-w-[36px]',
        className
      )}
      {...props}
    >
      {children}
    </Button>
  )
}

