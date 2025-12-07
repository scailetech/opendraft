/**
 * Progress Calculator Utilities
 * 
 * Utilities for calculating and formatting progress percentages.
 * Addresses P1 issue: "Progress Clarity: 100.0% shown even when 4/5 processed (misleading)"
 */

/**
 * Calculates accurate progress percentage
 * @param processed Number of items processed
 * @param total Total number of items
 * @returns Progress percentage (0-100)
 */
export function calculateProgress(processed: number, total: number): number {
  if (total === 0) return 0
  return Math.round((processed / total) * 100)
}

/**
 * Formats progress percentage for display
 * @param processed Number of items processed
 * @param total Total number of items
 * @param showDecimals Whether to show decimal places
 * @returns Formatted progress string (e.g., "80%" or "80.5%")
 */
export function formatProgress(
  processed: number,
  total: number,
  showDecimals: boolean = false
): string {
  if (total === 0) return '0%'
  
  const percentage = (processed / total) * 100
  
  if (showDecimals) {
    return `${percentage.toFixed(1)}%`
  }
  
  // Round to nearest integer
  return `${Math.round(percentage)}%`
}

/**
 * Formats progress with count (e.g., "4/5 (80%)")
 * @param processed Number of items processed
 * @param total Total number of items
 * @param showPercentage Whether to include percentage
 * @returns Formatted progress string
 */
export function formatProgressWithCount(
  processed: number,
  total: number,
  showPercentage: boolean = true
): string {
  if (showPercentage) {
    const percentage = formatProgress(processed, total, false)
    return `${processed}/${total} (${percentage})`
  }
  return `${processed}/${total}`
}

/**
 * Checks if progress is complete
 * @param processed Number of items processed
 * @param total Total number of items
 * @returns True if all items are processed
 */
export function isComplete(processed: number, total: number): boolean {
  return processed >= total && total > 0
}

/**
 * Gets progress status text
 * @param processed Number of items processed
 * @param total Total number of items
 * @returns Status text (e.g., "In Progress", "Complete")
 */
export function getProgressStatus(
  processed: number,
  total: number
): 'pending' | 'in-progress' | 'complete' {
  if (total === 0) return 'pending'
  if (processed === 0) return 'pending'
  if (isComplete(processed, total)) return 'complete'
  return 'in-progress'
}

