/**
 * ABOUTME: Type definitions for GTM backend API integration
 * ABOUTME: Provides type-safe interfaces for enrichment tools, requests, and responses
 */

// ============================================================================
// Tool Categories
// ============================================================================

export type GTMToolCategory = 'enrichment' | 'generation' | 'analysis'

export type GTMToolGroup = 'core' | 'advanced'

// ============================================================================
// Tool Definition
// ============================================================================

export interface GTMTool {
  /** Unique tool identifier (used in API calls) */
  name: string

  /** Human-readable tool name for UI */
  displayName: string

  /** Brief description of what the tool does */
  description: string

  /** Tool category */
  category: GTMToolCategory

  /** Whether this is a core tool (always visible) or advanced */
  group: GTMToolGroup

  /** API endpoint path (e.g., '/enrichment/email-validate') */
  endpoint: string

  /** Example input fields this tool expects */
  exampleInputs?: string[]

  /** Typical use cases */
  useCases?: string[]
}

// ============================================================================
// Available Gemini Native Tools (2 total - Web Search and URL Context)
// ============================================================================

/**
 * Gemini native tools - built-in capabilities provided by Google Gemini API
 * These are native Gemini features, not external API integrations
 */
export const ESSENTIAL_GTM_TOOLS: GTMTool[] = [
  {
    name: 'web-search',
    displayName: 'Web Search',
    description: 'Web research with citations',
    category: 'generation',
    group: 'core',
    endpoint: '/generation/web-search',
    exampleInputs: ['query'],
    useCases: ['Market research', 'Competitive intelligence']
  },
  {
    name: 'scrape-page',
    displayName: 'Scrape Page',
    description: 'Scrape webpage content (including JavaScript-rendered pages)',
    category: 'enrichment',
    group: 'core',
    endpoint: '/enrichment/scrape-page',
    exampleInputs: ['url', 'website'],
    useCases: ['Company research', 'Competitor analysis', 'Website content extraction', 'Team member extraction']
  },
]

/**
 * More core tools - additional commonly used tools (currently empty)
 * Shown in collapsible section, starts collapsed
 */
export const MORE_CORE_GTM_TOOLS: GTMTool[] = []

/**
 * @deprecated Use ESSENTIAL_GTM_TOOLS and MORE_CORE_GTM_TOOLS instead
 * Kept for backward compatibility
 */
export const CORE_GTM_TOOLS: GTMTool[] = [
  ...ESSENTIAL_GTM_TOOLS,
  ...MORE_CORE_GTM_TOOLS,
]

/**
 * Advanced tools - specialized use cases (currently empty)
 * Hidden by default, shown in collapsible section
 */
export const ADVANCED_GTM_TOOLS: GTMTool[] = []

/**
 * All other tools - combines MORE_CORE and ADVANCED (excluding essential tools)
 * Shown in single collapsible "More Tools" section, starts collapsed
 */
export const ALL_OTHER_TOOLS: GTMTool[] = [
  ...MORE_CORE_GTM_TOOLS,
  ...ADVANCED_GTM_TOOLS,
]

/**
 * All Gemini native tools combined (2 total - Web Search and URL Context)
 */
export const ALL_GTM_TOOLS: GTMTool[] = [...ESSENTIAL_GTM_TOOLS, ...ALL_OTHER_TOOLS]

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request to enrich a single row with selected tools
 */
export interface EnrichRowRequest {
  /** Row data to enrich */
  data: Record<string, unknown>

  /** Tool names to apply */
  tools: string[]

  /** Optional configuration */
  config?: {
    /** Timeout in milliseconds (default: 30000) */
    timeout?: number

    /** Whether to continue on tool failures (default: true) */
    continueOnError?: boolean
  }
}

/**
 * Response from enriching a single row
 */
export interface EnrichRowResponse {
  /** Whether enrichment succeeded */
  success: boolean

  /** Original input data */
  input: Record<string, unknown>

  /** Enriched data (merged with input) */
  data: Record<string, unknown>

  /** Tool-specific results */
  toolResults: Record<string, ToolResult>

  /** Enrichment metadata */
  metadata: {
    /** Tools that were executed */
    toolsExecuted: string[]

    /** Tools that failed */
    toolsFailed?: string[]

    /** Total execution time in ms */
    executionTime: number

    /** Timestamp */
    timestamp: string
  }
}

/**
 * Request to enrich multiple rows (batch)
 */
export interface EnrichBatchRequest {
  /** Array of rows to enrich */
  rows: Record<string, unknown>[]

  /** Tool names to apply to all rows */
  tools: string[]

  /** Optional configuration */
  config?: {
    /** Max concurrent requests (default: 5) */
    concurrency?: number

    /** Timeout per row in ms (default: 30000) */
    timeout?: number

    /** Whether to continue on tool failures (default: true) */
    continueOnError?: boolean
  }
}

/**
 * Response from batch enrichment
 */
export interface EnrichBatchResponse {
  /** Whether batch enrichment succeeded */
  success: boolean

  /** Batch ID for tracking */
  batchId: string

  /** Total rows processed */
  totalRows: number

  /** Successfully enriched rows */
  successfulRows: number

  /** Failed rows */
  failedRows: number

  /** Enriched results (one per row) */
  results: EnrichRowResponse[]

  /** Batch metadata */
  metadata: {
    /** Total execution time in ms */
    executionTime: number

    /** Timestamp */
    timestamp: string

    /** Tools applied */
    tools: string[]
  }
}

/**
 * Result from a single tool execution
 */
export interface ToolResult {
  /** Whether tool succeeded */
  success: boolean

  /** Tool-specific data */
  data?: Record<string, unknown> | string | number | boolean

  /** Error if tool failed */
  error?: string

  /** Tool execution metadata */
  metadata?: {
    /** Source of data */
    source?: string

    /** Execution time in ms */
    executionTime?: number

    /** Confidence score (0-1) */
    confidence?: number
  }
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * GTM API error codes
 */
export type GTMAPIErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'AUTH_ERROR'
  | 'INVALID_TOOL'
  | 'INVALID_REQUEST'
  | 'RATE_LIMIT'
  | 'SERVER_ERROR'
  | 'UNKNOWN'

/**
 * Enhanced error class for GTM API errors
 */
export class GTMAPIError extends Error {
  /** Error code */
  code: GTMAPIErrorCode

  /** HTTP status code (if applicable) */
  statusCode?: number

  /** Additional error details */
  details?: Record<string, unknown>

  /** Original error */
  originalError?: Error

  constructor(
    message: string,
    code: GTMAPIErrorCode = 'UNKNOWN',
    statusCode?: number,
    details?: Record<string, unknown>,
    originalError?: Error
  ) {
    super(message)
    this.name = 'GTMAPIError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.originalError = originalError

    // Maintain proper stack trace (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GTMAPIError)
    }
  }
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * GTM API client configuration
 */
export interface GTMClientConfig {
  /** Base URL for GTM API (default: production URL) */
  baseURL?: string

  /** Authentication token (Supabase JWT or anon key) */
  authToken?: string

  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number

  /** Max retry attempts (default: 3) */
  maxRetries?: number

  /** Whether to log requests (default: false) */
  debug?: boolean
}

/**
 * Tool validation result
 */
export interface ToolValidation {
  /** Whether all tools are valid */
  valid: boolean

  /** Valid tool names */
  validTools: string[]

  /** Invalid tool names */
  invalidTools: string[]

  /** Suggestions for invalid tools */
  suggestions?: Record<string, string[]>
}
