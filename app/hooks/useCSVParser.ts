/**
 * V2 Hook: CSV Parser with State Management
 * 
 * Wraps the csv-parser utility with React state for component use
 * Handles parsing state, errors, and provides parsed data
 * 
 * @example
 * const { parseFile, csvData, isParsing, error } = useCSVParser()
 * 
 * await parseFile(file)
 * console.log(csvData) // ParsedCSV object
 */

import { useState, useCallback } from 'react'
import { parseCSV } from '@/lib/csv-parser'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import type { ParsedCSV } from '@/lib/types'

export interface UseCSVParserReturn {
  csvData: ParsedCSV | null
  isParsing: boolean
  error: string | null
  
  parseFile: (file: File) => Promise<ParsedCSV | null>
  setParsedData: (data: ParsedCSV) => void
  renameColumn: (oldName: string, newName: string) => void
  clearData: () => void
  clearError: () => void
}

/**
 * Custom hook for CSV parsing with state management
 * Separates parsing logic from component rendering
 */
export function useCSVParser(): UseCSVParserReturn {
  const [csvData, setCsvData] = useState<ParsedCSV | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Parse a CSV file and update state
   * Returns parsed data or null on error
   */
  const parseFile = useCallback(async (file: File): Promise<ParsedCSV | null> => {
    setIsParsing(true)
    setError(null)

    try {
      // Use the existing csv-parser utility
      const parsed = await parseCSV(file)
      
      // Update state
      setCsvData(parsed)
      
      // Track successful parse
      trackEvent(ANALYTICS_EVENTS.FILE_UPLOADED, {
        fileName: file.name,
        fileSize: file.size,
        rowCount: parsed.totalRows,
        columnCount: parsed.columns.length,
      })
      
      return parsed
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse CSV'
      setError(errorMessage)
      setCsvData(null)
      
      // Track parse error
      trackEvent(ANALYTICS_EVENTS.FILE_PARSE_ERROR, {
        fileName: file.name,
        fileSize: file.size,
        error: errorMessage,
        stage: 'parsing',
      })
      
      return null
      
    } finally {
      setIsParsing(false)
    }
  }, [])

  /**
   * Set parsed data directly (useful for Google Sheets integration)
   */
  const setParsedData = useCallback((data: ParsedCSV) => {
    setCsvData(data)
    setError(null)
  }, [])

  /**
   * Clear parsed data
   */
  const clearData = useCallback(() => {
    setCsvData(null)
    setError(null)
  }, [])

  /**
   * Clear error only
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Rename a column in the CSV data
   * Updates both the columns array and all row data keys
   */
  const renameColumn = useCallback((oldName: string, newName: string) => {
    if (!csvData) return
    if (oldName === newName) return
    if (!newName.trim()) return
    
    // Check if new name already exists
    if (csvData.columns.includes(newName)) {
      setError(`Column "${newName}" already exists`)
      return
    }
    
    // Update columns array
    const newColumns = csvData.columns.map(col => 
      col === oldName ? newName : col
    )
    
    // Update all row data keys
    const newRows = csvData.rows.map(row => ({
      ...row,
      data: Object.fromEntries(
        Object.entries(row.data).map(([key, value]) => [
          key === oldName ? newName : key,
          value
        ])
      )
    }))
    
    setCsvData({
      ...csvData,
      columns: newColumns,
      rows: newRows,
    })
  }, [csvData])

  return {
    csvData,
    isParsing,
    error,
    parseFile,
    setParsedData,
    renameColumn,
    clearData,
    clearError,
  }
}
