/**
 * Test Direct Gemini SDK Calls
 * 
 * Simple test to verify we can call Gemini API directly from Render
 * No processing, just send request and get response back
 */

import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 6000 // 100 minutes (Render max)

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json()
    const { prompt, testRows = 1 } = body

    if (!prompt) {
      return NextResponse.json(
        { error: 'prompt is required' },
        { status: 400 }
      )
    }

    const geminiApiKey = process.env.GEMINI_API_KEY
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      )
    }

    const startTime = Date.now()

    // Test: Make direct Gemini API call
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`
    
    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            result: { type: 'string', description: 'The answer' }
          },
          required: ['result']
        }
      }
    }

    // Test single call first
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    const elapsed = Date.now() - startTime

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({
        success: false,
        error: `Gemini API error: ${response.status}`,
        details: errorText,
        elapsedMs: elapsed
      }, { status: 500 })
    }

    const result = await response.json()
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    const usageMetadata = result.usageMetadata || {}

    // Test parallel calls if requested
    let parallelResults = null
    if (testRows > 1) {
      const parallelStart = Date.now()
      const parallelPromises = Array(testRows).fill(null).map(() =>
        fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }).then(r => r.json())
      )
      
      parallelResults = await Promise.all(parallelPromises)
      const parallelElapsed = Date.now() - parallelStart
      
      return NextResponse.json({
        success: true,
        singleCall: {
          elapsedMs: elapsed,
          tokens: {
            input: usageMetadata.promptTokenCount || 0,
            output: usageMetadata.candidatesTokenCount || 0
          },
          result: text
        },
        parallelCalls: {
          count: testRows,
          elapsedMs: parallelElapsed,
          avgPerCall: parallelElapsed / testRows,
          results: parallelResults.map(r => ({
            text: r.candidates?.[0]?.content?.parts?.[0]?.text || '{}',
            tokens: r.usageMetadata || {}
          }))
        },
        message: `✅ Successfully processed ${testRows} parallel calls in ${parallelElapsed}ms`
      })
    }

    return NextResponse.json({
      success: true,
      elapsedMs: elapsed,
      tokens: {
        input: usageMetadata.promptTokenCount || 0,
        output: usageMetadata.candidatesTokenCount || 0
      },
      result: text,
      message: '✅ Direct Gemini API call successful'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: '❌ Test failed'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test Gemini Direct API',
    usage: {
      method: 'POST',
      body: {
        prompt: 'Your prompt here',
        testRows: 1 // Optional: test parallel calls (1-100)
      }
    },
    example: {
      prompt: 'What is 2+2?',
      testRows: 5 // Test 5 parallel calls
    }
  })
}

