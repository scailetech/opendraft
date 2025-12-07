/**
 * Direct Processing Route - Process rows directly in Vercel
 * 
 * This processes batches directly in Vercel serverless functions.
 * Vercel Pro: 5 minute timeout (300 seconds)
 * Can handle ~1000 rows in parallel (Gemini API calls are fast)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { authenticateRequest } from '@/lib/auth-middleware'
import { logError, logDebug } from '@/lib/utils/logger'

export const maxDuration = 300 // 5 minutes (Vercel Pro max)

interface ProcessRowParams {
  batchId: string
  row: Record<string, any>
  rowIndex: number
  prompt: string
  context: string
  outputSchema: Array<{ name: string; description?: string }>
  tools: string[]
}

async function processSingleRow({
  batchId,
  row,
  rowIndex,
  prompt,
  context,
  outputSchema,
  tools,
}: ProcessRowParams): Promise<{
  id: string
  output: string
  status: string
  error?: string
  input_tokens?: number
  output_tokens?: number
}> {
  const rowId = `${batchId}-row-${rowIndex}`
  const geminiApiKey = process.env.GEMINI_API_KEY

  if (!geminiApiKey) {
    return {
      id: rowId,
      output: '',
      status: 'error',
      error: 'GEMINI_API_KEY not configured',
    }
  }

  try {
    // Replace template variables
    let finalPrompt = prompt
    for (const [key, value] of Object.entries(row)) {
      if (key !== 'id' && value) {
        finalPrompt = finalPrompt.replace(
          new RegExp(`{{${key}}}`, 'g'),
          String(value)
        )
      }
    }

    if (context) {
      finalPrompt = `Context: ${context}\n\n${finalPrompt}`
    }

    // Build output schema
    const schemaFields = outputSchema.length > 0
      ? outputSchema.map(col => ({
          name: typeof col === 'string' ? col : col.name,
          description: typeof col === 'string' ? '' : (col.description || ''),
        }))
      : [{ name: 'output', description: 'The complete answer' }]

    // Call Gemini API directly
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`
    
    const requestBody: any = {
      contents: [{ parts: [{ text: finalPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: schemaFields.reduce((acc, field) => {
            acc[field.name] = { type: 'string', description: field.description }
            return acc
          }, {} as Record<string, any>),
          required: schemaFields.map(f => f.name),
        },
      },
    }

    // Add tools if needed
    if (tools && tools.length > 0) {
      const geminiTools: any[] = []
      if (tools.includes('web-search')) {
        geminiTools.push({ googleSearch: {} })
      }
      if (tools.includes('scrape-page')) {
        geminiTools.push({ urlContext: {} })
      }
      if (geminiTools.length > 0) {
        requestBody.tools = geminiTools
      }
    }

    const startTime = Date.now()
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    const elapsed = Date.now() - startTime

    // Extract response
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    const usageMetadata = result.usageMetadata || {}

    // Parse JSON response
    let output: Record<string, string> = {}
    try {
      const parsed = JSON.parse(text)
      output = parsed
    } catch (e) {
      // If not JSON, wrap in output field
      output = { output: text }
    }

    return {
      id: rowId,
      output: JSON.stringify(output),
      status: 'success',
      input_tokens: usageMetadata.promptTokenCount || 0,
      output_tokens: usageMetadata.candidatesTokenCount || 0,
    }
  } catch (error) {
    return {
      id: rowId,
      output: '',
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  let userId: string | null = null

  try {
    userId = await authenticateRequest(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { batchId, rows, prompt, context, outputColumns, tools } = body

    if (!batchId || !rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'batchId and rows array required' },
        { status: 400 }
      )
    }

    // Update batch status
    await supabaseAdmin
      .from('batches')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', batchId)

    logDebug(`[DIRECT] Processing ${rows.length} rows directly in Vercel`, { batchId })

    const startTime = Date.now()

    // Process ALL rows in parallel (Vercel can handle this!)
    const results = await Promise.all(
      rows.map((row: Record<string, any>, index: number) =>
        processSingleRow({
          batchId,
          row,
          rowIndex: index,
          prompt: prompt || '',
          context: context || '',
          outputSchema: outputColumns || [],
          tools: tools || [],
        })
      )
    )

    const processingTime = Date.now() - startTime
    logDebug(`[DIRECT] Processed ${rows.length} rows in ${processingTime}ms`, { batchId })

    // Batch insert results
    const BATCH_SIZE = 100
    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      const chunk = results.slice(i, i + BATCH_SIZE)
      const records = chunk.map(r => ({
        id: r.id,
        batch_id: batchId,
        input_data: JSON.stringify(rows[parseInt(r.id.split('-row-')[1])] || {}),
        output_data: r.output,
        row_index: parseInt(r.id.split('-row-')[1]) || 0,
        status: r.status,
        error_message: r.error,
        input_tokens: r.input_tokens || 0,
        output_tokens: r.output_tokens || 0,
        model: 'gemini-2.5-flash-lite',
        tools_used: tools || [],
      }))

      await supabaseAdmin
        .from('batch_results')
        .upsert(records, { onConflict: 'batch_id,row_index' })
    }

    // Update batch status
    const successful = results.filter(r => r.status === 'success').length
    const failed = results.filter(r => r.status === 'error').length
    const totalInputTokens = results.reduce((sum, r) => sum + (r.input_tokens || 0), 0)
    const totalOutputTokens = results.reduce((sum, r) => sum + (r.output_tokens || 0), 0)

    await supabaseAdmin
      .from('batches')
      .update({
        status: failed === 0 ? 'completed' : 'completed_with_errors',
        processed_rows: successful,
        total_input_tokens: totalInputTokens,
        total_output_tokens: totalOutputTokens,
        updated_at: new Date().toISOString(),
      })
      .eq('id', batchId)

    return NextResponse.json({
      success: true,
      batchId,
      totalRows: rows.length,
      successful,
      failed,
      processingTimeMs: processingTime,
      message: 'Batch processed directly in Vercel',
    })
  } catch (error) {
    logError('Direct processing error', error, { userId })
    return NextResponse.json(
      {
        error: 'Processing failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

