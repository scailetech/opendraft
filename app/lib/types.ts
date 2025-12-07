/**
 * Core type definitions for BULK-GPT MVP
 */

// Re-export agent types
export * from './types/agents'

/**
 * Custom error class - re-exported from errors.ts for consistency
 */
export { BulkGPTError, type ErrorCode } from './errors'

/**
 * Individual CSV row with data and index
 */
export interface CSVRow {
  data: Record<string, string>
  rowIndex: number
}

/**
 * Parsed CSV file structure
 */
export interface ParsedCSV {
  filename: string
  rows: CSVRow[]
  columns: string[]
  totalRows: number
  // Google Sheets metadata (if imported from Google Sheets)
  googleSheetsUrl?: string
  googleSheetsId?: string
  // Warnings (non-fatal issues detected during parsing)
  warnings?: string[]
}

/**
 * Processing progress tracking
 */
export interface Progress {
  current: number
  total: number
  status?: 'idle' | 'pending' | 'processing' | 'completed' | 'completed_with_errors' | 'failed'
  message?: string
}

/**
 * Output schema column definition
 * @deprecated Use OutputColumn instead
 */
export interface SchemaColumn {
  name: string
  type: string
  required: boolean
}

/**
 * Output column with individual prompt
 * Supports structured output with multiple AI-generated fields per row
 */
export interface OutputColumn {
  /** Column name in output CSV */
  name: string
  /** Prompt template for this specific column */
  prompt: string
  /** Expected output format */
  format?: 'text' | 'number' | 'enum' | 'json'
  /** For enum format, valid values */
  enumValues?: string[]
  /** Whether this field is required */
  required?: boolean
  /** Maximum length for text outputs */
  maxLength?: number
}

/**
 * Processing mode type
 */
export type ProcessingMode = 'sample' | 'full'

/**
 * Saved context for reuse across batches
 */
export interface SavedContext {
  id: string
  name: string
  content: string
  createdAt: Date
  lastUsed: Date
  usageCount: number
  tags?: string[]
}

/**
 * Template for prompt configuration
 */
export interface Template {
  id: string
  name: string
  description?: string
  outputColumns: OutputColumn[]
  globalContext: string
  requiredCsvColumns?: string[]
  createdAt: Date
  lastUsed: Date
  usageCount: number
  tags?: string[]
}

/**
 * Batch processing status response
 */
export interface BatchStatus {
  batchId: string
  status: 'pending' | 'processing' | 'completed' | 'completed_with_errors' | 'failed'
  totalRows: number
  processedRows: number
  progressPercent: number
  results: ProcessingResult[]
  message: string
}

/**
 * Individual row processing result
 */
export interface ProcessingResult {
  id: string
  input: Record<string, string> | string
  output: string
  status: 'pending' | 'processing' | 'success' | 'error'
  error?: string
}

/**
 * Main application state
 */
export interface AppState {
  currentFile: ParsedCSV | null
  selectedTemplate: Template | null
  prompt: string
  context: string
  outputColumns: OutputColumn[]
  processingMode: ProcessingMode
  results: ProcessingResult[]
  isProcessing: boolean
  progress: Progress
}

/**
 * Company context variables for use in prompts
 */
export interface ContextVariables {
  tone?: string
  targetCountries?: string
  productDescription?: string
  companyName?: string
  industry?: string
  complianceRequirements?: string
  complianceFlags?: string
  competitors?: string
  targetIndustries?: string
}
