/**
 * Processing cost and time estimation utilities
 * 
 * Provides estimates for batch processing based on row count and model
 */

export interface ProcessingEstimate {
  timeSeconds: number
  timeFormatted: string
  costUSD: number
  costFormatted: string
  rowCount: number
}

/**
 * Estimate processing time and cost for a batch
 * 
 * Assumptions:
 * - Gemini 2.5 Flash: ~$0.00002 per request (avg 1000 input + 500 output tokens)
 * - Processing time: ~2 seconds per row (parallel processing, includes API latency)
 * - Modal overhead: ~5 seconds startup
 * 
 * @param rowCount - Number of rows to process
 * @returns Estimate with time and cost
 * 
 * @example
 * estimateProcessing(100)
 * // Returns: { timeSeconds: 205, timeFormatted: "~3 min", costUSD: 0.002, costFormatted: "$0.00" }
 */
export function estimateProcessing(rowCount: number): ProcessingEstimate {
  // Cost calculation (Gemini 2.5 Flash pricing)
  const costPerRow = 0.00002 // $0.00002 per row (estimate)
  const totalCost = rowCount * costPerRow

  // Time calculation
  const baseTimePerRow = 2 // seconds per row in parallel
  const modalOverhead = 5 // seconds for Modal startup
  const totalTime = Math.ceil((rowCount * baseTimePerRow) + modalOverhead)

  // Format time
  let timeFormatted: string
  if (totalTime < 60) {
    timeFormatted = `~${totalTime} sec`
  } else if (totalTime < 3600) {
    const minutes = Math.ceil(totalTime / 60)
    timeFormatted = `~${minutes} min`
  } else {
    const hours = Math.ceil(totalTime / 3600)
    timeFormatted = `~${hours} hr`
  }

  // Format cost
  let costFormatted: string
  if (totalCost < 0.01) {
    costFormatted = '<$0.01'
  } else if (totalCost < 1) {
    costFormatted = `$${totalCost.toFixed(2)}`
  } else {
    costFormatted = `$${totalCost.toFixed(2)}`
  }

  return {
    timeSeconds: totalTime,
    timeFormatted,
    costUSD: totalCost,
    costFormatted,
    rowCount,
  }
}

/**
 * Get recommended processing mode based on row count
 * 
 * @param rowCount - Total rows available
 * @returns 'test' or 'full' recommendation
 * 
 * @example
 * getRecommendedMode(100) // Returns: "test"
 * getRecommendedMode(3) // Returns: "full"
 */
export function getRecommendedMode(rowCount: number): 'test' | 'full' {
  // Recommend test mode for large datasets
  return rowCount > 10 ? 'test' : 'full'
}



