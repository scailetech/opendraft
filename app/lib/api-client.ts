/**
 * API Client for bulk processing through Gemini
 */

import { logError } from './errors'

export interface ProcessRow {
  id: string
  input: Record<string, string>
}

export interface ProcessResult {
  id: string
  input: string
  output: string
  status: 'success' | 'error'
  error?: string
}

export interface ProcessResponse {
  success: boolean
  input: Record<string, string>
  output: string
}

export interface ProcessError {
  error: string
}

/**
 * Process CSV rows through the API and return results
 * Supports streaming for real-time progress updates
 */
export async function processRows(
  prompt: string,
  rows: Record<string, string>[],
  onProgress?: (result: ProcessResult) => void
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = []
  let rowIndex = 0

  try {
    const response = await fetch('/api/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        rows,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Processing failed')
    }

    // Handle streaming response
    if (!response.body) {
      throw new Error('No response body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')

      // Process all complete lines
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim()
        if (!line) continue

        try {
          const data = JSON.parse(line)

          if (data.error) {
            const result: ProcessResult = {
              id: String(rowIndex),
              input: JSON.stringify(rows[rowIndex] || {}),
              output: '',
              status: 'error',
              error: data.error,
            }
            results.push(result)
            onProgress?.(result)
          } else if (data.success) {
            const result: ProcessResult = {
              id: String(rowIndex),
              input: JSON.stringify(data.input),
              output: data.output,
              status: 'success',
            }
            results.push(result)
            onProgress?.(result)
          }
          rowIndex++
        } catch (parseError) {
          logError(
            parseError instanceof Error ? parseError : new Error('Parse error'),
            { line, rowIndex }
          )
        }
      }

      // Keep incomplete line in buffer
      buffer = lines[lines.length - 1]
    }

    return results
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Processing failed'
    )
  }
}

