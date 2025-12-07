/**
 * ABOUTME: Next.js instrumentation hook for Sentry initialization
 * ABOUTME: Registers Sentry monitoring for client, server, and edge runtimes
 * ABOUTME: Also validates environment variables on startup
 */

export async function register() {
  // Only run on server/edge (not during build)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Validate environment variables on server startup
    const { logEnvValidation } = await import('./lib/env-validation')
    logEnvValidation()
    
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Client-side instrumentation is handled automatically by Next.js
// via sentry.client.config.ts
