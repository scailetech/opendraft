/**
 * Table utility functions for data manipulation
 * Production-grade implementations with proper type safety
 */

export type SortDirection = 'asc' | 'desc'

export interface SortConfig<T> {
  key: keyof T
  direction: SortDirection
}

/**
 * Filter table rows based on search query
 * Searches across all string values in each row
 */
export function filterRows<T extends Record<string, unknown>>(
  data: T[],
  query: string
): T[] {
  if (!Array.isArray(data)) {
    throw new TypeError('Data must be an array')
  }

  if (!query || typeof query !== 'string') {
    return data
  }

  const lowerQuery = query.toLowerCase().trim()

  if (lowerQuery === '') {
    return data
  }

  return data.filter((row) => {
    return Object.values(row).some((value) => {
      // Only search in string values
      if (typeof value === 'string') {
        return value.toLowerCase().includes(lowerQuery)
      }

      // Convert numbers to strings for searching
      if (typeof value === 'number') {
        return value.toString().includes(lowerQuery)
      }

      return false
    })
  })
}

/**
 * Sort table rows by specified key and direction
 * Handles different data types safely
 */
export function sortRows<T extends Record<string, unknown>>(
  data: T[],
  key: keyof T,
  direction: SortDirection = 'asc'
): T[] {
  if (!Array.isArray(data)) {
    throw new TypeError('Data must be an array')
  }

  if (data.length === 0) {
    return data
  }

  // Create shallow copy to avoid mutating original
  const sortedData = [...data]

  sortedData.sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]

    // Handle null/undefined values
    if (aVal == null && bVal == null) return 0
    if (aVal == null) return direction === 'asc' ? 1 : -1
    if (bVal == null) return direction === 'asc' ? -1 : 1

    // Handle string comparison
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      const comparison = aVal.localeCompare(bVal)
      return direction === 'asc' ? comparison : -comparison
    }

    // Handle number comparison
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return direction === 'asc' ? aVal - bVal : bVal - aVal
    }

    // Handle boolean comparison
    if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
      return direction === 'asc'
        ? Number(aVal) - Number(bVal)
        : Number(bVal) - Number(aVal)
    }

    // Handle date comparison
    if (aVal instanceof Date && bVal instanceof Date) {
      return direction === 'asc'
        ? aVal.getTime() - bVal.getTime()
        : bVal.getTime() - aVal.getTime()
    }

    // Fallback: convert to string and compare
    const aStr = String(aVal)
    const bStr = String(bVal)
    const comparison = aStr.localeCompare(bStr)
    return direction === 'asc' ? comparison : -comparison
  })

  return sortedData
}

/**
 * Paginate table rows
 */
export function paginateRows<T>(
  data: T[],
  page: number,
  pageSize: number
): {
  rows: T[]
  totalPages: number
  currentPage: number
  totalRows: number
} {
  if (!Array.isArray(data)) {
    throw new TypeError('Data must be an array')
  }

  if (page < 1) {
    throw new RangeError('Page must be >= 1')
  }

  if (pageSize < 1) {
    throw new RangeError('Page size must be >= 1')
  }

  const totalRows = data.length
  const totalPages = Math.ceil(totalRows / pageSize)
  const currentPage = Math.min(page, totalPages || 1)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize

  return {
    rows: data.slice(startIndex, endIndex),
    totalPages,
    currentPage,
    totalRows,
  }
}

/**
 * Get unique values from a specific column
 */
export function getUniqueValues<T extends Record<string, unknown>>(
  data: T[],
  key: keyof T
): unknown[] {
  if (!Array.isArray(data)) {
    throw new TypeError('Data must be an array')
  }

  const uniqueSet = new Set(data.map((row) => row[key]))
  return Array.from(uniqueSet).filter((val) => val != null)
}

/**
 * Calculate summary statistics for numeric column
 */
export function calculateStats(
  data: Record<string, unknown>[],
  key: string
): {
  min: number
  max: number
  avg: number
  sum: number
  count: number
} | null {
  const values = data
    .map((row) => row[key])
    .filter((val): val is number => typeof val === 'number' && !isNaN(val))

  if (values.length === 0) {
    return null
  }

  const sum = values.reduce((acc, val) => acc + val, 0)
  const avg = sum / values.length
  const min = Math.min(...values)
  const max = Math.max(...values)

  return {
    min,
    max,
    avg,
    sum,
    count: values.length,
  }
}





