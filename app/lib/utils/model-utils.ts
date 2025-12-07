/**
 * Model name normalization and formatting utilities
 * Handles inconsistent model name formats from database
 */

/**
 * Normalizes model names to a consistent format
 * Removes 'models/' prefix if present, handles case sensitivity, and trims whitespace
 * @param model - Model name (e.g., 'models/gemini-2.5-flash' or 'gemini-2.5-flash')
 * @returns Normalized model name (e.g., 'gemini-2.5-flash')
 */
export function normalizeModelName(model: string): string {
  if (!model) return 'unknown'
  
  // Remove 'models/' prefix if present (case-insensitive)
  let normalized = model.replace(/^models\//i, '')
  
  // Trim whitespace and convert to lowercase for consistency
  normalized = normalized.trim().toLowerCase()
  
  // Handle empty strings after normalization
  return normalized || 'unknown'
}

/**
 * Formats model name for display in UI
 * Abbreviates common patterns for cleaner display
 * @param model - Normalized model name (e.g., 'gemini-2.5-flash')
 * @returns Formatted model name for display (e.g., 'g-2.5-flash')
 */
export function formatModelNameForDisplay(model: string): string {
  if (!model) return 'unknown'
  
  // Normalize first
  const normalized = normalizeModelName(model)
  
  // Abbreviate 'gemini-' to 'g-'
  let formatted = normalized.replace(/^gemini-/, 'g-')
  
  // Handle other common patterns if needed
  formatted = formatted.replace(/^claude-/, 'c-')
  formatted = formatted.replace(/^gpt-/, 'gpt-')
  
  return formatted
}

