/**
 * Cost calculation utilities for token usage
 * Supports Gemini Flash and Pro pricing models
 */

import { normalizeModelName } from './model-utils'

export interface ModelPricing {
  inputPerMillion: number
  outputPerMillion: number
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'gemini-2.5-flash-lite': {
    inputPerMillion: 0.10,
    outputPerMillion: 0.40,
  },
  'gemini-2.5-flash': {
    inputPerMillion: 0.075,
    outputPerMillion: 0.30,
  },
  'gemini-2.5-pro': {
    inputPerMillion: 1.25,
    outputPerMillion: 5.00,
  },
  // Fallback for unknown models (assume Flash Lite pricing)
  default: {
    inputPerMillion: 0.10,
    outputPerMillion: 0.40,
  },
}

export interface TokenUsage {
  input: number
  output: number
}

/**
 * Calculate cost for token usage by model
 * @param model - Model name (may be normalized or have prefix)
 * @param tokens - Token usage (input and output)
 * @returns Cost in USD
 */
export function calculateCost(model: string, tokens: TokenUsage): number {
  // Normalize model name before lookup
  const normalizedModel = normalizeModelName(model)
  const pricing = MODEL_PRICING[normalizedModel] || MODEL_PRICING.default
  
  const inputCost = (tokens.input / 1_000_000) * pricing.inputPerMillion
  const outputCost = (tokens.output / 1_000_000) * pricing.outputPerMillion
  
  return inputCost + outputCost
}

/**
 * Calculate total cost from model breakdown
 * @param modelBreakdown - Record of model names to token usage
 * @returns Total cost in USD
 */
export function calculateTotalCost(
  modelBreakdown: Record<string, { input: number; output: number; batches: number }>
): number {
  let totalCost = 0
  
  for (const [model, stats] of Object.entries(modelBreakdown)) {
    totalCost += calculateCost(model, { input: stats.input, output: stats.output })
  }
  
  return totalCost
}

/**
 * Format cost as currency string
 * @param cost - Cost in USD
 * @returns Formatted string like "$0.03" or "$1.23"
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return '<$0.01'
  }
  return `$${cost.toFixed(2)}`
}

/**
 * Get cost savings recommendation
 * @param currentModel - Current model being used (may be normalized or have prefix)
 * @param tokens - Token usage
 * @returns Recommendation string or null
 */
export function getCostSavingsRecommendation(
  currentModel: string,
  tokens: TokenUsage
): string | null {
  const normalizedModel = normalizeModelName(currentModel)
  const currentCost = calculateCost(currentModel, tokens)
  
  // If using Pro, suggest Flash
  if (normalizedModel.includes('pro')) {
    const flashCost = calculateCost('gemini-2.5-flash', tokens)
    const savings = currentCost - flashCost
    const savingsPercent = ((savings / currentCost) * 100).toFixed(0)
    
    if (savings > 0.01) {
      return `Switch to Flash model to save ${formatCost(savings)} (${savingsPercent}% savings)`
    }
  }
  
  return null
}

/**
 * Calculate cost per batch
 * @param totalCost - Total cost in USD
 * @param totalBatches - Total number of batches
 * @returns Cost per batch in USD, or 0 if no batches
 */
export function calculateCostPerBatch(totalCost: number, totalBatches: number): number {
  if (totalBatches === 0) return 0
  return totalCost / totalBatches
}

/**
 * Calculate cost per row
 * @param totalCost - Total cost in USD
 * @param totalRows - Total number of rows processed
 * @returns Cost per row in USD, or 0 if no rows
 */
export function calculateCostPerRow(totalCost: number, totalRows: number): number {
  if (totalRows === 0) return 0
  return totalCost / totalRows
}

/**
 * Calculate potential savings by switching from Pro to Flash
 * @param modelBreakdown - Record of model names to token usage
 * @returns Object with total savings and savings percentage, or null if no savings
 */
export function calculatePotentialSavings(
  modelBreakdown: Record<string, { input: number; output: number; batches: number }>
): { savings: number; savingsPercent: number; currentCost: number; flashCost: number } | null {
  let currentCost = 0
  let flashCost = 0
  let hasProModel = false

  for (const [model, stats] of Object.entries(modelBreakdown)) {
    const normalizedModel = normalizeModelName(model)
    const modelCurrentCost = calculateCost(model, { input: stats.input, output: stats.output })
    const modelFlashCost = calculateCost('gemini-2.5-flash', { input: stats.input, output: stats.output })
    
    currentCost += modelCurrentCost
    
    if (normalizedModel.includes('pro')) {
      hasProModel = true
      flashCost += modelFlashCost
    } else {
      flashCost += modelCurrentCost
    }
  }

  if (!hasProModel || currentCost === 0) return null

  const savings = currentCost - flashCost
  const savingsPercent = (savings / currentCost) * 100

  if (savings > 0.01) {
    return {
      savings,
      savingsPercent,
      currentCost,
      flashCost,
    }
  }

  return null
}

