import { getGeminiClient } from './gemini'
import { BulkGPTError } from './types'

export interface BatchConfig {
  prompt: string
  rows: Record<string, string>[]
  batchId: string
  maxRetries?: number
  onProgress?: (progress: BatchProgress) => void
}

export interface BatchProgress {
  processed: number
  total: number
  elapsedMs: number
  status: BatchStatus
}

export type BatchStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

export interface BatchStats {
  total: number
  processed: number
  failed: number
  successRate: number
}

interface RowResult {
  rowIndex: number
  input: Record<string, string>
  output: string
  status: 'success' | 'error'
  error?: string
  retries: number
}

/**
 * BatchProcessor - Processes CSV rows through Gemini API
 */
export class BatchProcessor {
  private config: Required<BatchConfig>
  private status: BatchStatus = 'pending'
  private results: RowResult[] = []
  private startTime = 0
  private cancelled = false
  private rowProcessingTimes: number[] = []
  private progressCallback: ((progress: BatchProgress) => void) | null = null

  constructor(config: BatchConfig) {
    this.config = {
      ...config,
      maxRetries: config.maxRetries ?? 3,
      onProgress: config.onProgress ?? (() => {}),
    }
    this.progressCallback = config.onProgress ?? null
  }

  getId(): string {
    return this.config.batchId
  }

  getStatus(): BatchStatus {
    return this.status
  }

  getTotalRows(): number {
    return this.config.rows.length
  }

  getStats(): BatchStats {
    const successful = this.results.filter((r) => r.status === 'success').length
    const failed = this.results.filter((r) => r.status === 'error').length

    return {
      total: this.config.rows.length,
      processed: this.results.length,
      failed,
      successRate: this.results.length > 0 ? (successful / this.results.length) * 100 : 0,
    }
  }

  async getResults(): Promise<RowResult[]> {
    return this.results
  }

  onProgress(callback: (progress: BatchProgress) => void): void {
    this.progressCallback = callback
  }

  cancel(): void {
    this.cancelled = true
    this.status = 'cancelled'
  }

  async resume(): Promise<void> {
    this.cancelled = false
    await this.processBatch()
  }

  async processRow(row: Record<string, string>): Promise<string> {
    const client = getGeminiClient()
    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const result = await client.processRow(this.config.prompt, row)
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt < this.config.maxRetries - 1) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt) * 1000
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError || new BulkGPTError('RETRY_FAILED', 'Failed to process row after retries')
  }

  async processBatch(): Promise<void> {
    if (this.status === 'processing') {
      throw new BulkGPTError('ALREADY_PROCESSING', 'Batch is already being processed')
    }

    this.status = 'processing'
    this.startTime = Date.now()
    this.results = []
    this.cancelled = false

    try {
      for (let i = 0; i < this.config.rows.length; i++) {
        if (this.cancelled) {
          this.status = 'cancelled'
          return
        }

        const row = this.config.rows[i]
        const rowStartTime = Date.now()

        try {
          const output = await this.processRow(row)
          const duration = Date.now() - rowStartTime

          this.results.push({
            rowIndex: i,
            input: row,
            output,
            status: 'success',
            retries: 0,
          })

          this.rowProcessingTimes.push(duration)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          this.results.push({
            rowIndex: i,
            input: row,
            output: '',
            status: 'error',
            error: message,
            retries: this.config.maxRetries,
          })
        }

        // Emit progress
        this.emitProgress()
      }

      this.status = 'completed'
      this.emitProgress()
    } catch (error) {
      this.status = 'failed'
      throw error
    }
  }

  private emitProgress(): void {
    if (this.progressCallback) {
      const progress: BatchProgress = {
        processed: this.results.length,
        total: this.config.rows.length,
        elapsedMs: Date.now() - this.startTime,
        status: this.status,
      }
      this.progressCallback(progress)
    }
  }
}






