/**
 * Responsive Utility Classes
 * Provides consistent breakpoint utilities across the application
 */

/**
 * Container padding utilities for all breakpoints
 */
export const containerPadding = {
  xs: 'px-3',
  sm: 'px-4 sm:px-5',
  md: 'px-4 sm:px-6 md:px-7',
  lg: 'px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12',
  xl: 'px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16',
}

/**
 * Text size utilities for all breakpoints
 */
export const textSizes = {
  xs: 'text-xs sm:text-sm md:text-base',
  sm: 'text-sm sm:text-base md:text-lg',
  base: 'text-base sm:text-lg md:text-xl',
  lg: 'text-lg sm:text-xl md:text-2xl lg:text-3xl',
  xl: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl',
  '2xl': 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl',
}

/**
 * Heading utilities
 */
export const headings = {
  h1: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold',
  h2: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-semibold',
  h3: 'text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-semibold',
  h4: 'text-base sm:text-lg md:text-xl lg:text-2xl font-medium',
}

/**
 * Spacing utilities
 */
export const spacing = {
  xs: 'space-y-2 sm:space-y-3 md:space-y-4',
  sm: 'space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6',
  md: 'space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-8 xl:space-y-10',
  lg: 'space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12 xl:space-y-16',
}

/**
 * Grid column utilities
 */
export const gridCols = {
  '1': 'grid-cols-1',
  '2': 'grid-cols-1 sm:grid-cols-2',
  '3': 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
  '4': 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  '5': 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  '6': 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
}

/**
 * Card padding utilities
 */
export const cardPadding = {
  xs: 'p-2 sm:p-3 md:p-4',
  sm: 'p-3 sm:p-4 md:p-5 lg:p-6',
  md: 'p-4 sm:p-5 md:p-6 lg:p-7 xl:p-8',
  lg: 'p-5 sm:p-6 md:p-7 lg:p-8 xl:p-10 2xl:p-12',
}

/**
 * Gap utilities
 */
export const gaps = {
  xs: 'gap-1 sm:gap-2 md:gap-3',
  sm: 'gap-2 sm:gap-3 md:gap-4 lg:gap-5',
  md: 'gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8',
  lg: 'gap-4 sm:gap-5 md:gap-6 lg:gap-8 xl:gap-10 2xl:gap-12',
}

/**
 * Visibility utilities
 */
export const visibility = {
  hideXS: 'hidden xs:block',
  hideSM: 'hidden sm:block',
  hideMD: 'hidden md:block',
  hideLG: 'hidden lg:block',
  hideXL: 'hidden xl:block',
  showOnlyXS: 'block xs:hidden',
  showOnlySM: 'block sm:hidden md:block',
  showOnlyMD: 'block md:hidden lg:block',
  showOnlyLG: 'block lg:hidden xl:block',
}

/**
 * Max width utilities
 */
export const maxWidth = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
  screen: 'max-w-screen-xs xs:max-w-screen-sm sm:max-w-screen-md md:max-w-screen-lg lg:max-w-screen-xl xl:max-w-screen-2xl',
}


