/**
 * ABOUTME: Type-safe API client for GTM (Go-To-Market) backend enrichment services
 * ABOUTME: Provides retry logic, error handling, and authentication for GTM API calls
 */

import {
  type GTMClientConfig,
  type EnrichRowRequest,
  type EnrichRowResponse,
  type EnrichBatchRequest,
  type EnrichBatchResponse,
  type ToolValidation,
  GTMAPIError,
  type GTMAPIErrorCode,
  ALL_GTM_TOOLS,
} from '@/lib/types/gtm-types'
import { logError } from '@/lib/errors'

// ============================================================================
// Constants
// ============================================================================

/** Production GTM API base URL */
const DEFAULT_BASE_URL = 'https://scaile--g-mcp-tools-v2-api.modal.run'

/** Default request timeout (30 seconds) */
const DEFAULT_TIMEOUT = 30000

/** Default max retry attempts */
const DEFAULT_MAX_RETRIES = 3

/** Backoff multiplier for retries (exponential) */
const BACKOFF_MULTIPLIER = 2

/** Initial backoff delay (1 second) */
const INITIAL_BACKOFF_MS = 1000

// ============================================================================
// GTM API Client Class
// ============================================================================

/**
 * GTM API Client - Type-safe client for GTM backend enrichment services
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Request timeout handling
 * - Authentication (Bearer token)
 * - Error handling and logging
 * - Tool validation
 *
 * @example
 * ```typescript
 * const client = new GTMAPIClient({ authToken: 'your-jwt-token' })
 *
 * const result = await client.enrichRow({
 *   data: { email: 'john@example.com' },
 *   tools: ['email-validate', 'email-intel']
 * })
 * ```
 */
export class GTMAPIClient {
  private config: Required<GTMClientConfig>

  /**
   * Create a new GTM API client
   *
   * @param config - Client configuration (optional)
   */
  constructor(config: GTMClientConfig = {}) {
    this.config = {
      baseURL: config.baseURL || DEFAULT_BASE_URL,
      authToken: config.authToken || '',
      timeout: config.timeout || DEFAULT_TIMEOUT,
      maxRetries: config.maxRetries || DEFAULT_MAX_RETRIES,
      debug: config.debug || false,
    }
  }

  // ==========================================================================
  // Public Methods
  // ==========================================================================

