/**
 * ABOUTME: Edge runtime Sentry configuration for Next.js edge functions and middleware
 * ABOUTME: Initializes Sentry SDK with appropriate settings for edge error tracking
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
})
