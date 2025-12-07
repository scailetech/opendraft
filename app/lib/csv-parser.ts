import Papa from 'papaparse'
import { CSVRow, ParsedCSV, BulkGPTError } from './types'

// === CONSTANTS ===

// Dangerous column names that could cause JS prototype pollution
const FORBIDDEN_COLUMN_NAMES = new Set([
  '__proto__', 'constructor', 'prototype', 'hasOwnProperty',
  'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString',
  'toString', 'valueOf'
])

// Maximum length for a single cell value (100KB should be plenty)
const MAX_CELL_VALUE_LENGTH = 100 * 1024

// Valid MIME types for CSV files (browsers report different types)
const VALID_CSV_MIME_TYPES = new Set([
  'text/csv',
  'application/csv', 
  'application/vnd.ms-excel', // Windows/IE can report this for CSV
  'text/plain', // Some systems report CSV as plain text
  'text/comma-separated-values',
  '', // Some browsers don't report MIME type at all
])

// === HELPER FUNCTIONS ===

/**
 * Check if text contains encoding issues (replacement characters or garbled patterns)
 * Returns true if encoding problems are detected
 */
function hasEncodingIssues(text: string): boolean {
  // Check for replacement character (�) - indicates failed UTF-8 decoding
  if (text.includes('\uFFFD')) return true
  
  // Check for common garbled patterns from ISO-8859-1/Windows-1252 misread as UTF-8
  // These patterns appear when accented characters are incorrectly decoded
  const garbledPatterns = [
    /Ã¤|Ã¶|Ã¼|Ã„|Ã–|Ãœ/, // German umlauts garbled
    /Ã©|Ã¨|Ãª|Ã |Ã¢/, // French accents garbled
    /Ã±|Ã¡|Ã­|Ã³|Ãº/, // Spanish accents garbled
    /â€™|â€œ|â€|â€¢/, // Smart quotes garbled
  ]
  
  return garbledPatterns.some(pattern => pattern.test(text))
}

/**
 * Sanitize cell value to prevent CSV injection attacks
 * Prefixes formulas with single quote to disable execution in Excel/Google Sheets
 *
 * Formula characters that can execute code:
 * - = (formula)
 * - + (formula)
 * - - (formula)
 * - @ (formula in Excel)
 * - \t (tab, can be used for injection)
 * - \r (carriage return, can be used for injection)
 *
 * @see https://owasp.org/www-community/attacks/CSV_Injection
 */
function sanitizeCSVCell(value: unknown): string {
  // Handle non-string values
  if (value === null || value === undefined) {
    return ''
  }

  let stringValue = String(value)

  // Truncate extremely long values to prevent memory issues
  // 100KB should be plenty for any reasonable cell value
  if (stringValue.length > MAX_CELL_VALUE_LENGTH) {
    stringValue = stringValue.substring(0, MAX_CELL_VALUE_LENGTH) + '... [truncated]'
  }

  // Check if value starts with dangerous characters
  if (/^[=+\-@\t\r]/.test(stringValue)) {
    // Prefix with single quote to disable formula execution
    // Excel/Google Sheets will treat it as literal text
    return `'${stringValue}`
  }

  return stringValue
}

// === MAIN PARSER ===

