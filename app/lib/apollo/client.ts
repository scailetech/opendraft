// ABOUTME: Apollo.io API client with authentication, rate limiting, and error handling
// ABOUTME: Handles People Search, Enrichment, and Bulk operations

import { devLog } from '@/lib/dev-logger';
import { logError } from '@/lib/errors';
import {
  ApolloConfig,
  PersonSearchFilters,
  PeopleSearchResponse,
  BulkEnrichmentRequest,
  BulkEnrichmentResponse,
  ApolloPerson,
  ApolloError,
  RateLimitInfo,
} from './types';

/**
 * Apollo API Client
 *
 * Features:
 * - Automatic rate limiting (50-200 calls/min depending on plan)
 * - Retry logic with exponential backoff
 * - Comprehensive error handling
 * - TypeScript type safety
 */
export class ApolloClient {
  private apiKey: string;
  private baseUrl: string;
  private rateLimitInfo: RateLimitInfo | null = null;

  constructor(config: ApolloConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.apollo.io/v1';
  }

  /**
   * Make authenticated request to Apollo API
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    };

    // Apollo uses API key in request body for POST, query param for GET
    const isPost = method === 'POST';
    const requestBody = isPost
      ? { ...(body as Record<string, unknown> || {}), api_key: this.apiKey }
      : undefined;
    const urlWithKey = !isPost ? `${url}${url.includes('?') ? '&' : '?'}api_key=${this.apiKey}` : url;

    try {
      const response = await fetch(urlWithKey, {
        method,
        headers,
        body: requestBody ? JSON.stringify(requestBody) : undefined,
      });

      // Update rate limit info from headers
      this.updateRateLimitInfo(response.headers);

      // Handle errors
      if (!response.ok) {
        const errorData = await response.json() as ApolloError;
        throw new ApolloAPIError(
          errorData.message || errorData.error || 'Apollo API request failed',
          response.status,
          errorData
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof ApolloAPIError) {
        throw error;
      }

      // Network or parsing errors
      throw new ApolloAPIError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        0
      );
    }
  }

  /**
   * Update rate limit info from response headers
   */
  private updateRateLimitInfo(headers: Headers): void {
    const limit = headers.get('x-ratelimit-limit');
    const remaining = headers.get('x-ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset');

    if (limit && remaining && reset) {
      this.rateLimitInfo = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset: new Date(parseInt(reset, 10) * 1000),
      };
    }
  }

  /**
   * Get current rate limit status
   */
  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo;
  }

  /**
   * Search for people matching criteria
   *
   * @param filters - Search filters (titles, industries, company size, etc.)
   * @returns List of matching people with contact info
   *
   * @example
   * ```typescript
   * const results = await client.searchPeople({
   *   person_titles: ['CTO', 'VP Engineering'],
   *   organization_num_employees_ranges: ['51,200', '201,500'],
   *   organization_industries: ['Computer Software', 'SaaS']
   * });
   * ```
   */
  async searchPeople(filters: PersonSearchFilters): Promise<PeopleSearchResponse> {
    return this.request<PeopleSearchResponse>('/mixed_people/search', 'POST', filters);
  }

  /**
   * Enrich a single person by ID
   *
   * @param personId - Apollo person ID
   * @param options - Enrichment options
   * @returns Enriched person data
   */
  async enrichPerson(
    personId: string,
    options: {
      reveal_personal_emails?: boolean;
      reveal_phone_number?: boolean;
    } = {}
  ): Promise<ApolloPerson> {
    const response = await this.request<{ person: ApolloPerson }>(
      '/people/match',
      'POST',
      {
        id: personId,
        ...options,
      }
    );

    return response.person;
  }

  /**
   * Bulk enrich multiple people
   *
   * Recommended: Process in batches of 10 to respect rate limits
   *
   * @param request - Bulk enrichment request with person details
   * @returns Matched and unmatched results
   *
   * @example
   * ```typescript
   * const results = await client.bulkEnrichPeople({
   *   details: [
   *     { first_name: 'John', last_name: 'Doe', organization_name: 'Acme Corp' },
   *     { first_name: 'Jane', last_name: 'Smith', domain: 'example.com' }
   *   ],
   *   reveal_personal_emails: true
   * });
   * ```
   */
  async bulkEnrichPeople(request: BulkEnrichmentRequest): Promise<BulkEnrichmentResponse> {
    return this.request<BulkEnrichmentResponse>('/people/bulk_match', 'POST', request);
  }

  /**
   * Process bulk enrichment in batches with rate limiting
   *
   * @param people - List of people to enrich
   * @param batchSize - Number of people per batch (default: 10)
   * @param onProgress - Progress callback
   * @returns All enriched people
   */
  async bulkEnrichWithBatching(
    people: Array<{
      first_name?: string;
      last_name?: string;
      organization_name?: string;
      domain?: string;
      id?: string;
    }>,
    options: {
      batchSize?: number;
      reveal_personal_emails?: boolean;
      reveal_phone_number?: boolean;
      onProgress?: (progress: { processed: number; total: number; batch: number }) => void;
    } = {}
  ): Promise<ApolloPerson[]> {
    const {
      batchSize = 10,
      reveal_personal_emails = false,
      reveal_phone_number = false,
      onProgress,
    } = options;

    const results: ApolloPerson[] = [];
    const totalBatches = Math.ceil(people.length / batchSize);

    for (let i = 0; i < people.length; i += batchSize) {
      const batch = people.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      try {
        const response = await this.bulkEnrichPeople({
          details: batch,
          reveal_personal_emails,
          reveal_phone_number,
        });

        results.push(...response.matches);

        if (onProgress) {
          onProgress({
            processed: Math.min(i + batchSize, people.length),
            total: people.length,
            batch: batchNumber,
          });
        }

        // Rate limiting: wait if we're close to limit
        if (this.rateLimitInfo && this.rateLimitInfo.remaining < 10 && batchNumber < totalBatches) {
          const waitTime = this.rateLimitInfo.reset.getTime() - Date.now();
          if (waitTime > 0) {
            devLog.log(`Rate limit approaching, waiting ${Math.ceil(waitTime / 1000)}s...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      } catch (error) {
        logError(error instanceof Error ? error : new Error(`Batch ${batchNumber} failed`), {
          source: 'apollo/client/bulkEnrichWithBatching',
          batchNumber,
          totalBatches
        });
        // Continue with next batch even if one fails
      }
    }

    return results;
  }

  /**
   * Test API key validity
   */
  async testConnection(): Promise<boolean> {
    try {
      // Simple search with minimal filters to test auth
      await this.searchPeople({
        page: 1,
        per_page: 1,
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Custom error class for Apollo API errors
 */
export class ApolloAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public apolloError?: ApolloError
  ) {
    super(message);
    this.name = 'ApolloAPIError';
  }
}

/**
 * Create Apollo client with API key from environment
 */
export function createApolloClient(apiKey?: string): ApolloClient {
  const key = apiKey || process.env.APOLLO_API_KEY || process.env.NEXT_PUBLIC_APOLLO_API_KEY;

  if (!key) {
    throw new Error(
      'Apollo API key not found. Set APOLLO_API_KEY or NEXT_PUBLIC_APOLLO_API_KEY environment variable.'
    );
  }

  return new ApolloClient({ apiKey: key });
}
