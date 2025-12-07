/**
 * Prompt validation utilities for CSV variable matching
 * 
 * Validates that prompt template variables ({{column}}) match CSV headers
 */

export interface ValidationResult {
  isValid: boolean
  error: string | null
  missingVariables: string[]
  foundVariables: string[]
}

/**
 * Extract all variables from a prompt template
 * 
 * @param prompt - Template string with {{variable}} placeholders
 * @returns Array of variable names (without braces)
 * 
 * @example
 * extractVariables("Hello {{name}}, work at {{company}}")
 * // Returns: ["name", "company"]
 */
export function extractVariables(prompt: string): string[] {
  const matches = prompt.matchAll(/\{\{([^}]+)\}\}/g)
  return Array.from(matches).map(m => m[1].trim())
}

/**
 * Validate prompt template against CSV headers
 * 
 * Checks:
 * - Prompt is not empty
 * - Contains at least one variable
 * - All variables exist in CSV headers
 * 
 * @param prompt - Template string to validate
 * @param headers - Available CSV column headers
 * @returns Validation result with error details
 * 
 * @example
 * validatePrompt("Hello {{name}}", ["name", "email"])
 * // Returns: { isValid: true, error: null, missingVariables: [], foundVariables: ["name"] }
 * 
 * validatePrompt("Hello {{company}}", ["name", "email"])
 * // Returns: { isValid: false, error: "...", missingVariables: ["company"], foundVariables: ["company"] }
 */
export function validatePrompt(
  prompt: string,
  headers: string[]
): ValidationResult {
  // Empty prompt
  if (!prompt.trim()) {
    return {
      isValid: false,
      error: 'Prompt template is required',
      missingVariables: [],
      foundVariables: [],
    }
  }

  // Extract variables
  const variables = extractVariables(prompt)

  // No variables found
  if (variables.length === 0) {
    return {
      isValid: false,
      error: 'Prompt must contain at least one variable (e.g., {{name}})',
      missingVariables: [],
      foundVariables: [],
    }
  }

  // Check each variable exists in headers
  const missingVars = variables.filter(v => !headers.includes(v))

  if (missingVars.length > 0) {
    // Remove duplicates
    const uniqueMissing = Array.from(new Set(missingVars))
    return {
      isValid: false,
      error: `Variable${uniqueMissing.length > 1 ? 's' : ''} not found in CSV: ${uniqueMissing.map(v => `{{${v}}}`).join(', ')}`,
      missingVariables: uniqueMissing,
      foundVariables: variables,
    }
  }

  // All valid
  return {
    isValid: true,
    error: null,
    missingVariables: [],
    foundVariables: variables,
  }
}

