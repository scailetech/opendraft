import { NextRequest, NextResponse } from 'next/server'
import { fetchWithRetry } from '@/lib/retry'

export const maxDuration = 300 // Max 5 minutes for this test endpoint

/**
 * Test B: Minimal Vercel API Route - Direct Modal API Test
 *
 * Purpose: Test if Vercel serverless environment can reach Modal API
 * SECURITY: This endpoint is ONLY available in development mode
 *
 * This endpoint:
 * - NO batch creation
 * - NO fire-and-forget pattern
 * - Synchronously calls Modal and waits for response
 * - Returns Modal's response directly
 *
 * Usage:
 * - Local: curl http://localhost:3000/api/test-modal-direct
 */
export async function POST(request: NextRequest): Promise<Response> {
  // SECURITY: Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Test endpoint only available in development mode' },
      { status: 403 }
    )
  }
  const startTime = Date.now()

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('  TEST B: Minimal Vercel API Route - Modal Direct Call')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`[${new Date().toISOString()}] 🧪 Starting Modal API test from Vercel...`)

  try {
    // Get test payload from request body (optional)
    let testPayload
    try {
      const body = await request.json()
      testPayload = body.payload || getDefaultPayload()
      console.log(`[${new Date().toISOString()}] 📦 Using custom payload from request`)
    } catch {
      testPayload = getDefaultPayload()
      console.log(`[${new Date().toISOString()}] 📦 Using default test payload`)
    }

    const modalUrl =
      process.env.MODAL_API_URL || 'https://scaile--g-mcp-tools-v2-api.modal.run/bulk/generic'

    console.log(`\nTest Configuration:`)
    console.log(`  Modal URL: ${modalUrl}`)
    console.log(`  Timeout: 120000ms (120s)`)
    console.log(`  Rows: ${testPayload.rows.length}`)
    console.log(`  Environment: ${process.env.VERCEL ? 'Vercel' : 'Local'}`)
    console.log(`  Region: ${process.env.VERCEL_REGION || 'N/A'}`)

    console.log(`\n[${new Date().toISOString()}] 🚀 Calling Modal API (synchronously)...`)

    // Call Modal API synchronously (wait for response)
    const response = await fetchWithRetry(modalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
      timeoutMs: 120000, // 2 minutes
      retryOptions: {
        maxRetries: 2,
        initialDelay: 2000,
        maxDelay: 10000,
      },
    })

    const callDuration = Date.now() - startTime

    console.log(`\n[${new Date().toISOString()}] ✅ Modal API call successful!`)
    console.log(`  Status: ${response.status}`)
    console.log(`  Duration: ${callDuration}ms (${(callDuration / 1000).toFixed(2)}s)`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`\n[${new Date().toISOString()}] ❌ Modal returned error status`)
      console.error(`  Status: ${response.status}`)
      console.error(`  Error: ${errorText}`)

      return NextResponse.json(
        {
          success: false,
          test: 'test-b-vercel-modal-direct',
          error: `Modal returned ${response.status}`,
          details: errorText,
          duration_ms: callDuration,
          environment: process.env.VERCEL ? 'vercel' : 'local',
        },
        { status: response.status }
      )
    }

    // Parse Modal response
    const data = await response.json()

    const totalDuration = Date.now() - startTime

    console.log(`\n[${new Date().toISOString()}] 📥 Response parsed successfully`)
    console.log(`  Total Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`)
    console.log(`  Success: ${data.success}`)
    console.log(`  Status: ${data.status}`)
    console.log(`  Results: ${data.results?.length || 0}`)

    console.log('\n═══════════════════════════════════════════════════════════')
    console.log('  ✅ TEST B PASSED - Vercel can reach Modal API!')
    console.log('═══════════════════════════════════════════════════════════\n')

    // Return success response with test metadata
    return NextResponse.json(
      {
        success: true,
        test: 'test-b-vercel-modal-direct',
        message: 'Modal API call succeeded from Vercel environment',
        duration_ms: totalDuration,
        environment: process.env.VERCEL ? 'vercel' : 'local',
        region: process.env.VERCEL_REGION || 'local',
        modal_response: data,
        conclusion:
          'Vercel CAN reach Modal API. Issue is in fire-and-forget pattern or batch creation logic.',
      },
      { status: 200 }
    )
  } catch (error) {
    const totalDuration = Date.now() - startTime

    console.error('\n═══════════════════════════════════════════════════════════')
    console.error('  ❌ TEST B FAILED - Vercel cannot reach Modal API')
    console.error('═══════════════════════════════════════════════════════════')
    console.error(`\n[${new Date().toISOString()}] ❌ Error after ${totalDuration}ms`)
    console.error(`  Type: ${error instanceof Error ? error.constructor.name : typeof error}`)
    console.error(`  Message: ${error instanceof Error ? error.message : String(error)}`)
    console.error(`  Full error:`, error)
    console.error('\n')

    return NextResponse.json(
      {
        success: false,
        test: 'test-b-vercel-modal-direct',
        error: error instanceof Error ? error.message : 'Unknown error',
        error_type: error instanceof Error ? error.constructor.name : typeof error,
        duration_ms: totalDuration,
        environment: process.env.VERCEL ? 'vercel' : 'local',
        region: process.env.VERCEL_REGION || 'local',
        conclusion:
          'Vercel CANNOT reach Modal API. Possible network restrictions or environment issue.',
      },
      { status: 500 }
    )
  }
}

/**
 * GET handler - return test info and instructions
 * SECURITY: Only available in development mode
 */
export async function GET(): Promise<Response> {
  // SECURITY: Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Test endpoint only available in development mode' },
      { status: 403 }
    )
  }

  return NextResponse.json(
    {
      test: 'test-b-vercel-modal-direct',
      description: 'Minimal Vercel API route to test direct Modal API calls (dev only)',
      instructions: {
        method: 'POST',
        endpoint_local: 'http://localhost:3000/api/test-modal-direct',
        optional_body: {
          payload: {
            rows: [{ name: 'Test', company: 'TestCorp' }],
            prompt: 'Bio for {{name}} at {{company}}',
            output_schema: [{ name: 'bio' }],
            temperature: 0.7,
            max_tokens: 8192,
          },
        },
        example_curl: 'curl -X POST http://localhost:3000/api/test-modal-direct',
      },
      status: 'ready',
    },
    { status: 200 }
  )
}

/**
 * Default test payload
 */
function getDefaultPayload() {
  return {
    rows: [
      { name: 'Alice Johnson', company: 'TechCorp' },
      { name: 'Bob Smith', company: 'StartupXYZ' },
    ],
    prompt: 'Write a professional bio for {{name}} who works at {{company}}',
    output_schema: [{ name: 'bio', description: 'Professional biography' }],
    context: 'Professional bios for company website',
    temperature: 0.7,
    max_tokens: 8192,
  }
}
