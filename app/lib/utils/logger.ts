/**
 * Production-safe logging utilities
 * Logs are gated behind environment checks for production cleanliness
 * 
 * Usage:
 * - logError: Always logged, for errors that need attention
 * - logWarning: Always logged, for warnings that need attention
 * - logInfo: Production info (only when ENABLE_INFO_LOGS=true)
 * - logDebug: Development only, for debugging
 * - logPerformance: Performance metrics (dev or when ENABLE_PERF_LOGS=true)
 * - logAnalytics: Analytics events (always logged, structured format)
 */

const isDev = process.env.NODE_ENV === 'development'

/**
 * Log performance metrics (only in development or when explicitly enabled)
 */
export function logPerformance(metric: string, data: Record<string, unknown>) {
  if (isDev || process.env.ENABLE_PERF_LOGS === 'true') {
    console.log(`[PERF] ${metric}:`, data)
  }
}

/**
 * Log debug information (only in development)
 */
export function logDebug(message: string, ...args: unknown[]) {
  if (isDev) {
    console.log(`[DEBUG] ${message}`, ...args)
  }
}

/**
 * Log info messages (development or when ENABLE_INFO_LOGS=true)
 */
export function logInfo(message: string, context?: Record<string, unknown>) {
  if (isDev || process.env.ENABLE_INFO_LOGS === 'true') {
    console.log(`[INFO] ${message}`, context || {})
  }
}

/**
 * Log errors (always logged - important for production debugging)
 */
export function logError(message: string, error?: unknown, context?: Record<string, unknown>) {
  if (error) {
    console.error(`[ERROR] ${message}:`, error, context || {})
  } else {
    console.error(`[ERROR] ${message}`, context || {})
  }
}

/**
 * Log warnings (always logged - important for production)
 */
export function logWarning(message: string, context?: Record<string, unknown>) {
  console.warn(`[WARN] ${message}`, context || {})
}

/**
 * Log analytics events (always logged with structured format)
 * Used for tracking user actions, sign-ups, etc.
 */
export function logAnalytics(event: string, data: Record<string, unknown>) {
  // In production, you might send this to an analytics service
  // For now, we log with a structured format
  console.log(JSON.stringify({
    type: 'analytics',
    event,
    timestamp: new Date().toISOString(),
    ...data
  }))
}

/**
 * Log API request/response (only in development)
 */
export function logAPI(method: string, path: string, data?: Record<string, unknown>) {
  if (isDev) {
    console.log(`[API] ${method} ${path}`, data || {})
  }
}

