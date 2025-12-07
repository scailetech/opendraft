/**
 * Date formatting utilities
 * Shared utilities for consistent date/time display across the application
 */

/**
 * Format a date as relative time (e.g., "5m ago", "2h ago", "3d ago")
 * Falls back to formatted date for older dates
 * 
 * @param dateString - ISO date string or Date object
 * @returns Formatted relative time string
 */
export function formatRelativeTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

