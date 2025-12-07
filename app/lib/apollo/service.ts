// ABOUTME: Apollo service layer orchestrating AI-powered lead finding
// ABOUTME: Combines Apollo API with Gemini for prompt translation and lead qualification

import { ApolloClient, createApolloClient } from './client';
import { PersonSearchFilters, ApolloPerson } from './types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logError } from '@/lib/errors';
import { devLog } from '@/lib/dev-logger';

/**
 * AI-Powered Apollo Service
 *
 * Features:
 * - Natural language → Apollo filters (Gemini translation)
 * - Apollo search & enrichment
 * - AI lead qualification with scores and insights
 */
export class ApolloService {
  private apolloClient: ApolloClient;
  private gemini: GoogleGenerativeAI;

  constructor(config: { apolloApiKey?: string; geminiApiKey?: string }) {
    this.apolloClient = createApolloClient(config.apolloApiKey);

    const geminiKey =
      config.geminiApiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!geminiKey) {
      throw new Error('Gemini API key required for AI-powered lead finding');
    }
    this.gemini = new GoogleGenerativeAI(geminiKey);
  }

  /**
   * Translate natural language prompt to Apollo search filters
   *
   * Uses Gemini to intelligently convert user intent into structured filters
   *
   * @example
   * Input: "Find CTOs at Series A SaaS companies in San Francisco"
   * Output: {
   *   person_titles: ["CTO", "Chief Technology Officer"],
   *   organization_industries: ["Computer Software", "SaaS"],
   *   organization_locations: ["San Francisco, CA"],
   *   organization_latest_funding_stage_cd: ["series_a"]
   * }
   */
  async translatePromptToFilters(prompt: string): Promise<PersonSearchFilters> {
    const model = this.gemini.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature: 0.2, // Low temperature for consistent, accurate translations
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });

    const systemPrompt = `You are an expert at translating business search criteria into Apollo.io API filters.

Your task: Convert natural language prompts into valid Apollo API filters (JSON format).

Available filters:
- person_titles: array of job titles (e.g., ["CTO", "VP Engineering"])
- person_seniorities: ["entry", "senior", "manager", "director", "vp", "c_suite", "owner", "partner"]
- person_locations: array of locations (e.g., ["San Francisco, CA", "New York, NY"])
- organization_num_employees_ranges: ["1,10", "11,50", "51,200", "201,500", "501,1000", "1001,5000", "5001,10000", "10001+"]
- organization_locations: array of company locations
- organization_industries: array of industries (e.g., ["Computer Software", "SaaS", "Financial Services"])
- organization_latest_funding_stage_cd: ["seed", "series_a", "series_b", "series_c", "series_d", "series_e", "private_equity", "ipo", "acquired"]
- q_keywords: search keywords across all fields

Rules:
1. Return ONLY valid JSON (no markdown, no explanation)
2. Use exact filter names from the list above
3. Expand abbreviations (e.g., "CTO" → ["CTO", "Chief Technology Officer"])
4. Infer related titles (e.g., "engineering leaders" → ["VP Engineering", "Director of Engineering", "Head of Engineering"])
5. Map common phrases to proper values (e.g., "Series A" → ["series_a"])
6. If uncertain, use q_keywords for broad search
7. Return empty object {} if prompt is unclear

Examples:

Prompt: "CTOs at Series A SaaS companies"
Output: {
  "person_titles": ["CTO", "Chief Technology Officer"],
  "organization_industries": ["Computer Software", "SaaS"],
  "organization_latest_funding_stage_cd": ["series_a"]
}

Prompt: "Marketing directors at mid-size fintech companies in NYC"
Output: {
  "person_titles": ["Marketing Director", "Director of Marketing", "VP Marketing"],
  "person_seniorities": ["director", "vp"],
  "organization_num_employees_ranges": ["201,500", "501,1000"],
  "organization_industries": ["Financial Services", "FinTech"],
  "organization_locations": ["New York, NY"]
}

Now translate this prompt:
${prompt}`;

    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text();

    // Parse JSON response (remove markdown code blocks if present)
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/```\n([\s\S]*?)\n```/);
    const jsonText = jsonMatch ? jsonMatch[1] : responseText;

    try {
      const filters = JSON.parse(jsonText.trim()) as PersonSearchFilters;
      return filters;
    } catch (error) {
      throw new Error(`Failed to parse AI-generated filters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search for leads using natural language prompt
   *
   * Combines AI translation with Apollo search
   */
  async searchLeadsByPrompt(
    prompt: string,
    options: {
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<{
    leads: ApolloPerson[];
    filters: PersonSearchFilters;
    pagination: {
      page: number;
      per_page: number;
      total_entries: number;
      total_pages: number;
    };
  }> {
    // Step 1: Translate prompt to filters using AI
    const filters = await this.translatePromptToFilters(prompt);

    // Step 2: Search Apollo with translated filters
    const response = await this.apolloClient.searchPeople({
      ...filters,
      page: options.page || 1,
      per_page: options.per_page || 25,
    });

    return {
      leads: response.contacts || [],
      filters,
      pagination: response.pagination,
    };
  }

  /**
   * Qualify a lead using AI analysis
   *
   * Analyzes lead fit and generates personalized insights
   *
   * @param lead - Apollo person data
   * @param criteria - User's ideal customer criteria
   * @returns Fit score (0-100), reasoning, outreach angle, pain points
   */
  async qualifyLead(
    lead: ApolloPerson,
    criteria: string
  ): Promise<{
    fit_score: number;
    fit_reasoning: string;
    outreach_angle: string;
    pain_points: string[];
  }> {
    const model = this.gemini.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature: 0.4, // Balanced for creative insights + consistency
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1024,
      },
    });

    const systemPrompt = `You are a B2B sales expert analyzing lead qualification.

User's ideal customer criteria:
${criteria}

Lead to analyze:
Name: ${lead.name}
Title: ${lead.title}
Company: ${lead.organization?.name || 'Unknown'}
Industry: ${lead.organization?.industry || 'Unknown'}
Company Size: ${lead.organization?.estimated_num_employees || 'Unknown'} employees
Funding Stage: ${lead.organization?.latest_funding_stage || 'Unknown'}
Location: ${lead.city || 'Unknown'}, ${lead.country || 'Unknown'}

Task: Analyze this lead and return a JSON object with:
{
  "fit_score": <number 0-100>,
  "fit_reasoning": "<why this lead matches or doesn't match criteria>",
  "outreach_angle": "<personalized hook for first outreach message>",
  "pain_points": ["<likely pain point 1>", "<likely pain point 2>", "<likely pain point 3>"]
}

Rules:
1. fit_score: 0-100 (0=terrible fit, 100=perfect fit)
2. fit_reasoning: 1-2 sentences explaining the score
3. outreach_angle: Specific, personalized hook based on their role/company
4. pain_points: 2-3 likely challenges they face (be specific to their industry/role)
5. Return ONLY valid JSON (no markdown)

Be honest about fit - not every lead is a good match!`;

    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text();

    // Parse JSON response
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/```\n([\s\S]*?)\n```/);
    const jsonText = jsonMatch ? jsonMatch[1] : responseText;

    try {
      const qualification = JSON.parse(jsonText.trim());
      return {
        fit_score: qualification.fit_score,
        fit_reasoning: qualification.fit_reasoning,
        outreach_angle: qualification.outreach_angle,
        pain_points: qualification.pain_points || [],
      };
    } catch (error) {
      // Fallback if AI response is malformed
      return {
        fit_score: 50,
        fit_reasoning: 'Could not analyze lead automatically',
        outreach_angle: 'Reach out to discuss potential fit',
        pain_points: [],
      };
    }
  }

  /**
   * Bulk qualify leads with progress tracking
   */
  async bulkQualifyLeads(
    leads: ApolloPerson[],
    criteria: string,
    onProgress?: (progress: { processed: number; total: number }) => void
  ): Promise<
    Array<{
      lead: ApolloPerson;
      qualification: {
        fit_score: number;
        fit_reasoning: string;
        outreach_angle: string;
        pain_points: string[];
      };
    }>
  > {
    const results = [];

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];

      try {
        const qualification = await this.qualifyLead(lead, criteria);
        results.push({ lead, qualification });

        if (onProgress) {
          onProgress({ processed: i + 1, total: leads.length });
        }

        // Rate limiting: small delay between API calls
        if (i < leads.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        logError(error instanceof Error ? error : new Error('Lead qualification failed'), {
          source: 'apollo/service/bulkQualifyLeads',
          leadName: lead.name,
          leadId: lead.id
        });
        // Add with default qualification
        results.push({
          lead,
          qualification: {
            fit_score: 0,
            fit_reasoning: 'Qualification failed',
            outreach_angle: 'Follow up manually',
            pain_points: [],
          },
        });
      }
    }

    return results;
  }

  /**
   * Complete lead finding workflow
   *
   * 1. Translate prompt → Apollo filters
   * 2. Search Apollo for matching leads
   * 3. Bulk enrich leads (emails, phones)
   * 4. AI qualify each lead
   * 5. Return ranked, qualified leads
   */
  async findAndQualifyLeads(
    prompt: string,
    options: {
      maxLeads?: number;
      enrichLeads?: boolean;
      onProgress?: (stage: string, progress: { current: number; total: number }) => void;
    } = {}
  ): Promise<
    Array<{
      lead: ApolloPerson;
      qualification: {
        fit_score: number;
        fit_reasoning: string;
        outreach_angle: string;
        pain_points: string[];
      };
    }>
  > {
    const { maxLeads = 50, enrichLeads = true, onProgress } = options;

    // Step 1: Search
    onProgress?.('Searching for leads...', { current: 0, total: 4 });
    const { leads } = await this.searchLeadsByPrompt(prompt, {
      per_page: Math.min(maxLeads, 100),
    });

    if (leads.length === 0) {
      return [];
    }

    // Step 2: Enrich (optional)
    let enrichedLeads = leads;
    if (enrichLeads) {
      onProgress?.('Enriching lead data...', { current: 1, total: 4 });
      try {
        enrichedLeads = await this.apolloClient.bulkEnrichWithBatching(
          leads.map(l => ({ id: l.id })),
          {
            reveal_personal_emails: true,
            reveal_phone_number: true,
          }
        );
      } catch (error) {
        devLog.warn('Enrichment failed, using basic data:', error);
      }
    }

    // Step 3: Qualify with AI
    onProgress?.('Qualifying leads with AI...', { current: 2, total: 4 });
    const qualified = await this.bulkQualifyLeads(enrichedLeads.slice(0, maxLeads), prompt);

    // Step 4: Rank by fit score
    onProgress?.('Ranking results...', { current: 3, total: 4 });
    qualified.sort((a, b) => b.qualification.fit_score - a.qualification.fit_score);

    onProgress?.('Complete!', { current: 4, total: 4 });
    return qualified;
  }

  /**
   * Get Apollo client for direct access
   */
  getApolloClient(): ApolloClient {
    return this.apolloClient;
  }
}

/**
 * Create Apollo service with environment variables
 */
export function createApolloService(config?: { apolloApiKey?: string; geminiApiKey?: string }): ApolloService {
  return new ApolloService(config || {});
}
