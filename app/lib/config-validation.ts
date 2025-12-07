/**
 * Environment variable validation
 * Ensures all required configuration is present at startup
 */

export function validateEnv(): void {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]

  const missing: string[] = []

  required.forEach((key) => {
    if (!process.env[key]) {
      missing.push(key)
    }
  })

  if (missing.length > 0) {
    const message = `
======================================================================
MISSING REQUIRED ENVIRONMENT VARIABLES:
======================================================================
${missing.map((k) => `  - ${k}`).join('\n')}

Please add these variables to your .env.local file or deployment configuration.
======================================================================
    `.trim()
    throw new Error(message)
  }
}

/**
 * Validate env vars at startup (call this early in app initialization)
 */
if (typeof window === 'undefined') {
  // Server-side only
  try {
    validateEnv()
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Failed to validate environment variables')
    // Don't throw here - some services might start without these (for example, storybook)
    // But log the warning so developers are aware
    if (process.env.NODE_ENV === 'production') {
      throw error
    }
  }
}