  /**
   * Enrich a single row with selected tools
   *
   * @param request - Enrichment request
   * @returns Enriched row data
   * @throws {GTMAPIError} If enrichment fails
   *
   * @example
   * ```typescript
   * const result = await client.enrichRow({
   *   data: { email: 'john@example.com', company: 'Anthropic' },
   *   tools: ['email-validate', 'company-data']
   * })
   * ```
   */
  async enrichRow(request: EnrichRowRequest): Promise<EnrichRowResponse> {
    // Validate tools
    const validation = this.validateTools(request.tools)
    if (!validation.valid) {
      throw new GTMAPIError(
        `Invalid tools: ${validation.invalidTools.join(', ')}`,
        'INVALID_TOOL',
        400,
        { invalidTools: validation.invalidTools, suggestions: validation.suggestions }
      )
    }

    const url = `${this.config.baseURL}/enrich`
    const timeout = request.config?.timeout || this.config.timeout

    try {
      this.log('Enriching single row', { tools: request.tools, dataKeys: Object.keys(request.data) })

      const response = await this.fetchWithRetry<EnrichRowResponse>(
        url,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            data: request.data,
            tools: request.tools,
          }),
        },
        timeout
      )

      this.log('Row enrichment successful', { toolsExecuted: response.metadata.toolsExecuted })

      return response
    } catch (error) {
      const apiError = this.handleError(error, 'enrichRow')
      logError(apiError, {
        source: 'GTMAPIClient/enrichRow',
        tools: request.tools,
        dataKeys: Object.keys(request.data),
      })
      throw apiError
    }
  }

  /**
   * Enrich multiple rows in batch
   *
   * @param request - Batch enrichment request
   * @returns Batch enrichment results
   * @throws {GTMAPIError} If batch enrichment fails
   *
   * @example
   * ```typescript
   * const result = await client.enrichBatch({
   *   rows: [
   *     { email: 'john@example.com' },
   *     { email: 'jane@example.com' }
   *   ],
   *   tools: ['email-validate']
   * })
   * ```
   */
  async enrichBatch(request: EnrichBatchRequest): Promise<EnrichBatchResponse> {
    // Validate tools
    const validation = this.validateTools(request.tools)
    if (!validation.valid) {
      throw new GTMAPIError(
        `Invalid tools: ${validation.invalidTools.join(', ')}`,
        'INVALID_TOOL',
        400,
        { invalidTools: validation.invalidTools, suggestions: validation.suggestions }
      )
    }

    const url = `${this.config.baseURL}/bulk`
    const timeout = (request.config?.timeout || this.config.timeout) * request.rows.length // Scale timeout by row count

    try {
      this.log('Enriching batch', {
        rows: request.rows.length,
        tools: request.tools,
      })

      const response = await this.fetchWithRetry<EnrichBatchResponse>(
        url,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            rows: request.rows,
            tools: request.tools,
          }),
        },
        timeout
      )

      this.log('Batch enrichment successful', {
        totalRows: response.totalRows,
        successfulRows: response.successfulRows,
        failedRows: response.failedRows,
      })

      return response
    } catch (error) {
      const apiError = this.handleError(error, 'enrichBatch')
      logError(apiError, {
        source: 'GTMAPIClient/enrichBatch',
        rowCount: request.rows.length,
        tools: request.tools,
      })
      throw apiError
    }
  }

  /**
   * Validate tool names against available tools
   *
   * @param tools - Tool names to validate
   * @returns Validation result with valid/invalid tools and suggestions
   */
  validateTools(tools: string[]): ToolValidation {
    const validTools: string[] = []
    const invalidTools: string[] = []
    const suggestions: Record<string, string[]> = {}

    const availableToolNames = ALL_GTM_TOOLS.map((t) => t.name)

    for (const tool of tools) {
      if (availableToolNames.includes(tool)) {
        validTools.push(tool)
      } else {
        invalidTools.push(tool)

        // Find similar tool names (simple string similarity)
        const similar = availableToolNames
          .filter((name) => {
            const similarity = this.stringSimilarity(tool, name)
            return similarity > 0.5 // At least 50% similar
          })
          .slice(0, 3) // Top 3 suggestions

        if (similar.length > 0) {
          suggestions[tool] = similar
        }
      }
    }

    return {
      valid: invalidTools.length === 0,
      validTools,
      invalidTools,
      suggestions: Object.keys(suggestions).length > 0 ? suggestions : undefined,
    }
  }

  /**
   * Update client authentication token
   *
   * @param authToken - New authentication token (JWT or API key)
   */
  setAuthToken(authToken: string): void {
    this.config.authToken = authToken
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Fetch with automatic retry and exponential backoff
   *
   * @param url - Request URL
   * @param options - Fetch options
   * @param timeout - Request timeout in ms
   * @param attempt - Current attempt number (internal)
   * @returns Parsed JSON response
   * @throws {GTMAPIError} If request fails after all retries
   */
  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit,
    timeout: number,
    attempt: number = 1
  ): Promise<T> {
    try {
      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Handle HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new GTMAPIError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          this.mapStatusToErrorCode(response.status),
          response.status,
          errorData
        )
      }

      // Parse and return response
      const data = await response.json()
      return data as T
    } catch (error) {
      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new GTMAPIError(
          `Request timed out after ${timeout}ms`,
          'TIMEOUT',
          408,
          { timeout, attempt }
        )

        // Retry on timeout
        if (attempt < this.config.maxRetries) {
          this.log(`Timeout, retrying (attempt ${attempt + 1}/${this.config.maxRetries})`)
          await this.sleep(this.calculateBackoff(attempt))
          return this.fetchWithRetry<T>(url, options, timeout, attempt + 1)
        }

        throw timeoutError
      }

      // Handle network errors
      if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('network'))) {
        const networkError = new GTMAPIError(
          `Network error: ${error.message}`,
          'NETWORK_ERROR',
          undefined,
          { attempt },
          error
        )

        // Retry on network error
        if (attempt < this.config.maxRetries) {
          this.log(`Network error, retrying (attempt ${attempt + 1}/${this.config.maxRetries})`)
          await this.sleep(this.calculateBackoff(attempt))
          return this.fetchWithRetry<T>(url, options, timeout, attempt + 1)
        }

        throw networkError
      }

      // Handle GTM API errors
      if (error instanceof GTMAPIError) {
        // Retry on 5xx server errors
        if (error.statusCode && error.statusCode >= 500 && attempt < this.config.maxRetries) {
          this.log(`Server error (${error.statusCode}), retrying (attempt ${attempt + 1}/${this.config.maxRetries})`)
          await this.sleep(this.calculateBackoff(attempt))
          return this.fetchWithRetry<T>(url, options, timeout, attempt + 1)
        }

        throw error
      }

      // Unknown error
      throw new GTMAPIError(
        error instanceof Error ? error.message : 'Unknown error',
        'UNKNOWN',
        undefined,
        { attempt },
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Get request headers with authentication
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`
    }

    return headers
  }

  /**
   * Map HTTP status code to error code
   */
  private mapStatusToErrorCode(status: number): GTMAPIErrorCode {
    if (status === 401 || status === 403) return 'AUTH_ERROR'
    if (status === 400) return 'INVALID_REQUEST'
    if (status === 429) return 'RATE_LIMIT'
    if (status === 408) return 'TIMEOUT'
    if (status >= 500) return 'SERVER_ERROR'
    return 'UNKNOWN'
  }

  /**
   * Handle errors and convert to GTMAPIError
   */
  private handleError(error: unknown, method: string): GTMAPIError {
    if (error instanceof GTMAPIError) {
      return error
    }

    if (error instanceof Error) {
      return new GTMAPIError(
        `${method} failed: ${error.message}`,
        'UNKNOWN',
        undefined,
        { method },
        error
      )
    }

    return new GTMAPIError(
      `${method} failed with unknown error`,
      'UNKNOWN',
      undefined,
      { method, error }
    )
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    return INITIAL_BACKOFF_MS * Math.pow(BACKOFF_MULTIPLIER, attempt - 1)
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Calculate string similarity (Dice coefficient)
   * Used for suggesting similar tool names
   */
  private stringSimilarity(str1: string, str2: string): number {
    const bigrams1 = this.getBigrams(str1.toLowerCase())
    const bigrams2 = this.getBigrams(str2.toLowerCase())

    const intersection = bigrams1.filter((bigram) => bigrams2.includes(bigram))

    // Avoid division by zero if both strings are empty or very short
    const totalBigrams = bigrams1.length + bigrams2.length
    if (totalBigrams === 0) {
      return str1 === str2 ? 1 : 0
    }

    return (2 * intersection.length) / totalBigrams
  }

  /**
   * Get bigrams from string (for similarity calculation)
   */
  private getBigrams(str: string): string[] {
    const bigrams: string[] = []
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.push(str.substring(i, i + 2))
    }
    return bigrams
  }

  /**
   * Debug logging (only if debug enabled)
   */
  private log(message: string, data?: Record<string, unknown>): void {
    if (this.config.debug) {
      console.log(`[GTMAPIClient] ${message}`, data || '')
    }
  }
}

// ============================================================================
// Convenience Factory Function
// ============================================================================

/**
 * Create a new GTM API client instance
 *
 * @param config - Client configuration
 * @returns GTM API client instance
 *
 * @example
 * ```typescript
 * const client = createGTMClient({ authToken: 'your-jwt-token' })
 * ```
 */
export function createGTMClient(config?: GTMClientConfig): GTMAPIClient {
  return new GTMAPIClient(config)
}

/**
 * Default GTM client instance (no auth token - must be set later)
 * Use this for client-side imports where auth token isn't available yet
 */
export const gtmAPI = new GTMAPIClient()
