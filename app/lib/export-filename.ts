/**
 * Export filename generation utilities
 * DRY function - ensures consistent, user-oriented filenames across RUN and EXECUTIONS exports
 * 
 * Format: {base}_{YYYY-MM-DD}_{HHmm}.{ext}
 * Example: leads_processed_2024-11-13_1430.csv
 * 
 * Clean, Cursor-inspired naming:
 * - Underscores for consistency (not mixing with hyphens)
 * - Date always included for sortability
 * - Time (HH:mm) for uniqueness without clutter
 * - No redundant words like "results" or "export"
 */

/**
 * Sanitize filename to be filesystem-safe
 * Removes or replaces special characters that could cause issues
 */
function sanitizeFilename(name: string): string {
  // Remove file extension if present
  const baseName = name.replace(/\.(csv|json|xlsx)$/i, '')
  
  // Replace spaces and special chars with underscores for consistency
  // Keep: letters, numbers, underscores
  // Convert hyphens to underscores for consistency
  return baseName
    .replace(/-/g, '_') // Convert hyphens to underscores
    .replace(/[^a-zA-Z0-9_]/g, '_') // Replace other special chars
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .substring(0, 80) // Limit length (shorter for cleaner names)
}

/**
 * Format timestamp for filename (sortable, filesystem-safe)
 * Format: YYYY-MM-DD_HHmm (clean, compact)
 */
function formatTimestampForFilename(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  
  return `${year}-${month}-${day}_${hours}${minutes}`
}

/**
 * Generate export filename
 * Format: {original-filename-base}_{YYYY-MM-DD}_{HHmm}.{ext}
 * 
 * @param originalFilename - Original CSV filename (e.g., "employees.csv")
 * @param timestamp - Batch creation or export time
 * @param format - File format ('csv', 'xlsx', or 'json')
 * @returns User-oriented, sortable filename
 * 
 * @example
 * generateExportFilename("employees.csv", new Date(), "csv")
 * // Returns: "employees_2024-11-13_1430.csv"
 * 
 * @example
 * generateExportFilename("Web Summit Leads.csv", new Date(), "xlsx")
 * // Returns: "Web_Summit_Leads_2024-11-13_1430.xlsx"
 */
export function generateExportFilename(
  originalFilename: string | null | undefined,
  timestamp: Date,
  format: 'csv' | 'xlsx' | 'json' = 'csv'
): string {
  // Sanitize original filename or use default
  const baseName = originalFilename
    ? sanitizeFilename(originalFilename)
    : 'bulk_run_export'
  
  // Format timestamp
  const timestampStr = formatTimestampForFilename(timestamp)
  
  // Combine: {base}_{timestamp}.{ext} - clean and minimal
  return `${baseName}_${timestampStr}.${format}`
}

/**
 * Generate export filename from batch data
 * Convenience function that extracts needed data from batch object
 * 
 * @param batch - Batch object with csv_filename and created_at
 * @param format - File format ('csv', 'xlsx', or 'json')
 * @returns User-oriented, sortable filename
 */
export function generateExportFilenameFromBatch(
  batch: {
    csv_filename?: string | null
    created_at?: string | Date | null
  },
  format: 'csv' | 'xlsx' | 'json' = 'csv'
): string {
  const originalFilename = batch.csv_filename || null
  const timestamp = batch.created_at
    ? new Date(batch.created_at)
    : new Date()
  
  return generateExportFilename(originalFilename, timestamp, format)
}

