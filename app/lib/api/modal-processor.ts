/**
 * Modal Backend API Client
 *
 * Integrates with the Modal serverless backend for AI batch processing.
 * Modal endpoint processes CSV rows in parallel using Google Gemini.
 */

const MODAL_API_URL = process.env.MODAL_API_URL ||
  'https://tech-bulkgpt--bulk-gpt-processor-v4-fastapi-app.modal.run'

export interface OutputColumn {
  name: string
  description?: string
}

export interface BatchRequest {
  batch_id: string
  rows: Array<Record<string, string>>
  prompt: string
  context?: string
  output_columns: OutputColumn[]
  webhook_url?: string
}

export interface BatchResponse {
  status: 'accepted'
  batch_id: string
  total_rows: number
  message: string
}

/**
 * Submit a batch to Modal for processing
 *
 * @param request - Batch processing request
 * @returns Promise with batch acceptance confirmation
 * @throws Error if submission fails
 */
export async function submitBatch(request: BatchRequest): Promise<BatchResponse> {
  if (!MODAL_API_URL) {
    throw new Error('MODAL_API_URL environment variable not set')
  }

  // Use /batch endpoint (legacy endpoint that works)
  // /process/batch returns 404, so we use /batch instead
  const response = await fetch(`${MODAL_API_URL}/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Modal batch submission failed (${response.status}): ${errorText}`)
  }

  return response.json()
}

/**
 * Check Modal backend health
 *
 * @returns Promise with health status
 * @throws Error if health check fails
 */
export async function checkHealth(): Promise<{ status: string }> {
  if (!MODAL_API_URL) {
    throw new Error('MODAL_API_URL environment variable not set')
  }

  const response = await fetch(`${MODAL_API_URL}/health`)

  if (!response.ok) {
    throw new Error(`Modal health check failed: ${response.status}`)
  }

  return response.json()
}
