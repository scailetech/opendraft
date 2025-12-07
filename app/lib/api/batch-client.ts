/**
 * ABOUTME: TypeScript client for bulk.run batch processing API
 * ABOUTME: Provides type-safe methods for creating batches, polling status, and streaming results
 */

// Type Definitions
export type BatchStatus = 'pending' | 'processing' | 'completed' | 'completed_with_errors' | 'failed' | 'cancelled'
export type ResultStatus = 'pending' | 'processing' | 'success' | 'error'

export interface CreateBatchRequest {
  csvFilename: string
  rows: Record<string, unknown>[]
  prompt: string
  context?: string
  outputColumns?: string[]
  webhookUrl?: string
}

export interface CreateBatchResponse {
  success: boolean
  batchId: string
  status: BatchStatus
  totalRows: number
  message: string
}

export interface BatchResult {
  id: string
  input: Record<string, unknown>
  output: string | null
  status: ResultStatus
  error: string | null
}

export interface BatchStatusResponse {
  success: boolean
  batchId: string
  status: BatchStatus
  totalRows: number
  processedRows: number
  progressPercent: number
  results: BatchResult[]
  message: string
  createdAt: string
  updatedAt: string
}

export interface BatchProgressEvent {
  total: number
  completed: number
  status: BatchStatus
}

export interface BatchResultEvent {
  id: string
  row_index: number
  status: ResultStatus
  output_data: string | null
  input_data: string
  error_message?: string
  input_tokens?: number
  output_tokens?: number
  model?: string
  tools_used?: string[]
}

export interface BatchCompleteEvent {
  status: BatchStatus
  total: number
  processed: number
}

export type BatchEventHandler = {
  onProgress?: (event: BatchProgressEvent) => void
  onResult?: (event: BatchResultEvent) => void
  onComplete?: (event: BatchCompleteEvent) => void
  onError?: (error: string) => void
}

// API Client Class
export class BatchAPIClient {
  private baseURL: string
  private apiKey?: string

  constructor(baseURL: string = '', apiKey?: string) {
    this.baseURL = baseURL
    this.apiKey = apiKey
  }

  /**
   * Create a new batch and start processing
   */
  async createBatch(request: CreateBatchRequest): Promise<CreateBatchResponse> {
    const response = await fetch(`${this.baseURL}/api/process`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get current batch status and all results
   */
  async getBatchStatus(batchId: string): Promise<BatchStatusResponse> {
    const response = await fetch(`${this.baseURL}/api/batch/${batchId}/status`, {
      headers: this.getHeaders()
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Poll batch status until completion
   * @param batchId - Batch ID to poll
   * @param intervalMs - Polling interval in milliseconds (default: 2000)
   * @param maxAttempts - Maximum polling attempts (default: 60)
   * @param onProgress - Optional callback for progress updates
   */
  async pollBatchUntilComplete(
    batchId: string,
    intervalMs: number = 2000,
    maxAttempts: number = 60,
    onProgress?: (status: BatchStatusResponse) => void
  ): Promise<BatchStatusResponse> {
    let attempt = 0

    while (attempt < maxAttempts) {
      attempt++

      const status = await this.getBatchStatus(batchId)

      if (onProgress) {
        onProgress(status)
      }

      if (status.status === 'completed' || status.status === 'completed_with_errors' || status.status === 'failed') {
        return status
      }

      await this.sleep(intervalMs)
    }

    throw new Error(`Polling timeout: Batch did not complete after ${maxAttempts} attempts`)
  }

  /**
   * Stream batch results via Server-Sent Events
   * @param batchId - Batch ID to stream
   * @param handlers - Event handlers for progress, results, completion, and errors
   * @returns EventSource instance (caller should close when done)
   */
  streamBatchResults(batchId: string, handlers: BatchEventHandler): EventSource {
    const url = `${this.baseURL}/api/batch/${batchId}/stream`
    const eventSource = new EventSource(url)

    eventSource.addEventListener('progress', (e: MessageEvent) => {
      if (handlers.onProgress) {
        const data: BatchProgressEvent = JSON.parse(e.data)
        handlers.onProgress(data)
      }
    })

    eventSource.addEventListener('result', (e: MessageEvent) => {
      if (handlers.onResult) {
        const data: BatchResultEvent = JSON.parse(e.data)
        handlers.onResult(data)
      }
    })

    eventSource.addEventListener('complete', (e: MessageEvent) => {
      if (handlers.onComplete) {
        const data: BatchCompleteEvent = JSON.parse(e.data)
        handlers.onComplete(data)
      }
      eventSource.close()
    })

    eventSource.addEventListener('error', (e) => {
      if (handlers.onError) {
        handlers.onError(e.type === 'error' ? 'Stream connection error' : 'Unknown error')
      }
    })

    eventSource.onerror = () => {
      if (handlers.onError) {
        handlers.onError('EventSource failed')
      }
      eventSource.close()
    }

    return eventSource
  }

  /**
   * Cancel a running batch
   * Note: This endpoint may not be implemented yet - check API documentation
   */
  async cancelBatch(batchId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseURL}/api/batch/${batchId}/cancel`, {
      method: 'POST',
      headers: this.getHeaders()
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Helper method to get request headers
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    return headers
  }

  /**
   * Helper method to sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Convenience factory function
export function createBatchClient(baseURL?: string, apiKey?: string): BatchAPIClient {
  return new BatchAPIClient(baseURL, apiKey)
}

// Default client instance (uses current origin)
export const batchAPI = new BatchAPIClient()
