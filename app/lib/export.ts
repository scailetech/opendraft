import Papa from 'papaparse'
import ExcelJS from 'exceljs'

/**
 * Export utilities for converting data to various formats
 * Follows production-grade patterns with proper type safety
 */

export interface ExportOptions {
  filename?: string
  includeHeaders?: boolean
}

export interface ExportMetadata {
  batchId?: string
  timestamp?: string
  [key: string]: unknown
}

/**
 * SECURITY: Sanitize cell value to prevent CSV injection
 * CSV injection occurs when cells start with =, +, -, @, or tab
 * which can execute formulas in Excel/Sheets
 * 
 * Also normalizes problematic characters:
 * - Smart quotes to ASCII quotes (prevents re-import issues)
 * - Removes NUL characters
 */
function sanitizeCSVCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  let str = String(value)
  
  // Normalize smart quotes to ASCII (prevents CSV parsing issues on re-import)
  str = str
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')  // Smart double quotes → "
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")  // Smart single quotes → '
    .replace(/\u0000/g, '')  // Remove NUL characters
  
  // If the cell starts with a potentially dangerous character, prefix with single quote
  // This tells Excel to treat it as text, not a formula
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`
  }
  return str
}

/**
 * Sanitize all values in a record to prevent CSV injection
 */
function sanitizeRecordForCSV<T extends Record<string, unknown>>(record: T): Record<string, string> {
  const sanitized: Record<string, string> = {}
  for (const [key, value] of Object.entries(record)) {
    sanitized[key] = sanitizeCSVCell(value)
  }
  return sanitized
}

/**
 * Convert array of objects to CSV format
 * Uses papaparse for reliable CSV generation
 * 
 * SECURITY: Sanitizes values to prevent CSV injection attacks
 * COMPATIBILITY: Uses proper quoting for Apple Numbers, Excel, Google Sheets
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _metadata?: ExportMetadata
): string {
  if (!Array.isArray(data)) {
    throw new TypeError('Data must be an array')
  }

  if (data.length === 0) {
    return ''
  }

  // SECURITY: Sanitize all values to prevent CSV injection
  const sanitizedData = data.map(record => sanitizeRecordForCSV(record))

  // Generate CSV with settings optimized for spreadsheet compatibility
  // - quoteChar: double quotes (standard)
  // - quotes: true forces all fields to be quoted (helps Numbers parse correctly)
  // - escapeChar: double quote (standard CSV escaping)
  const csv = Papa.unparse(sanitizedData, {
    header: true,
    skipEmptyLines: true,
    quotes: true, // Quote all fields for better compatibility
    quoteChar: '"',
    escapeChar: '"',
  })

  // Add UTF-8 BOM for Excel/Numbers compatibility with special characters
  const BOM = '\uFEFF'
  return BOM + csv
}

/**
 * Convert array of objects to JSON format
 * Returns structured object with results and optional metadata
 */
export function exportToJSON<T extends Record<string, unknown>>(
  data: T[],
  metadata?: ExportMetadata
): string {
  if (!Array.isArray(data)) {
    throw new TypeError('Data must be an array')
  }

  const output: {
    results: T[]
    metadata?: ExportMetadata
    exportedAt: string
  } = {
    results: data,
    exportedAt: new Date().toISOString(),
  }

  if (metadata) {
    output.metadata = metadata
  }

  return JSON.stringify(output, null, 2)
}

/**
 * Trigger browser download of content
 * Creates a blob and simulates click on download link
 * 
 * Note: Safari users with "Ask where to save" enabled will still see a dialog.
 * This is a browser setting that cannot be overridden programmatically.
 */
export function downloadFile(
  content: string,
  filename: string,
  _mimeType?: string // Unused - we use octet-stream to force download
): void {
  if (!content || typeof content !== 'string') {
    throw new TypeError('Content must be a non-empty string')
  }

  if (!filename || typeof filename !== 'string') {
    throw new TypeError('Filename must be a non-empty string')
  }

  // Use octet-stream to force download instead of opening in browser
  const blob = new Blob([content], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)

  // Create and configure link
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.cssText = 'position:fixed;left:-9999px;top:-9999px;'
  
  // Append to body (required for Firefox)
  document.body.appendChild(link)
  
  // Trigger download
  link.click()
  
  // Cleanup link immediately
  document.body.removeChild(link)
  
  // IMPORTANT: Delay revoking URL to allow download to complete
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}

/**
 * Export and download data as CSV
 */
export function downloadCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string
): void {
  const csv = exportToCSV(data)
  downloadFile(csv, filename, 'text/csv;charset=utf-8;')
}

/**
 * Export and download data as JSON
 * @deprecated Use downloadXLSX instead for better Excel compatibility
 */
export function downloadJSON<T extends Record<string, unknown>>(
  data: T[],
  filename: string
): void {
  const json = exportToJSON(data)
  downloadFile(json, filename, 'application/json;charset=utf-8;')
}

/**
 * Export and download data as XLSX (Excel)
 * Uses ExcelJS for secure Excel file generation
 */
export async function downloadXLSX<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  sheetName = 'Results'
): Promise<void> {
  if (!Array.isArray(data)) {
    throw new TypeError('Data must be an array')
  }
  
  if (!data || data.length === 0) {
    throw new Error('No data to export')
  }

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'bulk.run'
  workbook.created = new Date()
  
  const worksheet = workbook.addWorksheet(sheetName)
  
  // Get columns from first row
  const columns = Object.keys(data[0])
  
  // Set up columns with headers and auto-width
  worksheet.columns = columns.map(key => ({
    header: key,
    key: key,
    width: Math.min(
      Math.max(
        key.length,
        ...data.slice(0, 100).map(row => {
          const value = row[key]
          if (value === null || value === undefined) return 0
          return String(value).length
        })
      ) + 2,
      50 // Cap at 50 chars
    )
  }))
  
  // Style header row
  worksheet.getRow(1).font = { bold: true }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  }
  
  // Add data rows
  data.forEach(row => {
    const rowData: Record<string, unknown> = {}
    columns.forEach(col => {
      rowData[col] = row[col] ?? ''
    })
    worksheet.addRow(rowData)
  })
  
  // Ensure filename ends with .xlsx
  const xlsxFilename = filename.endsWith('.xlsx') 
    ? filename 
    : filename.replace(/\.[^.]+$/, '.xlsx')
  
  // Generate buffer and download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  })
  const url = URL.createObjectURL(blob)
  
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = xlsxFilename
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Batch result structure from database/API
 */
export interface BatchResultRow {
  input_data: Record<string, unknown> | string
  output_data: Record<string, unknown> | string | null
  status: string
  error_message?: string | null
  input_tokens?: number | null
  output_tokens?: number | null
  model?: string | null
  row_index?: number
  tools_used?: string[] | string | null
}

/**
 * Flattened result ready for CSV/JSON export
 * Single source of truth for export format - ensures RUN and EXECUTIONS exports are always aligned
 */
export interface FlattenedExportResult extends Record<string, unknown> {
  '#': number
  status: string
}

/**
 * Export options for controlling what columns to include
 */
export interface ExportColumnOptions {
  includeTokens?: boolean
  includeModel?: boolean
  includeError?: boolean
  includeTools?: boolean
}

/**
 * Flatten batch results for export
 * DRY function - single source of truth for export format
 * Ensures RUN page and EXECUTIONS page exports are always 100% aligned
 * 
 * COLUMN ORDER (matches Results page exactly):
 * 1. # (row number)
 * 2. status
 * 3. Input columns (from input_data)
 * 4. Output columns (from output_data)
 * 5. (Optional) error, input_tokens, output_tokens, model - at the end
 * 
 * @param results - Array of batch result rows from database/API
 * @param options - Optional column inclusion settings
 * @returns Array of flattened records ready for CSV/JSON export
 */
export function flattenBatchResultsForExport(
  results: BatchResultRow[],
  options: ExportColumnOptions = {}
): FlattenedExportResult[] {
  // Default to including all metadata for comprehensive exports
  const { includeTokens = true, includeModel = true, includeError = true, includeTools = true } = options

  return results.map((result, index) => {
    // Start with row number and status (matches Results page order)
    const flat: FlattenedExportResult = {
      '#': result.row_index ?? index + 1,
      status: result.status || 'unknown',
    }

    // Collect input fields
    const inputFields: Record<string, unknown> = {}
    if (result.input_data) {
      let inputData: unknown = result.input_data
      if (typeof result.input_data === 'string') {
        try {
          inputData = JSON.parse(result.input_data)
        } catch (parseError) {
          console.error('Failed to parse input_data:', parseError)
          inputData = null
        }
      }
      if (typeof inputData === 'object' && inputData !== null) {
        Object.assign(inputFields, inputData)
      }
    }

    // Collect output fields
    const outputFields: Record<string, unknown> = {}
    if (result.output_data) {
      let outputObj: Record<string, unknown> | null = null
      
      if (typeof result.output_data === 'string') {
        try {
          const parsed = JSON.parse(result.output_data)
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            outputObj = parsed
          } else {
            outputFields.output = String(parsed)
          }
        } catch {
          const cleaned = result.output_data.trim()
          const codeBlockMatch = cleaned.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/m)
          if (codeBlockMatch) {
            try {
              const parsed = JSON.parse(codeBlockMatch[1].trim())
              if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                outputObj = parsed
              } else {
                outputFields.output = String(parsed)
              }
            } catch {
              outputFields.output = result.output_data
            }
          } else {
            outputFields.output = result.output_data
          }
        }
      } else if (typeof result.output_data === 'object' && result.output_data !== null) {
        outputObj = result.output_data as Record<string, unknown>
      }
      
      if (outputObj) {
        Object.entries(outputObj).forEach(([key, value]) => {
          if (value === null || value === undefined) {
            outputFields[key] = ''
          } else if (typeof value === 'string') {
            outputFields[key] = value
          } else if (typeof value === 'object') {
            outputFields[key] = JSON.stringify(value)
          } else {
            outputFields[key] = String(value)
          }
        })
      }
    }

    // Add input fields (after # and status)
    Object.assign(flat, inputFields)
    
    // Add output fields (after input)
    Object.assign(flat, outputFields)

    // Optional metadata columns at the end (not in main view by default)
    if (includeError && result.error_message) {
      flat.error = result.error_message
    }
    if (includeTokens) {
      flat.input_tokens = result.input_tokens || 0
      flat.output_tokens = result.output_tokens || 0
      flat.total_tokens = (result.input_tokens || 0) + (result.output_tokens || 0)
    }
    if (includeModel && result.model) {
      flat.model = result.model
    }
    if (includeTools) {
      // Always include tools_used column, handle as array or string
      if (result.tools_used) {
        if (Array.isArray(result.tools_used)) {
          flat.tools_used = result.tools_used.length > 0 ? result.tools_used.join(', ') : ''
        } else if (typeof result.tools_used === 'string') {
          flat.tools_used = result.tools_used
        } else {
          flat.tools_used = ''
        }
      } else {
        flat.tools_used = ''
      }
    }

    return flat
  })
}

/**
 * Format results for email notification
 * Generates HTML table for email body
 */
export function formatForEmail<T extends Record<string, unknown>>(
  data: T[]
): string {
  if (!Array.isArray(data) || data.length === 0) {
    return '<p>No results to display.</p>'
  }

  // SECURITY: Helper function to escape HTML entities and prevent XSS
  const escapeHtml = (text: unknown): string => {
    if (text === null || text === undefined) return '-'
    const str = String(text)
    return str.replace(/[&<>"']/g, char => {
      const escapeMap: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }
      return escapeMap[char]
    })
  }

  const columns = Object.keys(data[0])
  const rowCount = data.length

  let html = `<div style="font-family: Arial, sans-serif;">`
  html += `<p><strong>${rowCount} results</strong></p>`
  html += `<table style="border-collapse: collapse; width: 100%; max-width: 600px;">`

  // Header
  html += `<thead><tr style="background-color: #f3f4f6;">`
  columns.forEach(col => {
    html += `<th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">${escapeHtml(col)}</th>`
  })
  html += `</tr></thead>`

  // Rows (limit to first 10 for email)
  html += `<tbody>`
  data.slice(0, 10).forEach(row => {
    html += `<tr>`
    columns.forEach(col => {
      const value = row[col]
      html += `<td style="border: 1px solid #d1d5db; padding: 8px;">${escapeHtml(value)}</td>`
    })
    html += `</tr>`
  })
  html += `</tbody></table>`

  if (rowCount > 10) {
    html += `<p><em>Showing first 10 of ${rowCount} results</em></p>`
  }

  html += `</div>`
  return html
}

