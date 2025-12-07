import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * Health check endpoint for monitoring service availability
 * Returns service status including database connectivity
 * Used by monitoring services (UptimeRobot, Pingdom, etc.)
 */
export async function GET() {
  const startTime = Date.now()
  const checks: Record<string, { status: 'ok' | 'error'; message?: string; duration?: number }> = {}

  // Check environment variables
  checks.environment = {
    status: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? 'ok'
      : 'error',
    message: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? 'Environment variables configured'
      : 'Missing Supabase environment variables',
  }

  // Check database connectivity
  try {
    const dbStartTime = Date.now()
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      checks.database = {
        status: 'error',
        message: 'Supabase client not initialized',
      }
    } else {
      // Simple query to check database connectivity
      // Using a lightweight query that doesn't require authentication
      const { error } = await supabase.from('batches').select('id').limit(1)
      const dbDuration = Date.now() - dbStartTime
      
      checks.database = {
        status: error ? 'error' : 'ok',
        message: error ? `Database query failed: ${error.message}` : 'Database connection successful',
        duration: dbDuration,
      }
    }
  } catch (error) {
    checks.database = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown database error',
    }
  }

  // Calculate overall status
  const allChecksOk = Object.values(checks).every(check => check.status === 'ok')
  const overallStatus = allChecksOk ? 'healthy' : 'degraded'
  const totalDuration = Date.now() - startTime

  const statusCode = allChecksOk ? 200 : 503

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || 'unknown',
      checks,
      duration: totalDuration,
    },
    { status: statusCode }
  )
}

