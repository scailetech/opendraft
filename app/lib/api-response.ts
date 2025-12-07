/**
 * API Response utilities for consistent error handling
 * Provides structured error responses with error IDs for tracking
 */

import { NextResponse } from 'next/server'
import { BulkGPTError, getUserFriendlyMessage, logError } from './errors'

/**
 * Generate a unique error ID for tracking
 * Format: ERR_{timestamp}_{random}
 */
export function generateErrorId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 9)
  return `ERR_${timestamp}_${random}`
}

/**
 * Standard API error response structure
 */
export interface APIErrorResponse {
  error: string
  errorId: string
  statusCode: number
  timestamp: string
  retry?: boolean
  retryAfter?: number
}

/**
 * Standard API success response structure
 */
export interface APISuccessResponse<T = unknown> {
  data: T
  timestamp: string
}

/**
 * Create a standardized error response with tracking ID
 * @param error - The error to respond with
 * @param statusCode - HTTP status code (default: 500)
 * @param additionalContext - Additional context to log internally
 */
export function createErrorResponse(
  error: unknown,
  statusCode: number = 500,
  additionalContext?: Record<string, unknown>
): NextResponse<APIErrorResponse> {
  const errorId = generateErrorId()
  const timestamp = new Date().toISOString()

  // Log the full error with context internally
  if (error instanceof Error) {
    logError(error, {
      errorId,
      statusCode,
      timestamp,
      ...additionalContext,
    })
  } else if (error instanceof BulkGPTError) {
    logError(error, {
      errorId,
      statusCode,
      timestamp,
      ...additionalContext,
    })
  }

  // Determine user-friendly message
  let userMessage = 'An error occurred'
  if (error instanceof BulkGPTError) {
    userMessage = getUserFriendlyMessage(error)
  } else if (error instanceof Error) {
    userMessage = error.message
  } else if (typeof error === 'string') {
    userMessage = error
  }

  // Determine if operation is retryable
  const retryable = statusCode >= 500 || statusCode === 429 || statusCode === 408

  // Return structured error response
  const response: APIErrorResponse = {
    error: userMessage,
    errorId,
    statusCode,
    timestamp,
    ...(retryable && {
      retry: true,
      retryAfter: statusCode === 429 ? 60 : 10, // Rate limit: 60s, others: 10s
    }),
  }

  return NextResponse.json(response, { status: statusCode })
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  statusCode: number = 200
): NextResponse<APISuccessResponse<T>> {
  const response: APISuccessResponse<T> = {
    data,
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(response, { status: statusCode })
}

/**
 * Handle authorization errors
 */
export function createUnauthorizedResponse(): NextResponse<APIErrorResponse> {
  return createErrorResponse(
    new BulkGPTError('INVALID_API_KEY', 'Unauthorized: Invalid or missing authentication'),
    401
  )
}

/**
 * Handle not found errors
 */
export function createNotFoundResponse(resource: string): NextResponse<APIErrorResponse> {
  return createErrorResponse(
    new Error(`${resource} not found`),
    404
  )
}

/**
 * Handle validation errors
 */
export function createValidationErrorResponse(
  message: string,
  details?: Record<string, unknown>
): NextResponse<APIErrorResponse> {
  return createErrorResponse(
    new BulkGPTError('VALIDATION_ERROR', message, details),
    400
  )
}

/**
 * Handle rate limit errors
 */
export function createRateLimitResponse(
  retryAfter: number = 60
): NextResponse<APIErrorResponse> {
  const errorId = generateErrorId()
  const timestamp = new Date().toISOString()

  const response: APIErrorResponse = {
    error: 'Too many requests. Please try again later.',
    errorId,
    statusCode: 429,
    timestamp,
    retry: true,
    retryAfter,
  }

  return NextResponse.json(response, {
    status: 429,
    headers: {
      'Retry-After': retryAfter.toString(),
    },
  })
}
