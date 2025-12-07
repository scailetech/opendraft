/**
 * ABOUTME: Table sorting utilities for results display
 * ABOUTME: Provides type-safe, stable sorting for different column types
 */

export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  column: string | null
  direction: SortDirection
}

/**
 * Status priority for sorting (lower number = higher priority)
 */
const STATUS_PRIORITY: Record<string, number> = {
  pending: 1,
  processing: 2,
  completed: 3,
  failed: 4,
}

/**
 * Safe comparison function for strings (case-insensitive)
 */
function compareStrings(a: string | null | undefined, b: string | null | undefined): number {
  // Handle null/undefined - sort to end
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1

  return a.toLowerCase().localeCompare(b.toLowerCase())
}

/**
 * Safe comparison function for status values
 */
function compareStatus(a: string, b: string): number {
  const priorityA = STATUS_PRIORITY[a] ?? 999
  const priorityB = STATUS_PRIORITY[b] ?? 999
  return priorityA - priorityB
}

/**
 * Sort results by column with stable sorting
 *
 * @param results - Array of results to sort
 * @param sortConfig - Sort configuration (column and direction)
 * @param columns - Input column names from CSV
 * @param outputColumns - Output column names
 * @returns Sorted array (does not mutate original)
 */
export function sortResults<T extends {
  id: string
  input: Record<string, string>
  output: string
  status: string
  error?: string
}>(
  results: T[],
  sortConfig: SortConfig,
  columns: string[],
  outputColumns: string[]
): T[] {
  // No sorting if column is not specified
  if (!sortConfig.column) {
    return results
  }

  // Create shallow copy to avoid mutating original array
  const sorted = [...results]

  sorted.sort((a, b) => {
    let comparison = 0

    if (sortConfig.column === 'status') {
      // Sort by status priority
      comparison = compareStatus(a.status, b.status)
    } else if (sortConfig.column && columns.includes(sortConfig.column)) {
      // Sort by input column
      const aValue = a.input[sortConfig.column] ?? null
      const bValue = b.input[sortConfig.column] ?? null
      comparison = compareStrings(aValue, bValue)
    } else if (sortConfig.column && outputColumns.includes(sortConfig.column)) {
      // Sort by output column
      try {
        const aOutput = typeof a.output === 'string' ? JSON.parse(a.output) : a.output
        const bOutput = typeof b.output === 'string' ? JSON.parse(b.output) : b.output

        const aValue = aOutput?.[sortConfig.column] ?? null
        const bValue = bOutput?.[sortConfig.column] ?? null

        // Handle nested objects/arrays - convert to string for comparison
        const aStr = typeof aValue === 'object' ? JSON.stringify(aValue) : String(aValue ?? '')
        const bStr = typeof bValue === 'object' ? JSON.stringify(bValue) : String(bValue ?? '')

        comparison = compareStrings(aStr, bStr)
      } catch {
        // If JSON parsing fails, fall back to raw output comparison
        comparison = compareStrings(a.output ?? null, b.output ?? null)
      }
    }

    // Apply sort direction
    return sortConfig.direction === 'asc' ? comparison : -comparison
  })

  return sorted
}

/**
 * Toggle sort direction or set new column
 *
 * @param currentSort - Current sort configuration
 * @param newColumn - Column to sort by
 * @returns New sort configuration
 */
export function toggleSort(currentSort: SortConfig, newColumn: string): SortConfig {
  // If clicking same column, toggle direction
  if (currentSort.column === newColumn) {
    return {
      column: newColumn,
      direction: currentSort.direction === 'asc' ? 'desc' : 'asc',
    }
  }

  // If clicking new column, start with ascending
  return {
    column: newColumn,
    direction: 'asc',
  }
}