export async function parseCSV(file: File): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {
    // Validate file is not empty
    if (file.size === 0) {
      reject(
        new BulkGPTError(
          'EMPTY_FILE',
          'CSV file is empty (0 bytes)',
          { filename: file.name }
        )
      )
      return
    }

    // Validate file type - check extension OR MIME type (be permissive)
    const hasCSVExtension = file.name.toLowerCase().endsWith('.csv')
    const hasValidMimeType = VALID_CSV_MIME_TYPES.has(file.type)
    
    if (!hasCSVExtension && !hasValidMimeType) {
      reject(
        new BulkGPTError(
          'INVALID_FILE_TYPE',
          'Only CSV files are supported. Please upload a file with .csv extension.',
          { filename: file.name, mimeType: file.type }
        )
      )
      return
    }

    // Validate file size (10MB limit to match dropzone)
    const maxSizeBytes = 10 * 1024 * 1024
    if (file.size > maxSizeBytes) {
      reject(
        new BulkGPTError(
          'FILE_TOO_LARGE',
          `File too large. Maximum size: 10MB. Your file: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
          { fileSize: file.size, maxSize: maxSizeBytes }
        )
      )
      return
    }

    // Parse CSV with papaparse
    // Auto-detect delimiter to handle European CSVs (semicolon), tabs, etc.
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      delimitersToGuess: [',', ';', '\t', '|'],
      // Clean up column names: trim whitespace, remove BOM, remove newlines
      // BOM (Byte Order Mark) is common in Excel UTF-8 exports and breaks column matching
      // Newlines in headers would break template matching and UI display
      transformHeader: (header: string) => {
        const cleaned = header
          .trim()
          .replace(/^\uFEFF/, '') // Remove BOM
          .replace(/[\r\n]+/g, ' ') // Replace newlines with space
          .replace(/\s+/g, ' ') // Normalize multiple spaces
        return cleaned
      },
      complete: (result) => {
        try {
          // BE FORGIVING: Don't fail on parse errors - just skip bad rows
          // Common issues: truncated files, unterminated quotes, encoding problems
          const parseErrors = result.errors.filter(e => e.code !== 'TooManyFields' && e.code !== 'UndetectableDelimiter')
          
          // Log errors for debugging but don't fail
          if (parseErrors.length > 0) {
            console.warn(`CSV parse warnings (${parseErrors.length} issues):`, parseErrors.slice(0, 3))
          }

          // Validate we have data (even with errors, PapaParse usually parses what it can)
          if (!result.data || result.data.length === 0) {
            throw new BulkGPTError(
              'EMPTY_CSV',
              'CSV file contains no data rows',
              { filename: file.name }
            )
          }

          // Get columns from first row and filter out empty column names
          // (common with Google Sheets/Excel exports that have trailing empty columns)
          const allColumns = Object.keys(result.data[0])
          const columns = allColumns.filter(col => col && col.trim())
          
          if (columns.length === 0) {
            throw new BulkGPTError(
              'NO_COLUMNS',
              'CSV file has no columns with names',
              { filename: file.name }
            )
          }

          // Check for forbidden column names (prototype pollution prevention)
          const forbiddenFound = columns.filter(col => FORBIDDEN_COLUMN_NAMES.has(col))
          if (forbiddenFound.length > 0) {
            throw new BulkGPTError(
              'FORBIDDEN_COLUMN_NAMES',
              `CSV contains reserved column names: ${forbiddenFound.join(', ')}. Please rename these columns.`,
              { filename: file.name, forbiddenColumns: forbiddenFound }
            )
          }

          // Check for duplicate column names (after trimming by transformHeader)
          const columnCounts = new Map<string, number>()
          columns.forEach(col => {
            const count = columnCounts.get(col) || 0
            columnCounts.set(col, count + 1)
          })
          const duplicates = Array.from(columnCounts.entries())
            .filter(([, count]) => count > 1)
            .map(([col]) => col)

          if (duplicates.length > 0) {
            throw new BulkGPTError(
              'DUPLICATE_COLUMN_NAMES',
              `CSV has duplicate column names: ${duplicates.join(', ')}. Each column must have a unique name.`,
              { filename: file.name, duplicateColumns: duplicates }
            )
          }

          // Validate max columns (50 limit)
          if (columns.length > 50) {
            throw new BulkGPTError(
              'TOO_MANY_COLUMNS',
              `CSV has ${columns.length} columns. Maximum is 50.`,
              { columnCount: columns.length, maxColumns: 50 }
            )
          }

          // Validate max rows (10,000 limit)
          if (result.data.length > 10000) {
            throw new BulkGPTError(
              'TOO_MANY_ROWS',
              `CSV has ${result.data.length} rows. Maximum is 10,000.`,
              { rowCount: result.data.length, maxRows: 10000 }
            )
          }

          // Convert to CSVRow format and sanitize cell values to prevent CSV injection
          // Only include columns that have names (filter out empty column data)
          // Also check for encoding issues
          let hasEncodingProblems = false
          const rows: CSVRow[] = result.data.map((row, index) => {
            // Sanitize each cell value in the row, only for valid columns
            const sanitizedRow: Record<string, string> = {}
            for (const col of columns) {
              const value = sanitizeCSVCell(row[col])
              sanitizedRow[col] = value
              // Check first few rows for encoding issues (sampling for performance)
              if (index < 10 && !hasEncodingProblems && value && hasEncodingIssues(value)) {
                hasEncodingProblems = true
              }
            }

            return {
              data: sanitizedRow,
              rowIndex: index,
            }
          })

          // Build warnings array
          const warnings: string[] = []
          
          // Warn about parse errors (rows that were skipped)
          if (parseErrors.length > 0) {
            const skippedCount = parseErrors.length
            warnings.push(`${skippedCount} row${skippedCount > 1 ? 's were' : ' was'} skipped due to formatting issues (e.g., truncated data, unescaped quotes).`)
          }
          
          if (hasEncodingProblems) {
            warnings.push('Some characters may not display correctly. If you see garbled text (Ã¤, â€™, etc.), try saving your CSV as UTF-8 encoded.')
          }

          resolve({
            filename: file.name,
            rows,
            columns,
            totalRows: rows.length,
            warnings: warnings.length > 0 ? warnings : undefined,
          })
        } catch (error) {
          if (error instanceof BulkGPTError) {
            reject(error)
          } else {
            reject(
              new BulkGPTError(
                'UNKNOWN_ERROR',
                error instanceof Error ? error.message : 'Unknown error parsing CSV'
              )
            )
          }
        }
      },
      error: (error) => {
        reject(
          new BulkGPTError(
            'CSV_READ_ERROR',
            `Failed to read CSV file: ${error.message}`,
            { error: error.message }
          )
        )
      },
    })
  })
}





