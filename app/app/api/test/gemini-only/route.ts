/**
 * Test Endpoint: Gemini API Only
 *
 * Tests just the Gemini API without database requirements
 * Useful for verifying Gemini works before involving the database
 */

import { NextRequest, NextResponse } from 'next/server'

// Test Gemini directly without using dev-batch-processor exports
async function testGeminiDirect(
  prompt: string,
  row: Record<string, unknown>
): Promise<{ response: string; usage: { inputTokens: number; outputTokens: number } }> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai')

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

  // Replace variables in prompt
  let personalizedPrompt = prompt
  const variablePattern = /\{\{([^}]+)\}\}/g
  personalizedPrompt = personalizedPrompt.replace(variablePattern, (match, varName) => {
    const value = row[varName.trim()]
    return value !== undefined && value !== null ? String(value) : match
  })

  console.log('Personalized prompt:', personalizedPrompt)

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: personalizedPrompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  })

  // Type assertion for Gemini response metadata
  const responseWithMetadata = result.response as { 
    text: () => string
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
  }
  
  return {
    response: result.response.text(),
    usage: {
      inputTokens: responseWithMetadata.usageMetadata?.promptTokenCount || 0,
      outputTokens: responseWithMetadata.usageMetadata?.candidatesTokenCount || 0,
    }
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Test endpoint only available in development mode' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { prompt = 'Analyze {{company}} and provide insights' } = body

    // Test data
    const testRows = [
      { company: 'OpenAI', topic: 'AI Safety' },
      { company: 'Google', topic: 'Search Technology' }
    ]

    console.log('[GEMINI TEST] Starting Gemini API test')
    console.log('[GEMINI TEST] Prompt:', prompt)
    console.log('[GEMINI TEST] Test data:', testRows)

    const results = []

    for (let i = 0; i < testRows.length; i++) {
      const row = testRows[i]
      console.log(`[GEMINI TEST] Processing row ${i + 1}/${testRows.length}:`, row)

      try {
        const result = await testGeminiDirect(prompt, row)
        results.push({
          rowIndex: i,
          input: row,
          output: result.response,
          tokens: result.usage,
          success: true
        })
        console.log(`[GEMINI TEST] Row ${i + 1} success`)
      } catch (error) {
        results.push({
          rowIndex: i,
          input: row,
          error: error instanceof Error ? error.message : String(error),
          success: false
        })
        console.log(`[GEMINI TEST] Row ${i + 1} failed:`, error)
      }
    }

    console.log('[GEMINI TEST] All rows processed')

    return NextResponse.json({
      success: true,
      message: 'Gemini API test completed!',
      prompt,
      results,
      summary: {
        totalRows: testRows.length,
        successCount: results.filter(r => r.success).length,
        failCount: results.filter(r => !r.success).length,
        totalInputTokens: results.reduce((sum, r) => sum + (r.tokens?.inputTokens || 0), 0),
        totalOutputTokens: results.reduce((sum, r) => sum + (r.tokens?.outputTokens || 0), 0)
      }
    })
  } catch (error) {
    console.error('[GEMINI TEST] Error:', error)
    return NextResponse.json(
      {
        error: 'Gemini test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : '') : undefined
      },
      { status: 500 }
    )
  }
}

export async function GET(): Promise<Response> {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Test endpoint only available in development mode' },
      { status: 403 }
    )
  }

  return NextResponse.json({
    message: 'Gemini API Test Endpoint (No Database)',
    instructions: 'POST with a JSON body containing a prompt with {{variables}}',
    example: {
      prompt: 'Analyze {{company}} and provide insights on {{topic}}. Return as JSON.'
    },
    sampleData: [
      { company: 'OpenAI', topic: 'AI Safety' },
      { company: 'Google', topic: 'Search Technology' }
    ],
    description: 'This tests the Gemini API directly without database operations. Good for verifying that GEMINI_API_KEY is working.'
  })
}
