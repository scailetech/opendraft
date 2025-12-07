/**
 * Validation Helpers
 * 
 * Utility functions for generating validation messages and checking form validity.
 */

import type { VariableValidationResult } from '@/hooks/useVariableValidation'

interface ValidationState {
  hasCSV: boolean
  hasPrompt: boolean
  variableValidation: VariableValidationResult
  isProcessing?: boolean
}

/**
 * Get the reason why the Process All button is disabled
 */
export function getProcessAllDisabledReason(state: ValidationState): string | null {
  if (state.isProcessing) {
    return 'Processing in progress. Please wait...'
  }
  
  if (!state.hasCSV) {
    return 'Upload a CSV file to get started'
  }
  
  if (!state.hasPrompt) {
    return 'Enter a prompt to process your data'
  }
  
  if (!state.variableValidation.isValid) {
    const missing = state.variableValidation.missing.join(', ')
    return `Fix prompt: Remove ${missing} or add these columns to your CSV`
  }
  
  return null // Button should be enabled
}

/**
 * Get the reason why the Test button is disabled
 */
export function getTestDisabledReason(state: ValidationState): string | null {
  if (!state.hasCSV) {
    return 'Upload a CSV file to test'
  }
  
  if (!state.hasPrompt) {
    return 'Enter a prompt to test'
  }
  
  if (!state.variableValidation.isValid) {
    const missing = state.variableValidation.missing.join(', ')
    return `Fix prompt: Remove ${missing} or add these columns to your CSV`
  }
  
  return null // Button should be enabled
}

/**
 * Check if Process All button should be disabled
 */
export function isProcessAllDisabled(state: ValidationState): boolean {
  return !state.hasCSV || !state.hasPrompt || !!state.isProcessing || !state.variableValidation.isValid
}

/**
 * Check if Test button should be disabled
 */
export function isTestDisabled(state: ValidationState): boolean {
  return !state.hasCSV || !state.hasPrompt || !state.variableValidation.isValid
}

