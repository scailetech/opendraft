/**
 * Test Direct Batch Processing with Tools
 * 
 * Test processing 1000 rows with web-search + url-context tools
 * Direct from Render - no Modal/Railway needed
 */

import { NextRequest, NextResponse } from 'next/server'
import { logError, logDebug } from '@/lib/utils/logger'

export const maxDuration = 6000 // 100 minutes (Render max)

interface TestRow {
  company: string
  url?: string
}

async function processRowWithTools(
  row: TestRow,
  index: number,
  prompt: string,
  geminiApiKey: string
): Promise<{
  index: number
  status: 'success' | 'error'
  result?: string
  error?: string
  tokens?: { input: number; output: number }
  elapsedMs?: number
}> {
  const startTime = Date.now()
  const rowId = `row-${index}`

  try {
    // Replace template variables
    let finalPrompt = prompt.replace('{{company}}', row.company)
    if (row.url) {
      finalPrompt = finalPrompt.replace('{{url}}', row.url)
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`
    
    // Use native Gemini tools (web-search + url-context)
    // Note: Tools and responseSchema can't be used together in single call
    // So we do two-phase: first with tools, then with schema
    
    // Phase 1: Call with tools to get information
    const toolRequestBody = {
      contents: [{ parts: [{ text: finalPrompt }] }],
      tools: [
        { googleSearch: {} },
        { urlContext: {} }
      ]
    }

    const toolResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toolRequestBody),
    })

    if (!toolResponse.ok) {
      const errorText = await toolResponse.text()
      return {
        index,
        status: 'error',
        error: `Tool phase error: ${toolResponse.status} - ${errorText.substring(0, 200)}`,
        elapsedMs: Date.now() - startTime
      }
    }

    const toolResult = await toolResponse.json()
    const toolText = toolResult.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Phase 2: Get structured JSON output
    const finalPromptWithContext = `${finalPrompt}\n\n--- GATHERED INFORMATION ---\n${toolText}\n--- END ---\n\nBased on the above information, provide a structured JSON response.`
    
    const requestBody = {
      contents: [{ parts: [{ text: finalPromptWithContext }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            description: { type: 'string', description: 'Company description' },
            website: { type: 'string', description: 'Company website URL' },
            industry: { type: 'string', description: 'Industry sector' }
          },
          required: ['description']
        }
      }
    }

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    const elapsed = Date.now() - startTime

    if (!response.ok) {
      const errorText = await response.text()
      return {
        index,
        status: 'error',
        error: `Schema phase error: ${response.status} - ${errorText.substring(0, 200)}`,
        elapsedMs: elapsed
      }
    }

    const result = await response.json()
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    
    // Combine usage metadata from both calls
    const toolUsage = toolResult.usageMetadata || {}
    const schemaUsage = result.usageMetadata || {}
    const usageMetadata = {
      promptTokenCount: (toolUsage.promptTokenCount || 0) + (schemaUsage.promptTokenCount || 0),
      candidatesTokenCount: (toolUsage.candidatesTokenCount || 0) + (schemaUsage.candidatesTokenCount || 0)
    }

    return {
      index,
      status: 'success',
      result: text,
      tokens: {
        input: usageMetadata.promptTokenCount || 0,
        output: usageMetadata.candidatesTokenCount || 0
      },
      elapsedMs: elapsed
    }
  } catch (error) {
    return {
      index,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      elapsedMs: Date.now() - startTime
    }
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { 
      rowCount = 1000, 
      prompt = 'Find information about {{company}}. What industry are they in?',
      testRows = null // Optional: provide custom rows
    } = body

    const geminiApiKey = process.env.GEMINI_API_KEY
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      )
    }

    // Generate test rows
    const rows: TestRow[] = testRows || Array.from({ length: rowCount }, (_, i) => ({
      company: `Company ${i + 1}`,
      url: i % 10 === 0 ? `https://example.com/company-${i + 1}` : undefined // Some rows have URLs
    }))

    logDebug(`[TEST] Starting batch test: ${rows.length} rows with tools`, {
      rowCount: rows.length,
      prompt
    })

    // Process ALL rows in parallel (Render can handle this!)
    const results = await Promise.all(
      rows.map((row, index) => 
        processRowWithTools(row, index, prompt, geminiApiKey)
      )
    )

    const totalElapsed = Date.now() - startTime

    // Calculate statistics
    const successful = results.filter(r => r.status === 'success').length
    const failed = results.filter(r => r.status === 'error').length
    const totalInputTokens = results.reduce((sum, r) => sum + (r.tokens?.input || 0), 0)
    const totalOutputTokens = results.reduce((sum, r) => sum + (r.tokens?.output || 0), 0)
    const avgTimePerRow = totalElapsed / rows.length
    const fastestRow = Math.min(...results.map(r => r.elapsedMs || Infinity))
    const slowestRow = Math.max(...results.map(r => r.elapsedMs || 0))

    // Sample results (first 3 successful, first 3 errors)
    const sampleSuccess = results.filter(r => r.status === 'success').slice(0, 3)
    const sampleErrors = results.filter(r => r.status === 'error').slice(0, 3)

    logDebug(`[TEST] Batch test complete`, {
      totalRows: rows.length,
      successful,
      failed,
      totalElapsed,
      avgTimePerRow
    })

    return NextResponse.json({
      success: true,
      summary: {
        totalRows: rows.length,
        successful,
        failed,
        successRate: `${((successful / rows.length) * 100).toFixed(1)}%`
      },
      performance: {
        totalElapsedMs: totalElapsed,
        totalElapsedSeconds: (totalElapsed / 1000).toFixed(1),
        avgTimePerRowMs: avgTimePerRow.toFixed(1),
        fastestRowMs: fastestRow,
        slowestRowMs: slowestRow,
        rowsPerSecond: (rows.length / (totalElapsed / 1000)).toFixed(1)
      },
      tokens: {
        totalInput: totalInputTokens,
        totalOutput: totalOutputTokens,
        total: totalInputTokens + totalOutputTokens,
        avgPerRow: {
          input: Math.round(totalInputTokens / rows.length),
          output: Math.round(totalOutputTokens / rows.length)
        }
      },
      sampleResults: {
        successful: sampleSuccess.map(r => ({
          index: r.index,
          result: r.result?.substring(0, 200),
          elapsedMs: r.elapsedMs,
          tokens: r.tokens
        })),
        errors: sampleErrors.map(r => ({
          index: r.index,
          error: r.error?.substring(0, 200),
          elapsedMs: r.elapsedMs
        }))
      },
      message: `✅ Processed ${rows.length} rows with web-search + url-context tools in ${(totalElapsed / 1000).toFixed(1)}s`
    })
  } catch (error) {
    const elapsed = Date.now() - startTime
    logError('[TEST] Batch test failed', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      elapsedMs: elapsed,
      message: '❌ Test failed'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test Direct Batch Processing with Tools',
    usage: {
      method: 'POST',
      body: {
        rowCount: 1000, // Number of rows to test
        prompt: 'Find information about {{company}}. What industry are they in?',
        testRows: null // Optional: custom rows array
      }
    },
    example: {
      rowCount: 1000,
      prompt: 'Find information about {{company}}. What industry are they in?'
    },
    tools: ['web-search', 'url-context'],
    timeout: '100 minutes (Render max)'
  })
}

