/**
 * API Route Performance Monitoring
 * Provides timing utilities for measuring API route performance
 */

export interface TimingMetrics {
  /** Route path */
  route: string
  /** HTTP method */
  method: string
  /** Start time (ms) */
  startTime: number
  /** End time (ms) */
  endTime?: number
  /** Duration in ms */
  duration?: number
  /** Response status code */
  status?: number
}

/**
 * Start timing an API route
 * @param route - The route path
 * @param method - HTTP method
 * @returns Timing metrics object
 */
export function startTiming(route: string, method: string): TimingMetrics {
  return {
    route,
    method,
    startTime: Date.now(),
  }
}

/**
 * End timing and log metrics
 * @param metrics - Timing metrics from startTiming()
 * @param status - HTTP response status code
 */
export function endTiming(metrics: TimingMetrics, status: number): void {
  const endTime = Date.now()
  const duration = endTime - metrics.startTime

  metrics.endTime = endTime
  metrics.duration = duration
  metrics.status = status

  // Log timing information
  const level = duration > 1000 ? 'warn' : 'info'
  console[level](`[API Performance] ${metrics.method} ${metrics.route}`, {
    duration: `${duration}ms`,
    status,
    timestamp: new Date(metrics.startTime).toISOString(),
  })

  // Log slow queries (>1s) with warning
  if (duration > 1000) {
    console.warn(`[SLOW API] ${metrics.method} ${metrics.route} took ${duration}ms`)
  }

  // Log very slow queries (>3s) with error
  if (duration > 3000) {
    console.error(`[VERY SLOW API] ${metrics.method} ${metrics.route} took ${duration}ms - Consider optimization`)
  }
}

/**
 * Middleware helper for timing API routes
 * Wraps route handler with timing logic
 *
 * Usage:
 * ```ts
 * export async function GET(request: Request) {
 *   return withTiming('/api/example', 'GET', async () => {
 *     // Your route logic here
 *     return NextResponse.json({ data: 'example' })
 *   })
 * }
 * ```
 */
export async function withTiming<T extends Response>(
  route: string,
  method: string,
  handler: () => Promise<T>
): Promise<T> {
  const metrics = startTiming(route, method)

  try {
    const response = await handler()
    endTiming(metrics, response.status)
    return response
  } catch (error) {
    endTiming(metrics, 500)
    throw error
  }
}
