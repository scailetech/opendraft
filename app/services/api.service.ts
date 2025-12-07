/**
 * API Service Layer
 * 
 * Centralizes all API calls with:
 * - Type safety
 * - Error handling
 * - Request/response transformation
 * - Retry logic
 * - Timeout handling
 * 
 * SOLID Principles:
 * - Single Responsibility: Only API communication
 * - Dependency Inversion: Uses interfaces, not implementations
 */

// ===== INTERFACES =====

export interface BatchRequest {
  csvFilename: string
  rows: Record<string, string>[]
  prompt: string
  context?: string
  outputColumns: string[]
  webhookUrl?: string
}

export interface BatchResponse {
  batchId: string
  status: string
  message?: string
}

export interface APIError {
  error: string
  code?: string
  details?: unknown
}

export interface APIClientConfig {
  baseURL?: string
  timeout?: number
  maxRetries?: number
}

// ===== API CLIENT =====

export class APIClient {
  private baseURL: string
  private timeout: number
  private maxRetries: number

  constructor(config: APIClientConfig = {}) {
    this.baseURL = config.baseURL || ''
    this.timeout = config.timeout || 150000 // 150s default (V2 Modal cold start can take 60-90s)
    this.maxRetries = config.maxRetries || 3
  }

  /**
   * Make a fetch request with timeout and error handling
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs = this.timeout
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return response
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`)
      }
      throw err
    }
  }

  /**
   * POST request with automatic retry on failure
   */
  async post<T>(endpoint: string, data: unknown, retries = 0): Promise<T> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseURL}${endpoint}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      )

      if (!response.ok) {
        const errorData: APIError = await response.json()
        throw new APIError(
          errorData.error || `HTTP ${response.status}`,
          response.status,
          errorData
        )
      }

      return await response.json()
    } catch (err) {
      // Retry on network errors (not on API errors)
      if (retries < this.maxRetries && !(err instanceof APIError)) {
        await this.delay(Math.pow(2, retries) * 1000) // Exponential backoff
        return this.post<T>(endpoint, data, retries + 1)
      }
      throw err
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    const response = await this.fetchWithTimeout(`${this.baseURL}${endpoint}`)

    if (!response.ok) {
      const errorData: APIError = await response.json()
      throw new APIError(
        errorData.error || `HTTP ${response.status}`,
        response.status,
        errorData
      )
    }

    return await response.json()
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// ===== CUSTOM ERROR =====

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message)
    this.name = 'APIError'
  }
}

// ===== BATCH SERVICE =====

export class BatchService {
  constructor(private apiClient: APIClient) {}

  /**
   * Create a new batch processing job
   */
  async createBatch(request: BatchRequest): Promise<BatchResponse> {
    return this.apiClient.post<BatchResponse>('/api/process', request)
  }

  /**
   * Get batch status
   */
  async getBatchStatus(batchId: string): Promise<{ status: string }> {
    return this.apiClient.get<{ status: string }>(`/api/batch/${batchId}`)
  }
}

// ===== TOKEN SERVICE =====

export class TokenService {
  constructor(private apiClient: APIClient) {}

  /**
   * Fetch API token
   */
  async fetchToken(): Promise<{ token: string }> {
    return this.apiClient.get<{ token: string }>('/api/tokens')
  }
}

// ===== SINGLETON INSTANCES =====

const apiClient = new APIClient()

export const batchService = new BatchService(apiClient)
export const tokenService = new TokenService(apiClient)

// Export for custom configurations
export { apiClient }
