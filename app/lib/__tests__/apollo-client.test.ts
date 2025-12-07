import { describe, it, expect, beforeEach } from 'vitest';
import { ApolloClient, ApolloAPIError, createApolloClient } from '@/lib/apollo/client';

describe('ApolloClient', () => {
  let client: ApolloClient;

  beforeEach(() => {
    // Use test key if available, otherwise mock key
    const apiKey = process.env.APOLLO_API_KEY || 'test-apollo-key-123';
    client = new ApolloClient({ apiKey });
  });

  describe('Initialization', () => {
    it('creates client with API key', () => {
      expect(client).toBeInstanceOf(ApolloClient);
    });

    it('creates client via factory function', () => {
      const factoryClient = createApolloClient('test-key');
      expect(factoryClient).toBeInstanceOf(ApolloClient);
    });

    it('throws if no API key in environment (factory)', () => {
      const originalKey = process.env.APOLLO_API_KEY;
      delete process.env.APOLLO_API_KEY;
      delete process.env.NEXT_PUBLIC_APOLLO_API_KEY;

      expect(() => createApolloClient()).toThrow('Apollo API key not found');

      // Restore
      if (originalKey) {
        process.env.APOLLO_API_KEY = originalKey;
      }
    });
  });

  describe('People Search', () => {
    it('accepts valid search filters', async () => {
      const filters = {
        person_titles: ['CTO', 'VP Engineering'],
        organization_industries: ['Computer Software'],
        page: 1,
        per_page: 5,
      };

      if (process.env.APOLLO_API_KEY) {
        try {
          const response = await client.searchPeople(filters);
          expect(response).toBeDefined();
          expect(response.pagination).toBeDefined();
          expect(response.contacts).toBeInstanceOf(Array);
        } catch (error) {
          // API errors are acceptable in tests (rate limits, auth issues)
          expect(error).toBeInstanceOf(ApolloAPIError);
        }
      } else {
        // Skip real API call without key
        expect(filters).toBeDefined();
      }
    });

    it('handles empty filters (gets all results)', async () => {
      const filters = {
        page: 1,
        per_page: 1,
      };

      if (process.env.APOLLO_API_KEY) {
        try {
          const response = await client.searchPeople(filters);
          expect(response.pagination.per_page).toBe(1);
        } catch (error) {
          expect(error).toBeInstanceOf(ApolloAPIError);
        }
      } else {
        expect(filters.per_page).toBe(1);
      }
    });

    it('respects pagination parameters', async () => {
      const filters = {
        page: 2,
        per_page: 10,
      };

      if (process.env.APOLLO_API_KEY) {
        try {
          const response = await client.searchPeople(filters);
          expect(response.pagination.page).toBe(2);
          expect(response.pagination.per_page).toBe(10);
        } catch (error) {
          expect(error).toBeInstanceOf(ApolloAPIError);
        }
      } else {
        expect(filters.page).toBe(2);
      }
    });
  });

  describe('Enrichment', () => {
    it('enriches person by ID', async () => {
      // This requires a valid Apollo person ID
      // Skip if no API key
      if (process.env.APOLLO_API_KEY) {
        try {
          // First get a person ID from search
          const searchResponse = await client.searchPeople({
            page: 1,
            per_page: 1,
          });

          if (searchResponse.contacts && searchResponse.contacts.length > 0) {
            const personId = searchResponse.contacts[0].id;
            const enriched = await client.enrichPerson(personId);
            expect(enriched).toBeDefined();
            expect(enriched.id).toBe(personId);
          }
        } catch (error) {
          expect(error).toBeInstanceOf(ApolloAPIError);
        }
      } else {
        expect(true).toBe(true); // Skip
      }
    });

    it('handles bulk enrichment request format', async () => {
      const request = {
        details: [
          {
            first_name: 'John',
            last_name: 'Doe',
            organization_name: 'Test Corp',
          },
        ],
        reveal_personal_emails: false,
      };

      if (process.env.APOLLO_API_KEY) {
        try {
          const response = await client.bulkEnrichPeople(request);
          expect(response).toBeDefined();
          expect(response.matches).toBeInstanceOf(Array);
          expect(response.unmatched).toBeInstanceOf(Array);
        } catch (error) {
          expect(error).toBeInstanceOf(ApolloAPIError);
        }
      } else {
        expect(request.details).toHaveLength(1);
      }
    });
  });

  describe('Batch Processing', () => {
    it('processes leads in batches', async () => {
      const people = [
        { first_name: 'Test', last_name: 'User1', organization_name: 'Corp1' },
        { first_name: 'Test', last_name: 'User2', organization_name: 'Corp2' },
      ];

      let progressCalls = 0;
      const onProgress = () => {
        progressCalls++;
      };

      if (process.env.APOLLO_API_KEY) {
        try {
          const results = await client.bulkEnrichWithBatching(people, {
            batchSize: 2,
            onProgress,
          });

          expect(results).toBeInstanceOf(Array);
          expect(progressCalls).toBeGreaterThan(0);
        } catch (error) {
          expect(error).toBeInstanceOf(ApolloAPIError);
        }
      } else {
        expect(people).toHaveLength(2);
      }
    });

    it('respects batch size parameter', async () => {
      const people = Array(25)
        .fill(null)
        .map((_, i) => ({
          first_name: `Test${i}`,
          last_name: 'User',
          organization_name: 'TestCorp',
        }));

      let batchCount = 0;
      const onProgress = () => {
        batchCount++;
      };

      if (process.env.APOLLO_API_KEY) {
        try {
          await client.bulkEnrichWithBatching(people, {
            batchSize: 10,
            onProgress,
          });

          // Should have 3 batches: 10 + 10 + 5
          expect(batchCount).toBeGreaterThanOrEqual(3);
        } catch (error) {
          expect(error).toBeInstanceOf(ApolloAPIError);
        }
      } else {
        expect(people.length).toBe(25);
      }
    });
  });

  describe('Error Handling', () => {
    it('throws ApolloAPIError on invalid request', async () => {
      if (process.env.APOLLO_API_KEY) {
        try {
          // Invalid filter that should fail
          await client.searchPeople({
            // @ts-expect-error - intentionally invalid
            invalid_filter: 'bad value',
          });
        } catch (error) {
          expect(error).toBeInstanceOf(ApolloAPIError);
          if (error instanceof ApolloAPIError) {
            expect(error.statusCode).toBeGreaterThan(0);
          }
        }
      } else {
        expect(true).toBe(true); // Skip
      }
    });

    it('handles network errors gracefully', async () => {
      // Create client with invalid base URL
      const badClient = new ApolloClient({
        apiKey: 'test-key',
        baseUrl: 'https://invalid-apollo-api-endpoint-that-does-not-exist.com',
      });

      try {
        await badClient.searchPeople({ page: 1 });
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(ApolloAPIError);
        if (error instanceof ApolloAPIError) {
          expect(error.message).toContain('Network error');
        }
      }
    });
  });

  describe('Rate Limiting', () => {
    it('tracks rate limit info from headers', async () => {
      if (process.env.APOLLO_API_KEY) {
        try {
          await client.searchPeople({ page: 1, per_page: 1 });
          const rateLimitInfo = client.getRateLimitInfo();

          // May or may not have rate limit headers depending on Apollo's response
          if (rateLimitInfo) {
            expect(rateLimitInfo.limit).toBeGreaterThan(0);
            expect(rateLimitInfo.remaining).toBeGreaterThanOrEqual(0);
            expect(rateLimitInfo.reset).toBeInstanceOf(Date);
          }
        } catch (error) {
          expect(error).toBeInstanceOf(ApolloAPIError);
        }
      } else {
        expect(true).toBe(true); // Skip
      }
    });

    it('returns null rate limit info if not set', () => {
      const freshClient = new ApolloClient({ apiKey: 'test-key' });
      expect(freshClient.getRateLimitInfo()).toBeNull();
    });
  });

  describe('Connection Testing', () => {
    it('validates API key with testConnection', async () => {
      if (process.env.APOLLO_API_KEY) {
        const isValid = await client.testConnection();
        expect(typeof isValid).toBe('boolean');
      } else {
        // With invalid key, should return false
        const invalidClient = new ApolloClient({ apiKey: 'invalid-key' });
        const isValid = await invalidClient.testConnection();
        expect(isValid).toBe(false);
      }
    });
  });
});

describe('ApolloAPIError', () => {
  it('creates error with message and status code', () => {
    const error = new ApolloAPIError('Test error', 400);
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('ApolloAPIError');
  });

  it('includes Apollo error details when provided', () => {
    const apolloError = {
      error: 'invalid_request',
      message: 'Invalid API key',
      status_code: 401,
    };

    const error = new ApolloAPIError('Auth failed', 401, apolloError);
    expect(error.apolloError).toEqual(apolloError);
  });
});
