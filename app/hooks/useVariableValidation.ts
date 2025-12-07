/**
 * ABOUTME: Custom hook for validating prompt variables against CSV columns and context variables
 * ABOUTME: Checks that all {{variable}} placeholders in prompt exist in CSV headers or context variables
 */

import { useMemo } from 'react'
import type { ParsedCSV } from '@/lib/types'
import type { ContextVariables } from '@/lib/types'

export interface VariableValidationResult {
  /** Variables used in prompt but missing from CSV columns AND context variables */
  missing: string[]
  /** CSV columns not used in the prompt */
  unused: string[]
  /** True if prompt has at least one variable AND all variables exist in CSV or context */
  isValid: boolean
  /** Suggestions for missing variables: { "full name": "Full Name" } */
  suggestions: Record<string, string>
}

/**
 * Normalize a string for fuzzy matching:
 * - lowercase
 * - replace underscores/hyphens with spaces
 * - collapse multiple spaces
 */
function normalizeForMatching(str: string): string {
  return str
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Find a similar column name for a missing variable
 * Returns the original column name if found, null otherwise
 */
function findSimilarColumn(missingVar: string, availableColumns: string[]): string | null {
  const normalizedMissing = normalizeForMatching(missingVar)
  
  for (const col of availableColumns) {
    const normalizedCol = normalizeForMatching(col)
    
    // Exact match after normalization (handles case + underscore differences)
    if (normalizedCol === normalizedMissing) {
      return col
    }
  }
  
  // No match found
  return null
}

/**
 * Validates that prompt variables match CSV columns or context variables
 *
 * Extracts variables from prompt ({{variable}} syntax) and compares
 * with CSV column names and context variables to identify missing or unused variables.
 *
 * @param prompt - The prompt template with {{variable}} placeholders
 * @param csvData - Parsed CSV data with column names
 * @param selectedInputColumns - Optional: selected CSV columns to validate against
 * @param contextVariables - Optional: context variables that are available (e.g., context.tone)
 * @returns Validation result with missing/unused variables and validity flag
 *
 * @example
 * const validation = useVariableValidation(prompt, csvData, selectedColumns, contextVars)
 * if (!validation.isValid) {
 *   console.log('Missing variables:', validation.missing)
 * }
 */
export function useVariableValidation(
  prompt: string,
  csvData: ParsedCSV | null,
  selectedInputColumns?: string[],
  contextVariables?: ContextVariables
): VariableValidationResult {
  return useMemo(() => {
    if (!prompt) {
      return { missing: [], unused: [], isValid: true, suggestions: {} }
    }

    // Extract variables from prompt ({{variable}} syntax)
    const variablePattern = /\{\{([^}]+)\}\}/g
    const matches = Array.from(prompt.matchAll(variablePattern))
    const promptVars = new Set<string>()
    for (const match of matches) {
      promptVars.add(match[1].trim())
    }

    // Build set of available variables (CSV columns + context variables)
    const availableVars = new Set<string>()
    
    // Add CSV columns
    if (csvData) {
      const csvCols = selectedInputColumns && selectedInputColumns.length > 0
        ? selectedInputColumns
        : csvData.columns
      csvCols.forEach(col => availableVars.add(col))
    }
    
    // Add context variables (format: context.variableName)
    if (contextVariables) {
      if (contextVariables.tone) availableVars.add('context.tone')
      if (contextVariables.targetCountries) availableVars.add('context.targetCountries')
      if (contextVariables.productDescription) availableVars.add('context.productDescription')
      if (contextVariables.competitors) availableVars.add('context.competitors')
      if (contextVariables.targetIndustries) availableVars.add('context.targetIndustries')
      if (contextVariables.complianceFlags) availableVars.add('context.complianceFlags')
    }
    
    // Compare with available variables
    const missing = Array.from(promptVars).filter(v => !availableVars.has(v))
    
    // Build suggestions for missing variables (fuzzy matching)
    const suggestions: Record<string, string> = {}
    const availableList = Array.from(availableVars)
    for (const missingVar of missing) {
      const suggestion = findSimilarColumn(missingVar, availableList)
      if (suggestion) {
        suggestions[missingVar] = suggestion
      }
    }
    
    // Unused CSV columns (only count CSV columns, not context variables)
    const unused = csvData
      ? Array.from(selectedInputColumns && selectedInputColumns.length > 0
          ? new Set(selectedInputColumns)
          : new Set(csvData.columns))
          .filter(c => !promptVars.has(c))
      : []

    return {
      missing,
      unused,
      suggestions,
      isValid: promptVars.size > 0 && missing.length === 0 // Require at least one variable AND all variables must exist in CSV or context
    }
  }, [csvData, prompt, selectedInputColumns, contextVariables])
}
