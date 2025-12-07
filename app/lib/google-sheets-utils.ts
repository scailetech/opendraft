/**
 * Utilities for converting Google Sheets data to CSV format
 */

import type { ParsedCSV, CSVRow } from './types'

/**
 * Convert Google Sheets 2D array to ParsedCSV format
 */
export function convertSheetsToCSV(
  values: string[][],
  filename: string = 'google-sheet.csv'
): ParsedCSV {
  if (!values || values.length === 0) {
    throw new Error('No data found in Google Sheet')
  }

  // First row is headers
  const headers = values[0].map((h, i) => h.trim() || `Column${i + 1}`)
  
  // Remaining rows are data
  const dataRows = values.slice(1).filter(row => 
    // Filter out completely empty rows
    row.some(cell => cell.trim() !== '')
  )

  // Convert to CSVRow format
  const rows: CSVRow[] = dataRows.map((row, index) => {
    const rowData: Record<string, string> = {}
    headers.forEach((header, colIndex) => {
      rowData[header] = row[colIndex]?.trim() || ''
    })
    return {
      data: rowData,
      rowIndex: index + 1, // 1-indexed
    }
  })

  return {
    filename,
    rows,
    columns: headers,
    totalRows: rows.length,
  }
}

/**
 * Convert Google Sheets data to CSV string (for download)
 */
export function sheetsToCSVString(values: string[][]): string {
  if (!values || values.length === 0) {
    return ''
  }

  return values
    .map(row => {
      // Escape cells that contain commas, quotes, or newlines
      return row.map(cell => {
        const cellStr = String(cell || '')
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`
        }
        return cellStr
      }).join(',')
    })
    .join('\n')
}


















