/**
 * Core Web Vitals monitoring
 * Tracks LCP, FID, CLS, and other performance metrics
 */

import { onCLS, onFID, onLCP, onFCP, onTTFB, Metric } from 'web-vitals'

// Type definitions for analytics services
interface PostHogWindow extends Window {
  posthog?: {
    capture: (event: string, properties: Record<string, unknown>) => void
  }
}

interface VercelAnalyticsWindow extends Window {
  va?: (method: string, data: Record<string, unknown>) => void
}

/**
 * Report Web Vitals to console and analytics service
 */
function reportWebVitals(metric: Metric) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
    })
  }

  // Send to analytics service (e.g., PostHog, Vercel Analytics, etc.)
  // You can customize this to send to your preferred analytics service
  if (typeof window !== 'undefined') {
    const posthogWindow = window as unknown as PostHogWindow
    if (posthogWindow.posthog) {
      try {
        posthogWindow.posthog.capture('web_vital', {
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          id: metric.id,
        })
      } catch (error) {
        console.error('Error sending web vital to analytics:', error)
      }
    }

    // Send to Vercel Analytics if available
    const vaWindow = window as unknown as VercelAnalyticsWindow
    if (vaWindow.va) {
      try {
        vaWindow.va('track', {
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
        })
      } catch (error) {
        // Vercel Analytics not available, ignore
      }
    }
  }
}

/**
 * Initialize Web Vitals tracking
 * Call this in your app's root component or _app.tsx
 */
export function initWebVitals() {
  if (typeof window === 'undefined') return

  // Largest Contentful Paint (LCP)
  onLCP(reportWebVitals)

  // First Input Delay (FID)
  onFID(reportWebVitals)

  // Cumulative Layout Shift (CLS)
  onCLS(reportWebVitals)

  // First Contentful Paint (FCP)
  onFCP(reportWebVitals)

  // Time to First Byte (TTFB)
  onTTFB(reportWebVitals)
}

/**
 * Get performance metrics summary
 * Useful for debugging or displaying performance info
 */
export function getPerformanceSummary(): Promise<{
  lcp: number | null
  fid: number | null
  cls: number | null
  fcp: number | null
  ttfb: number | null
}> {
  return new Promise((resolve) => {
    const metrics: {
      lcp: number | null
      fid: number | null
      cls: number | null
      fcp: number | null
      ttfb: number | null
    } = {
      lcp: null,
      fid: null,
      cls: null,
      fcp: null,
      ttfb: null,
    }

    let collected = 0
    const total = 5

    const checkComplete = () => {
      collected++
      if (collected >= total) {
        resolve(metrics)
      }
    }

    onLCP((metric) => {
      metrics.lcp = metric.value
      checkComplete()
    })

    onFID((metric) => {
      metrics.fid = metric.value
      checkComplete()
    })

    onCLS((metric) => {
      metrics.cls = metric.value
      checkComplete()
    })

    onFCP((metric) => {
      metrics.fcp = metric.value
      checkComplete()
    })

    onTTFB((metric) => {
      metrics.ttfb = metric.value
      checkComplete()
    })

    // Timeout after 10 seconds
    setTimeout(() => {
      resolve(metrics)
    }, 10000)
  })
}


