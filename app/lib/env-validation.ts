/**
 * Environment Variable Validation
 * 
 * SECURITY: Validates that required environment variables are set
 * This should be called at application startup
 */

interface EnvValidationResult {
  valid: boolean
  missing: string[]
  warnings: string[]
}

// Required env vars for production
const REQUIRED_PRODUCTION_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

// Security-critical env vars (must be set in production)
const SECURITY_CRITICAL_VARS = [
  'MODAL_WEBHOOK_SECRET',
  'CRON_SECRET',
] as const

// Recommended env vars (warnings if missing)
const RECOMMENDED_VARS = [
  'GEMINI_API_KEY',
  'NEXT_PUBLIC_APP_URL',
] as const

/**
 * Validate environment variables
 * Call this at application startup
 */
export function validateEnvironment(): EnvValidationResult {
  const isProduction = process.env.NODE_ENV === 'production'
  const missing: string[] = []
  const warnings: string[] = []

  // Check required vars
  for (const varName of REQUIRED_PRODUCTION_VARS) {
    if (!process.env[varName]) {
      missing.push(varName)
    }
  }

  // Check security-critical vars (required in production)
  for (const varName of SECURITY_CRITICAL_VARS) {
    if (!process.env[varName]) {
      if (isProduction) {
        missing.push(`${varName} (SECURITY CRITICAL)`)
      } else {
        warnings.push(`${varName} not set - security features disabled in development`)
      }
    }
  }

  // Check recommended vars
  for (const varName of RECOMMENDED_VARS) {
    if (!process.env[varName]) {
      warnings.push(`${varName} not set - some features may not work`)
    }
  }

  // Check for dangerous dev mode in production
  if (isProduction && process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
    missing.push('NEXT_PUBLIC_DEV_MODE=true in production (SECURITY RISK - remove this!)')
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  }
}

/**
 * Log environment validation results
 * Call this at server startup
 */
export function logEnvValidation(): void {
  const result = validateEnvironment()
  const isProduction = process.env.NODE_ENV === 'production'

  if (!result.valid) {
    console.error('═══════════════════════════════════════════════════════')
    console.error('  ❌ ENVIRONMENT VALIDATION FAILED')
    console.error('═══════════════════════════════════════════════════════')
    console.error('Missing required environment variables:')
    result.missing.forEach(v => console.error(`  - ${v}`))
    
    if (isProduction) {
      console.error('\n⚠️  APPLICATION MAY NOT FUNCTION CORRECTLY IN PRODUCTION')
    }
    console.error('═══════════════════════════════════════════════════════\n')
  }

  if (result.warnings.length > 0) {
    console.warn('Environment warnings:')
    result.warnings.forEach(w => console.warn(`  ⚠️  ${w}`))
    console.warn('')
  }

  if (result.valid && result.warnings.length === 0) {
    console.log('✅ Environment validation passed')
  }
}

/**
 * Get a safe error message that doesn't leak sensitive info
 */
export function getSafeErrorMessage(error: unknown): string {
  const isProduction = process.env.NODE_ENV === 'production'
  
  if (!isProduction && error instanceof Error) {
    return error.message
  }
  
  // In production, return generic message
  return 'An error occurred'
}

/**
 * Get safe error details for API responses
 * Only includes details in development
 */
export function getSafeErrorDetails(error: unknown): Record<string, unknown> {
  const isProduction = process.env.NODE_ENV === 'production'
  
  if (isProduction) {
    return {}
  }
  
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    }
  }
  
  return {
    error: String(error),
  }
}


