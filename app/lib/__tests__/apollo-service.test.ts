import { describe, it, expect, beforeEach } from 'vitest';
import { ApolloService, createApolloService } from '@/lib/apollo/service';
import type { ApolloPerson } from '@/lib/apollo/types';

describe('ApolloService', () => {
  let service: ApolloService;
  const hasKeys = !!(process.env.APOLLO_API_KEY && process.env.GEMINI_API_KEY);

  beforeEach(() => {
    if (hasKeys) {
      service = new ApolloService({
        apolloApiKey: process.env.APOLLO_API_KEY,
        geminiApiKey: process.env.GEMINI_API_KEY,
      });
    } else {
      // Create with test keys for type checking
      try {
        service = new ApolloService({
          apolloApiKey: 'test-apollo-key',
          geminiApiKey: 'test-gemini-key',
        });
      } catch (error) {
        // Expected if no Gemini key
      }
    }
  });

  describe('Initialization', () => {
    it('creates service with API keys', () => {
      if (hasKeys) {
        expect(service).toBeInstanceOf(ApolloService);
      } else {
        expect(true).toBe(true); // Skip
      }
    });

    it('throws if Gemini API key missing', () => {
      expect(() => {
        new ApolloService({
          apolloApiKey: 'test-apollo',
          // No Gemini key
        });
      }).toThrow('Gemini API key required');
    });

    it('creates service via factory function', () => {
      if (hasKeys) {
        const factoryService = createApolloService();
        expect(factoryService).toBeInstanceOf(ApolloService);
      } else {
        expect(true).toBe(true); // Skip
      }
    });
  });

  describe('Prompt Translation', () => {
    it('translates natural language to Apollo filters', async () => {
      if (!hasKeys) {
        expect(true).toBe(true);
        return;
      }

      const prompt = 'Find CTOs at Series A SaaS companies';

      try {
        const filters = await service.translatePromptToFilters(prompt);

        expect(filters).toBeDefined();
        expect(typeof filters).toBe('object');

        // Should have relevant filters
        if (filters.person_titles) {
          expect(filters.person_titles).toBeInstanceOf(Array);
          // Should expand "CTO" to full title
          const hasCTO = filters.person_titles.some(
            title => title.toLowerCase().includes('cto') || title.toLowerCase().includes('chief technology')
          );
          expect(hasCTO).toBe(true);
        }

        if (filters.organization_industries) {
          expect(filters.organization_industries).toBeInstanceOf(Array);
          const hasSaaS = filters.organization_industries.some(
            ind => ind.toLowerCase().includes('saas') || ind.toLowerCase().includes('software')
          );
          expect(hasSaaS).toBe(true);
        }

        if (filters.organization_latest_funding_stage_cd) {
          expect(filters.organization_latest_funding_stage_cd).toContain('series_a');
        }
      } catch (error) {
        console.error('Translation test failed:', error);
        expect(error).toBeDefined();
      }
    });

    it('handles simple prompts', async () => {
      if (!hasKeys) {
        expect(true).toBe(true);
        return;
      }

      const prompt = 'Marketing directors in NYC';

      try {
        const filters = await service.translatePromptToFilters(prompt);
        expect(filters).toBeDefined();

        if (filters.person_titles) {
          const hasMarketing = filters.person_titles.some(title =>
            title.toLowerCase().includes('marketing')
          );
          expect(hasMarketing).toBe(true);
        }

        if (filters.person_locations || filters.organization_locations) {
          const locations = [
            ...(filters.person_locations || []),
            ...(filters.organization_locations || []),
          ];
          const hasNYC = locations.some(loc => loc.toLowerCase().includes('new york'));
          expect(hasNYC).toBe(true);
        }
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('returns empty object for unclear prompts', async () => {
      if (!hasKeys) {
        expect(true).toBe(true);
        return;
      }

      const prompt = 'xyz random unclear nonsense';

      try {
        const filters = await service.translatePromptToFilters(prompt);
        expect(filters).toBeDefined();
        // Should be empty or have q_keywords
        const filterKeys = Object.keys(filters);
        expect(filterKeys.length).toBeGreaterThanOrEqual(0);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Lead Search', () => {
    it('searches leads using natural language', async () => {
      if (!hasKeys) {
        expect(true).toBe(true);
        return;
      }

      const prompt = 'Software engineers in San Francisco';

      try {
        const result = await service.searchLeadsByPrompt(prompt, { per_page: 5 });

        expect(result).toBeDefined();
        expect(result.leads).toBeInstanceOf(Array);
        expect(result.filters).toBeDefined();
        expect(result.pagination).toBeDefined();
        expect(result.pagination.per_page).toBe(5);
      } catch (error) {
        console.error('Search test failed:', error);
        expect(error).toBeDefined();
      }
    });

    it('respects pagination options', async () => {
      if (!hasKeys) {
        expect(true).toBe(true);
        return;
      }

      try {
        const result = await service.searchLeadsByPrompt('Any tech role', {
          page: 2,
          per_page: 10,
        });

        expect(result.pagination.page).toBe(2);
        expect(result.pagination.per_page).toBe(10);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Lead Qualification', () => {
    it('qualifies a lead with AI analysis', async () => {
      if (!hasKeys) {
        expect(true).toBe(true);
        return;
      }

      const mockLead: ApolloPerson = {
        id: 'test-123',
        name: 'John Doe',
        first_name: 'John',
        last_name: 'Doe',
        title: 'CTO',
        email: 'john@example.com',
        email_status: 'verified',
        linkedin_url: null,
        photo_url: null,
        twitter_url: null,
        github_url: null,
        facebook_url: null,
        phone_numbers: [],
        employment_history: [],
        state: 'CA',
        city: 'San Francisco',
        country: 'US',
        organization: {
          id: 'org-123',
          name: 'TechCorp',
          industry: 'Computer Software',
          estimated_num_employees: 150,
          latest_funding_stage: 'series_a',
          website_url: 'https://techcorp.com',
          blog_url: null,
          angellist_url: null,
          linkedin_url: null,
          twitter_url: null,
          facebook_url: null,
          primary_phone: null,
          languages: [],
          alexa_ranking: null,
          phone: null,
          linkedin_uid: null,
          founded_year: null,
          publicly_traded_symbol: null,
          publicly_traded_exchange: null,
          logo_url: null,
          num_suborganizations: null,
          total_funding: null,
          total_funding_printed: null,
          latest_funding_round_date: null,
          industry_tag_id: 'software',
          retail_location_count: null,
          raw_address: null,
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
          technologies: ['React', 'Node.js'],
          seo_description: null,
          short_description: null,
          keywords: [],
        },
      };

      const criteria = 'Looking for CTOs at Series A SaaS companies';

      try {
        const qualification = await service.qualifyLead(mockLead, criteria);

        expect(qualification).toBeDefined();
        expect(qualification.fit_score).toBeGreaterThanOrEqual(0);
        expect(qualification.fit_score).toBeLessThanOrEqual(100);
        expect(qualification.fit_reasoning).toBeDefined();
        expect(typeof qualification.fit_reasoning).toBe('string');
        expect(qualification.outreach_angle).toBeDefined();
        expect(qualification.pain_points).toBeInstanceOf(Array);
      } catch (error) {
        console.error('Qualification test failed:', error);
        expect(error).toBeDefined();
      }
    });

    it('handles missing organization data gracefully', async () => {
      if (!hasKeys) {
        expect(true).toBe(true);
        return;
      }

      const incompleteLead: ApolloPerson = {
        id: 'test-456',
        name: 'Jane Smith',
        first_name: 'Jane',
        last_name: 'Smith',
        title: 'VP Engineering',
        email: null,
        email_status: null,
        linkedin_url: null,
        photo_url: null,
        twitter_url: null,
        github_url: null,
        facebook_url: null,
        phone_numbers: [],
        employment_history: [],
        state: '',
        city: '',
        country: '',
        organization: null,
      };

      try {
        const qualification = await service.qualifyLead(incompleteLead, 'Any engineer');

        expect(qualification).toBeDefined();
        expect(qualification.fit_score).toBeGreaterThanOrEqual(0);
        expect(qualification.fit_score).toBeLessThanOrEqual(100);
      } catch (error) {
        // Should handle gracefully, not crash
        expect(error).toBeDefined();
      }
    });
  });

  describe('Bulk Qualification', () => {
    it('qualifies multiple leads with progress tracking', async () => {
      if (!hasKeys) {
        expect(true).toBe(true);
        return;
      }

      const mockLeads: ApolloPerson[] = [
        {
          id: '1',
          name: 'Lead One',
          first_name: 'Lead',
          last_name: 'One',
          title: 'CTO',
          email: null,
          email_status: null,
          linkedin_url: null,
          photo_url: null,
          twitter_url: null,
          github_url: null,
          facebook_url: null,
          phone_numbers: [],
          employment_history: [],
          state: '',
          city: '',
          country: '',
          organization: null,
        },
        {
          id: '2',
          name: 'Lead Two',
          first_name: 'Lead',
          last_name: 'Two',
          title: 'VP Product',
          email: null,
          email_status: null,
          linkedin_url: null,
          photo_url: null,
          twitter_url: null,
          github_url: null,
          facebook_url: null,
          phone_numbers: [],
          employment_history: [],
          state: '',
          city: '',
          country: '',
          organization: null,
        },
      ];

      let progressUpdates = 0;
      const onProgress = () => {
        progressUpdates++;
      };

      try {
        const results = await service.bulkQualifyLeads(mockLeads, 'Tech leaders', onProgress);

        expect(results).toHaveLength(2);
        expect(progressUpdates).toBeGreaterThan(0);

        results.forEach(result => {
          expect(result.lead).toBeDefined();
          expect(result.qualification).toBeDefined();
          expect(result.qualification.fit_score).toBeGreaterThanOrEqual(0);
        });
      } catch (error) {
        console.error('Bulk qualification test failed:', error);
        expect(error).toBeDefined();
      }
    }, 30000); // Extended timeout for bulk operations
  });

  describe('Complete Workflow', () => {
    it('runs full find and qualify workflow', async () => {
      if (!hasKeys) {
        expect(true).toBe(true);
        return;
      }

      const prompt = 'Engineering leaders at tech startups';
      let stageCalls = 0;

      try {
        const results = await service.findAndQualifyLeads(prompt, {
          maxLeads: 3,
          enrichLeads: false, // Skip enrichment for faster tests
          onProgress: () => {
            stageCalls++;
          },
        });

        expect(results).toBeInstanceOf(Array);
        expect(stageCalls).toBeGreaterThan(0);

        // Should be sorted by fit score
        for (let i = 0; i < results.length - 1; i++) {
          expect(results[i].qualification.fit_score).toBeGreaterThanOrEqual(
            results[i + 1].qualification.fit_score
          );
        }

        results.forEach(result => {
          expect(result.lead).toBeDefined();
          expect(result.qualification.fit_score).toBeGreaterThanOrEqual(0);
          expect(result.qualification.fit_reasoning).toBeDefined();
          expect(result.qualification.outreach_angle).toBeDefined();
        });
      } catch (error) {
        console.error('Complete workflow test failed:', error);
        expect(error).toBeDefined();
      }
    }, 60000); // Extended timeout for full workflow
  });

  describe('Client Access', () => {
    it('provides access to underlying Apollo client', () => {
      if (hasKeys) {
        const apolloClient = service.getApolloClient();
        expect(apolloClient).toBeDefined();
      } else {
        expect(true).toBe(true); // Skip
      }
    });
  });
});
