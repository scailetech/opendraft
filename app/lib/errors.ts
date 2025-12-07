/**
 * Custom error handling for bulk.run application
 * Follows best practices for error management and logging
 */

export type ErrorCode =
  | 'INVALID_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'EMPTY_FILE'
  | 'EMPTY_CSV'
  | 'NO_COLUMNS'
  | 'EMPTY_COLUMN_NAMES'
  | 'FORBIDDEN_COLUMN_NAMES'
  | 'DUPLICATE_COLUMN_NAMES'
  | 'TOO_MANY_COLUMNS'
  | 'TOO_MANY_ROWS'
  | 'CSV_PARSE_ERROR'
  | 'CSV_READ_ERROR'
  | 'INVALID_API_KEY'
  | 'INVALID_INPUT'
  | 'INVALID_PROMPT'
  | 'INVALID_ROWS'
  | 'NOT_INITIALIZED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'RETRY_FAILED'
  | 'ALREADY_PROCESSING'
  | 'CIRCUIT_BREAKER_OPEN'
  | 'EMPTY_RESPONSE'
  | 'GEMINI_ERROR'
  | 'STREAM_ERROR'
  | 'API_ERROR'
  | 'TIMEOUT_ERROR'
  | 'TIMEOUT' // Alias for TIMEOUT_ERROR
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'TEST_ERROR'
  | 'UNKNOWN_ERROR'

export interface ErrorContext {
  [key: string]: unknown
}

/**
 * Custom error class for bulk.run operations
 * Extends native Error with additional context
 */
export class BulkGPTError extends Error {
  public readonly code: ErrorCode
  public readonly details?: ErrorContext
  public readonly timestamp: Date

  constructor(code: ErrorCode, message: string, details?: ErrorContext) {
    super(message)
    this.name = 'BulkGPTError'
    this.code = code
    this.details = details
    this.timestamp = new Date()

    // Maintain proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BulkGPTError)
    }
  }

  /**
   * Convert error to JSON-serializable format
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    }
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return this.message
  }
}

/**
 * Log error with context for debugging
 * Integrates with Sentry for production error tracking
 */
export function logError(
  error: Error | BulkGPTError,
  context?: ErrorContext
): void {
  const errorInfo = {
    message: error.message,
    name: error.name,
    code: error instanceof BulkGPTError ? error.code : 'UNKNOWN_ERROR',
    details: error instanceof BulkGPTError ? error.details : undefined,
    context,
    timestamp: new Date().toISOString(),
    stack: error.stack,
  }

  // Always log to console (helps with debugging in all environments)
  console.error('[BULK_GPT_ERROR]', errorInfo)

  // Send to Sentry for production error tracking
  // Dynamic import to avoid bundling Sentry when not configured
  import('@sentry/nextjs')
    .then((Sentry) => {
      Sentry.captureException(error, {
        tags: {
          error_code: error instanceof BulkGPTError ? error.code : 'UNKNOWN_ERROR',
        },
        extra: {
          ...errorInfo,
          context,
        },
        contexts: {
          error: {
            code: error instanceof BulkGPTError ? error.code : 'UNKNOWN_ERROR',
            details: error instanceof BulkGPTError ? error.details : undefined,
          },
        },
      })
    })
    .catch(() => {
      // Silently fail if Sentry is not available (e.g., not configured or in tests)
    })
}

/**
 * Check if error is a BulkGPTError
 */
export function isBulkGPTError(error: unknown): error is BulkGPTError {
  return error instanceof BulkGPTError
}

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return 'An unknown error occurred'
}

/**
 * Create error from API response
 */
export function createAPIError(
  response: Response,
  details?: ErrorContext
): BulkGPTError {
  return new BulkGPTError(
    'API_ERROR',
    `API request failed with status ${response.status}: ${response.statusText}`,
    {
      status: response.status,
      statusText: response.statusText,
      ...details,
    }
  )
}

/**
 * Get user-friendly error message based on error code
 * Translates technical errors into human-readable messages
 */
export function getUserFriendlyMessage(error: Error | BulkGPTError): string {
  if (!(error instanceof BulkGPTError)) {
    return error.message || 'An unexpected error occurred'
  }

  // Map error codes to user-friendly messages
  const friendlyMessages: Record<string, string> = {
    INVALID_FILE_TYPE: 'Please upload a CSV file',
    FILE_TOO_LARGE: 'File is too large. Maximum size is 50MB',
    EMPTY_CSV: 'CSV file is empty. Please upload a file with data',
    NO_COLUMNS: 'CSV file has no columns',
    TOO_MANY_COLUMNS: 'CSV has too many columns. Maximum is 50',
    TOO_MANY_ROWS: 'CSV has too many rows. Maximum is 10,000',
    CSV_PARSE_ERROR: 'Could not read CSV file. Please check the format',
    CSV_READ_ERROR: 'Could not read CSV file',
    INVALID_API_KEY: 'Invalid API key. Please check your configuration',
    INVALID_INPUT: 'Invalid input provided',
    INVALID_PROMPT: 'Prompt is required and cannot be empty',
    INVALID_ROWS: 'Rows data is invalid or empty',
    NOT_INITIALIZED: 'Service not initialized. Please refresh the page',
    RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment and try again',
    RETRY_FAILED: 'Operation failed after multiple attempts. Please try again',
    ALREADY_PROCESSING: 'Another operation is in progress. Please wait',
    CIRCUIT_BREAKER_OPEN: 'Service temporarily unavailable due to repeated failures. Please try again later',
    EMPTY_RESPONSE: 'API returned an empty response. Please try again',
    GEMINI_ERROR: 'Error communicating with Gemini API',
    STREAM_ERROR: 'Error in streaming response',
    API_ERROR: 'Service temporarily unavailable. Please try again',
    TIMEOUT_ERROR: 'Request is taking longer than expected. Please try again',
    TIMEOUT: 'Request is taking longer than expected. Please try again', // Alias for TIMEOUT_ERROR
    NETWORK_ERROR: 'Network connection issue. Please check your internet',
    VALIDATION_ERROR: 'Please check your input and try again',
    TEST_ERROR: 'Test error for debugging',
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again',
  }

  return friendlyMessages[error.code] || error.message
}

