/**
 * ABOUTME: Server-side Sentry configuration for Next.js API routes and server components
 * ABOUTME: Initializes Sentry SDK with appropriate settings for backend error tracking
 */

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn: SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% of transactions for performance monitoring

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',

  // Filtering
  beforeSend(event, hint) {
    // Filter out errors that are not actionable
    const error = hint.originalException

    // Ignore common server-side noise
    if (error && typeof error === 'object' && 'message' in error) {
      const message = String(error.message)

      // Ignore aborted requests (user navigated away)
      if (message.includes('aborted') || message.includes('ECONNRESET')) {
        return null
      }
    }

    return event
  },

  // Integration configuration
  integrations: [
    Sentry.httpIntegration(),
  ],
})
