/**
 * Validation utilities for input data
 */

import { BulkGPTError } from './types'

/**
 * Validate input object has required properties
 */
export function validateInput(input: unknown): void {
  if (!input || typeof input !== 'object') {
    throw new BulkGPTError('INVALID_INPUT', 'Input must be a non-null object')
  }

  const obj = input as Record<string, unknown>

  if (!obj.prompt || typeof obj.prompt !== 'string' || obj.prompt.trim() === '') {
    throw new BulkGPTError('INVALID_PROMPT', 'Prompt cannot be empty')
  }

  if (!Array.isArray(obj.rows) || obj.rows.length === 0) {
    throw new BulkGPTError('INVALID_ROWS', 'Rows must be a non-empty array')
  }
}

/**
 * Validate prompt is not empty
 */
export function validatePrompt(prompt: unknown): void {
  if (typeof prompt !== 'string' || prompt.trim() === '') {
    throw new BulkGPTError('INVALID_PROMPT', 'Prompt cannot be empty')
  }

  if (prompt.length > 10000) {
    throw new BulkGPTError(
      'INVALID_PROMPT',
      'Prompt cannot exceed 10000 characters'
    )
  }
}

/**
 * Validate CSV data structure
 */
export function validateCSV(data: unknown): void {
  if (!Array.isArray(data)) {
    throw new BulkGPTError('INVALID_INPUT', 'CSV data must be an array')
  }

  // Empty arrays are valid - they will be validated later during processing
  if (data.length === 0) {
    return
  }

  // Validate each row has required structure
  for (let i = 0; i < Math.min(data.length, 5); i++) {
    const row = data[i]
    if (!row || typeof row !== 'object') {
      throw new BulkGPTError(
        'INVALID_INPUT',
        `Row ${i} must be an object`
      )
    }
  }
}

/**
 * Validate batch configuration
 */
export function validateBatchConfig(config: unknown): void {
  if (!config || typeof config !== 'object') {
    throw new BulkGPTError('INVALID_INPUT', 'Batch config must be an object')
  }

  const cfg = config as Record<string, unknown>

  if (typeof cfg.prompt !== 'string' || cfg.prompt.trim() === '') {
    throw new BulkGPTError('INVALID_PROMPT', 'Batch prompt cannot be empty')
  }

  if (!Array.isArray(cfg.rows)) {
    throw new BulkGPTError('INVALID_ROWS', 'Batch rows must be an array')
  }

  if (cfg.rows.length === 0) {
    throw new BulkGPTError('INVALID_ROWS', 'Batch rows cannot be empty')
  }
}






