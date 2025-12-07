/**
 * Design Tokens
 * 
 * Centralized design system tokens for consistent styling.
 * Based on Cursor-inspired design principles.
 */

/**
 * Typography Scale
 * Standard text sizes following design system
 */
export const typography = {
  xs: 'text-xs',      // 12px
  sm: 'text-sm',      // 14px
  base: 'text-base',  // 16px
  lg: 'text-lg',      // 18px
  xl: 'text-xl',      // 20px
  '2xl': 'text-2xl',  // 24px
  '3xl': 'text-3xl',  // 30px
} as const

/**
 * Spacing Scale (4px/8px grid)
 * Standard spacing values following 4px/8px grid system
 */
export const spacing = {
  // Padding/Margin values (multiples of 4px)
  '0': '0',
  '0.5': 'p-0.5',     // 2px
  '1': 'p-1',         // 4px
  '1.5': 'p-1.5',     // 6px
  '2': 'p-2',         // 8px
  '2.5': 'p-2.5',     // 10px
  '3': 'p-3',         // 12px
  '4': 'p-4',         // 16px
  '5': 'p-5',         // 20px
  '6': 'p-6',         // 24px
  '8': 'p-8',         // 32px
  
  // Gap values
  gap: {
    '0': 'gap-0',
    '0.5': 'gap-0.5',   // 2px
    '1': 'gap-1',       // 4px
    '1.5': 'gap-1.5',   // 6px
    '2': 'gap-2',       // 8px
    '2.5': 'gap-2.5',   // 10px
    '3': 'gap-3',       // 12px
    '4': 'gap-4',       // 16px
    '6': 'gap-6',       // 24px
    '8': 'gap-8',       // 32px
  },
  
  // Space-y values (vertical spacing)
  spaceY: {
    '1': 'space-y-1',   // 4px
    '2': 'space-y-2',   // 8px
    '3': 'space-y-3',   // 12px
    '4': 'space-y-4',   // 16px
    '6': 'space-y-6',   // 24px
  },
} as const

/**
 * Border Radius Scale
 * Standard border radius values (4 primary values recommended)
 */
export const borderRadius = {
  none: 'rounded-none',
  sm: 'rounded-sm',     // 4px - inputs, badges
  md: 'rounded-md',     // 6px - buttons, cards
  lg: 'rounded-lg',     // 8px - modals, dropdowns
  xl: 'rounded-xl',     // 12px - containers
  '2xl': 'rounded-2xl', // 16px - large cards
  full: 'rounded-full', // pills, avatars
} as const


/**
 * Color Tokens Reference
 * Use CSS variables from globals.css
 */
export const colors = {
  // Background colors - use design tokens
  background: {
    primary: 'bg-background',
    secondary: 'bg-secondary',
    card: 'bg-card',
    popover: 'bg-popover',
    muted: 'bg-muted',
    accent: 'bg-accent',
  },
  
  // Text colors - use design tokens
  text: {
    primary: 'text-foreground',
    secondary: 'text-muted-foreground',
    accent: 'text-accent-foreground',
    destructive: 'text-destructive',
  },
  
  // Border colors - use design tokens
  border: {
    default: 'border-border',
    input: 'border-input',
    ring: 'border-ring',
  },
} as const

/**
 * Helper function to get standardized spacing class
 */
export function getSpacing(multiplier: number): string {
  const spacingMap: Record<number, string> = {
    0: 'p-0',
    1: 'p-1',      // 4px
    2: 'p-2',      // 8px
    3: 'p-3',      // 12px
    4: 'p-4',      // 16px
    5: 'p-5',      // 20px
    6: 'p-6',      // 24px
    8: 'p-8',      // 32px
  }
  return spacingMap[multiplier] || `p-${multiplier}`
}

/**
 * Helper function to get standardized gap class
 */
export function getGap(multiplier: number): string {
  const gapMap: Record<number, string> = {
    0: 'gap-0',
    1: 'gap-1',    // 4px
    2: 'gap-2',    // 8px
    3: 'gap-3',    // 12px
    4: 'gap-4',    // 16px
    6: 'gap-6',    // 24px
    8: 'gap-8',    // 32px
  }
  return gapMap[multiplier] || `gap-${multiplier}`
}

/**
 * Responsive Padding Utilities
 * Standard responsive padding patterns used throughout the app
 */
export const padding = {
  // Standard content padding: 16px mobile, 24px desktop
  content: 'padding-content',  // p-4 md:p-6
  
  // Horizontal padding: 16px mobile, 24px desktop
  horizontal: 'padding-horizontal',  // px-4 sm:px-6
  
  // Vertical padding: 16px mobile, 24px desktop
  vertical: 'padding-vertical',  // py-4 md:py-6
} as const

/**
 * Status Icon Patterns
 * Use the StatusIcon component from components/ui/status-icon.tsx
 * 
 * Variants: 'success' | 'error' | 'warning' | 'pending' | 'processing' | 'info'
 * Sizes: 'xs' | 'sm' | 'md' | 'lg'
 * 
 * Color Philosophy:
 * - Icons carry semantic color (green for success, red for error, etc.)
 * - Backgrounds remain neutral or use subtle tints (10% opacity max)
 * - Text colors match icon color for status labels
 * 
 * Example:
 * ```tsx
 * <StatusIcon variant="success" size="md" />
 * <StatusIcon variant="error" size="sm" withBackground label="Failed" />
 * ```
 */
export const statusColors = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  pending: 'text-muted-foreground',
  processing: 'text-primary',
  info: 'text-blue-500',
} as const

/**
 * Touch Target Minimum
 * All interactive elements should have at least 44x44px touch area
 */
export const touchTarget = {
  minimum: 'min-h-[44px] min-w-[44px]',
  // For small buttons, add padding to extend hit area
  paddedSmall: 'p-3', // 12px padding around small element
} as const

/**
 * Table Header Standards
 * Consistent styling for all table headers
 */
export const tableHeader = {
  base: 'text-xs font-semibold text-muted-foreground uppercase tracking-wider',
  padding: 'px-4 sm:px-6 py-2.5',
  background: 'bg-secondary/40 border-b border-border/50',
} as const

/**
 * Animation Timing
 * Standard animation durations for consistency
 */
export const animation = {
  fast: '150ms',
  default: '200ms',
  slow: '300ms',
  // Easing functions
  easeOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const

