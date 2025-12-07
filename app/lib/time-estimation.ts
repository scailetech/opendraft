/**
 * ABOUTME: Time estimation for batch processing operations
 * ABOUTME: ALL rows process in parallel - 1000 rows ≈ same time as 1 row
 */

/**
 * Modal processes ALL rows in parallel - no artificial limit
 * Gemini API: 4000 RPM = can handle 1000 rows in one burst
 */
const MAX_CONCURRENT = 4000 // Gemini rate limit (effectively unlimited for most batches)

/**
 * Base time per request in seconds (without tools, average prompt)
 * This is the ACTUAL time for one API call, not sequential processing
 */
const BASE_TIME_PER_REQUEST = 8 // seconds (single Gemini call with tools)

/**
 * Time multiplier per tool (tools add network latency)
 */
const TIME_PER_TOOL = 2

/**
 * Prompt length multipliers
 */
const PROMPT_LENGTH_MULTIPLIERS = {
  short: 0.8,   // < 100 chars
  medium: 1.0,  // 100-500 chars
  long: 1.3,    // 500-1000 chars
  veryLong: 1.6, // > 1000 chars
}

function getPromptLengthCategory(promptLength: number): keyof typeof PROMPT_LENGTH_MULTIPLIERS {
  if (promptLength < 100) return 'short'
  if (promptLength < 500) return 'medium'
  if (promptLength < 1000) return 'long'
  return 'veryLong'
}

/**
 * Estimate processing time for a batch operation
 * 
 * New architecture: All rows process in parallel up to 250 concurrent
 * - 112 rows → 112 parallel → ~3 seconds
 * - 500 rows → 250 parallel, then 250 → ~6 seconds (2 waves)
 */
export function estimateProcessingTime(
  rowCount: number,
  promptLength: number,
  toolCount: number = 0,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _concurrency?: number // Ignored - global semaphore handles this
): number {
  if (rowCount === 0) return 0

  // Base time per request
  let timePerRequest = BASE_TIME_PER_REQUEST
  timePerRequest += toolCount * TIME_PER_TOOL
  
  const promptCategory = getPromptLengthCategory(promptLength)
  timePerRequest *= PROMPT_LENGTH_MULTIPLIERS[promptCategory]

  // Calculate waves (batches of MAX_CONCURRENT)
  const waves = Math.ceil(rowCount / MAX_CONCURRENT)
  
  // Total time = waves * time per request + small overhead
  const totalTime = waves * timePerRequest
  const overhead = waves * 0.5 // 0.5s overhead per wave
  
  return totalTime + overhead
}

/**
 * Format time estimate as human-readable string
 */
export function formatTimeEstimate(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`
  }

  const minutes = seconds / 60
  if (minutes < 10) {
    return `${minutes.toFixed(1)} min`
  }

  return `${Math.round(minutes)} min`
}

/**
 * Get time estimate with formatted string
 */
export function getTimeEstimate(
  rowCount: number,
  promptLength: number,
  toolCount: number = 0,
  concurrency?: number
): { seconds: number; formatted: string } {
  const seconds = estimateProcessingTime(rowCount, promptLength, toolCount, concurrency)
  return {
    seconds,
    formatted: formatTimeEstimate(seconds),
  }
}
