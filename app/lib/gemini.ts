import { GoogleGenerativeAI } from '@google/generative-ai'
import type { SchemaColumn } from './types'
import { BulkGPTError } from './types'

/**
 * GeminiClient - Manages all interactions with Google's Gemini API
 * Includes rate limiting, retry logic, and error handling
 */
export class GeminiClient {
  private apiKey: string | null = null
  private client: GoogleGenerativeAI | null = null
  private requestCount = 0
  private windowStartTime = Date.now()
  private readonly RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
  private readonly RATE_LIMIT_MAX = 60 // requests per minute
  private readonly TIMEOUT_MS = 30 * 1000 // 30 seconds
  private readonly RETRY_DELAYS = [1000, 2000, 4000] // exponential backoff

  /**
   * Initialize client with API key
   */
  initialize(apiKey: string): void {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new BulkGPTError('INVALID_API_KEY', 'Gemini API key is required')
    }

    this.apiKey = apiKey
    this.client = new GoogleGenerativeAI(apiKey)
  }

  /**
   * Check if client is initialized
   */
  private ensureInitialized(): void {
    if (!this.apiKey || !this.client) {
      throw new BulkGPTError(
        'NOT_INITIALIZED',
        'GeminiClient not initialized. Call initialize(apiKey) first.'
      )
    }
  }

  /**
   * Check rate limit and update counter
   */
  checkRateLimit(): boolean {
    const now = Date.now()
    const elapsed = now - this.windowStartTime

    // Reset window if time has passed
    if (elapsed > this.RATE_LIMIT_WINDOW) {
      this.requestCount = 0
      this.windowStartTime = now
    }

    // Check if limit exceeded
    if (this.requestCount >= this.RATE_LIMIT_MAX) {
      return false
    }

    this.requestCount++
    return true
  }

  /**
   * Replace template variables in prompt
   * {{variable}} → value from data object
   */
  private replaceTemplateVariables(prompt: string, data: Record<string, string>): string {
    let result = prompt
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{{${key}}}`
      // Use regex replace for ES2020 compatibility (replaceAll not available)
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value || '')
    }
    return result
  }

  /**
   * Generate system prompt for schema
   */
  generateSystemPrompt(schema: SchemaColumn[]): string {
    const fields = schema.map((col) => `- ${col.name} (${col.type})`).join('\n')

    return `You are a data processing AI. When asked to process data, respond with ONLY valid JSON (no markdown, no explanation).

Your output must be a JSON object with these exact fields:
${fields}

Rules:
1. Return ONLY the JSON object
2. No markdown code blocks
3. No explanations or preamble
4. All strings must be properly quoted
5. Use null for missing values`
  }

  /**
   * Retry logic with exponential backoff
   */
  async retryWithBackoff(fn: () => Promise<string>, maxRetries: number): Promise<string> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Don't delay on last attempt
        if (attempt < maxRetries - 1) {
          const delayMs = this.RETRY_DELAYS[attempt] || 4000
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
      }
    }

    throw lastError || new BulkGPTError('RETRY_FAILED', 'All retry attempts failed')
  }

  /**
   * Process single row with Gemini
   */
  async processRow(
    prompt: string,
    data: Record<string, string>
  ): Promise<string> {
    this.ensureInitialized()

    if (!this.checkRateLimit()) {
      throw new BulkGPTError(
        'RATE_LIMIT_EXCEEDED',
        'Rate limit exceeded (60 requests/minute)'
      )
    }

    return this.retryWithBackoff(async () => {
      const finalPrompt = this.replaceTemplateVariables(prompt, data)

      try {
        // Use timeout to enforce 30s limit
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS)

        try {
          const model = this.client!.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
          const result = await Promise.race([
            model.generateContent(finalPrompt),
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new BulkGPTError('TIMEOUT', 'Request timed out after 30 seconds')),
                this.TIMEOUT_MS
              )
            ),
          ])

          const text = result.response.text()
          if (!text || text.length === 0) {
            throw new BulkGPTError(
              'EMPTY_RESPONSE',
              'Gemini API returned empty response'
            )
          }

          return text
        } finally {
          clearTimeout(timeoutId)
        }
      } catch (error) {
        if (error instanceof BulkGPTError) {
          throw error
        }

        const message = error instanceof Error ? error.message : String(error)
        throw new BulkGPTError(
          'GEMINI_ERROR',
          `Gemini API error: ${message}`,
          { originalError: message }
        )
      }
    }, 3)
  }

  /**
   * Stream responses (returns async generator)
   */
  async *streamResponse(prompt: string): AsyncGenerator<string> {
    this.ensureInitialized()

    if (!this.checkRateLimit()) {
      throw new BulkGPTError(
        'RATE_LIMIT_EXCEEDED',
        'Rate limit exceeded (60 requests/minute)'
      )
    }

    try {
      const model = this.client!.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
      const result = await model.generateContentStream(prompt)

      for await (const chunk of result.stream) {
        // Extract text from chunk
        const text = chunk.text()
        if (text && text.length > 0) {
          yield text
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new BulkGPTError(
        'STREAM_ERROR',
        `Streaming error: ${message}`,
        { originalError: message }
      )
    }
  }

  /**
   * Get remaining rate limit count
   */
  getRemainingRequests(): number {
    // Reset if window expired
    const now = Date.now()
    if (now - this.windowStartTime > this.RATE_LIMIT_WINDOW) {
      this.requestCount = 0
      this.windowStartTime = now
    }

    return Math.max(0, this.RATE_LIMIT_MAX - this.requestCount)
  }
}

// Singleton instance
let geminiClientInstance: GeminiClient | null = null

/**
 * Get or create Gemini client singleton
 */
export function getGeminiClient(): GeminiClient {
  if (!geminiClientInstance) {
    geminiClientInstance = new GeminiClient()
    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey) {
      geminiClientInstance.initialize(apiKey)
    }
  }
  return geminiClientInstance
}






