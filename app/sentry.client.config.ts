/**
 * ABOUTME: Client-side Sentry configuration for browser error tracking
 * ABOUTME: Initializes Sentry SDK with appropriate settings for production monitoring
 */

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn: SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% of transactions for performance monitoring in production

  // Session Replay
  replaysSessionSampleRate: 0.1, // Sample 10% of normal sessions
  replaysOnErrorSampleRate: 1.0, // Sample 100% of sessions with errors

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',

  // Filtering
  beforeSend(event, hint) {
    // Filter out specific errors that are not actionable
    const error = hint.originalException

    // Ignore network errors from browser extensions
    if (error && typeof error === 'object' && 'message' in error) {
      const message = String(error.message)
      if (message.includes('Extension context invalidated')) {
        return null
      }
      if (message.includes('chrome-extension://')) {
        return null
      }
    }

    return event
  },

  // Integration configuration
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true, // Mask all text for privacy
      blockAllMedia: true, // Block all media for privacy
    }),
    Sentry.browserTracingIntegration(),
  ],
})
