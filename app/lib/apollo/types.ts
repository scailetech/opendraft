// ABOUTME: TypeScript type definitions for Apollo.io API
// ABOUTME: Comprehensive types for People Search, Enrichment, and lead data

/**
 * Apollo API Configuration
 */
export interface ApolloConfig {
  apiKey: string;
  baseUrl?: string;
}

/**
 * Person filters for Apollo People Search
 * Based on Apollo.io API documentation
 */
export interface PersonSearchFilters {
  // Person attributes
  person_titles?: string[];
  person_seniorities?: Array<'entry' | 'senior' | 'manager' | 'director' | 'vp' | 'c_suite' | 'owner' | 'partner'>;
  person_locations?: string[];
  q_keywords?: string; // Search keywords across all fields

  // Organization attributes
  organization_ids?: string[];
  organization_num_employees_ranges?: string[]; // e.g., "1,10", "11,50", "51,200"
  organization_locations?: string[];
  organization_industries?: string[];
  organization_keywords?: string[];
  organization_latest_funding_stage_cd?: Array<
    'seed' | 'series_a' | 'series_b' | 'series_c' | 'series_d' | 'series_e' | 'private_equity' | 'ipo' | 'acquired'
  >;

  // Contact info filters
  contact_email_status?: Array<'verified' | 'guessed' | 'unavailable'>;

  // Pagination
  page?: number;
  per_page?: number; // Max 100
}

/**
 * Apollo Person object (enriched lead data)
 */
export interface ApolloPerson {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  linkedin_url: string | null;
  title: string;
  email: string | null;
  email_status: 'verified' | 'guessed' | 'unavailable' | null;
  photo_url: string | null;
  twitter_url: string | null;
  github_url: string | null;
  facebook_url: string | null;

  // Organization data
  organization: ApolloOrganization | null;

  // Contact info
  phone_numbers: ApolloPhoneNumber[];

  // Employment
  employment_history: ApolloEmployment[];

  // Metadata
  state: string;
  city: string;
  country: string;
}

/**
 * Apollo Organization object
 */
export interface ApolloOrganization {
  id: string;
  name: string;
  website_url: string | null;
  blog_url: string | null;
  angellist_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  facebook_url: string | null;

  // Firmographics
  primary_phone: ApolloPhoneNumber | null;
  languages: string[];
  alexa_ranking: number | null;
  phone: string | null;
  linkedin_uid: string | null;

  // Company details
  founded_year: number | null;
  publicly_traded_symbol: string | null;
  publicly_traded_exchange: string | null;
  logo_url: string | null;

  // Size & funding
  estimated_num_employees: number | null;
  num_suborganizations: number | null;
  total_funding: number | null;
  total_funding_printed: string | null;
  latest_funding_round_date: string | null;
  latest_funding_stage: string | null;

  // Industry
  industry: string;
  keywords: string[];
  industry_tag_id: string;
  retail_location_count: number | null;
  raw_address: string | null;

  // Location
  city: string | null;
  state: string | null;
  country: string | null;

  // Tech stack
  technologies: string[];
  seo_description: string | null;
  short_description: string | null;
}

/**
 * Phone number with type
 */
export interface ApolloPhoneNumber {
  raw_number: string;
  sanitized_number: string;
  type: 'work' | 'mobile' | 'home' | 'other';
  position: number;
  status: 'valid' | 'invalid' | 'unknown';
}

/**
 * Employment history entry
 */
export interface ApolloEmployment {
  id: string;
  created_at: string;
  current: boolean;
  degree: string | null;
  description: string | null;
  emails: string[] | null;
  end_date: string | null;
  grade_level: string | null;
  kind: string | null;
  major: string | null;
  organization_id: string | null;
  organization_name: string;
  raw_address: string | null;
  start_date: string | null;
  title: string;
  updated_at: string;
  key: string;
}

/**
 * Apollo API Response wrapper
 */
export interface ApolloResponse<T> {
  breadcrumbs: Array<{
    label: string;
    signal_field_name: string;
    value: string;
    display_name: string;
  }>;
  partial_results_only: boolean;
  disable_eu_prospecting: boolean;
  partial_results_limit: number;
  pagination: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
  contacts?: T[]; // For people search
  people?: T[]; // For enrichment
  organization?: ApolloOrganization; // For org enrichment
}

/**
 * People Search response
 */
export type PeopleSearchResponse = ApolloResponse<ApolloPerson>;

/**
 * Bulk enrichment request
 */
export interface BulkEnrichmentRequest {
  details: Array<{
    first_name?: string;
    last_name?: string;
    organization_name?: string;
    domain?: string;
    id?: string; // Apollo person ID
  }>;
  reveal_personal_emails?: boolean;
  reveal_phone_number?: boolean;
}

/**
 * Bulk enrichment response
 */
export interface BulkEnrichmentResponse {
  matches: ApolloPerson[];
  unmatched: Array<{
    first_name?: string;
    last_name?: string;
    organization_name?: string;
    domain?: string;
  }>;
}

/**
 * API Error response
 */
export interface ApolloError {
  error: string;
  message: string;
  status_code: number;
}

/**
 * Rate limit info
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
}
