/**
 * Hook for managing business context variables with Supabase sync (React Query version)
 * Falls back to localStorage if Supabase unavailable
 * Uses React Query for automatic caching, deduplication, and refetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { queryKeys } from '@/lib/query-client';

const STORAGE_KEY = 'bulk-gpt-business-context';
const MIGRATION_FLAG_KEY = 'bulk-gpt-business-context-migrated';

export interface ContextVariables {
  tone?: string;
  targetCountries?: string;
  productDescription?: string;
  competitors?: string;
  targetIndustries?: string;
  complianceFlags?: string;
}

export interface BusinessContext {
  icp?: string;
  countries?: string[];
  products?: string[];
  valueProposition?: string;
  marketingGoals?: string[];
  targetKeywords?: string[];
  competitorKeywords?: string[];
}

export interface GTMProfile {
  gtmPlaybook?: string;
  productType?: string;
}

interface BusinessContextData {
  contextVariables: ContextVariables;
  businessContext: BusinessContext;
  gtmProfile: GTMProfile;
}

export interface UseContextStorageReturn {
  context: ContextVariables;
  businessContext: BusinessContext;
  gtmProfile: GTMProfile;
  updateContext: (updates: Partial<ContextVariables>) => Promise<void>;
  updateBusinessContext: (updates: Partial<BusinessContext>) => Promise<void>;
  updateGTMProfile: (updates: Partial<GTMProfile>) => Promise<void>;
  clearContext: () => Promise<void>;
  hasContext: boolean;
  isLoading: boolean;
  isSyncing: boolean;
}

const DEFAULT_CONTEXT: ContextVariables = {};
const DEFAULT_BUSINESS_CONTEXT: BusinessContext = {};
const DEFAULT_GTM_PROFILE: GTMProfile = {};

/**
 * Fetch business context from API with localStorage fallback
 */
async function fetchBusinessContext(): Promise<BusinessContextData> {
  try {
    const response = await fetch('/api/business-context/business-context');
    if (response.ok) {
      const data = await response.json();
      const result = {
        contextVariables: data.contextVariables || DEFAULT_CONTEXT,
        businessContext: data.businessContext || DEFAULT_BUSINESS_CONTEXT,
        gtmProfile: data.gtmProfile || DEFAULT_GTM_PROFILE,
      };

      // Cache in localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(result.contextVariables));
          localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
        } catch (e) {
          console.debug('Failed to cache in localStorage:', e);
        }
      }

      return result;
    }
  } catch (error) {
    console.debug('Failed to load from Supabase, using localStorage:', error);
  }

  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ContextVariables;
        if (parsed && typeof parsed === 'object') {
          return {
            contextVariables: parsed,
            businessContext: DEFAULT_BUSINESS_CONTEXT,
            gtmProfile: DEFAULT_GTM_PROFILE,
          };
        }
      }
    } catch (error) {
      console.debug('Failed to load from localStorage:', error);
    }
  }

  return {
    contextVariables: DEFAULT_CONTEXT,
    businessContext: DEFAULT_BUSINESS_CONTEXT,
    gtmProfile: DEFAULT_GTM_PROFILE,
  };
}

/**
 * Update business context on server
 */
async function updateBusinessContextAPI(data: Partial<ContextVariables & BusinessContext & GTMProfile>): Promise<BusinessContextData> {
  const response = await fetch('/api/business-context/business-context', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error('Failed to sync with Supabase');
  }

  const result = await response.json();

  // Cache context variables in localStorage
  if (typeof window !== 'undefined' && result.contextVariables) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result.contextVariables));
    } catch (e) {
      console.debug('Failed to cache in localStorage:', e);
    }
  }

  return {
    contextVariables: result.contextVariables || DEFAULT_CONTEXT,
    businessContext: result.businessContext || DEFAULT_BUSINESS_CONTEXT,
    gtmProfile: result.gtmProfile || DEFAULT_GTM_PROFILE,
  };
}

/**
 * Manages company business context variables with Supabase sync
 * Falls back to localStorage for offline support
 * Uses React Query for caching and deduplication
 *
 * @returns Business context management functions
 */
export function useContextStorage(): UseContextStorageReturn {
  const queryClient = useQueryClient();

  // Fetch business context with React Query
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.businessContext.all,
    queryFn: fetchBusinessContext,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  const context = data?.contextVariables || DEFAULT_CONTEXT;
  const businessContext = data?.businessContext || DEFAULT_BUSINESS_CONTEXT;
  const gtmProfile = data?.gtmProfile || DEFAULT_GTM_PROFILE;

  // Background migration from localStorage to Supabase
  useEffect(() => {
    const migrateToSupabase = async () => {
      // Only migrate if not already migrated
      if (typeof window !== 'undefined' && localStorage.getItem(MIGRATION_FLAG_KEY) === 'true') {
        return;
      }

      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const localData = JSON.parse(stored) as ContextVariables;

            // Only migrate if there's actual data
            const hasData = Object.keys(localData).some(
              (key) => localData[key as keyof ContextVariables] !== undefined &&
                       localData[key as keyof ContextVariables] !== ''
            );

            if (hasData) {
              await updateBusinessContextAPI(localData);
              localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
            }
          }
        } catch (error) {
          console.debug('Background migration failed:', error);
        }
      }
    };

    migrateToSupabase();
  }, []);

  // Update mutations
  const updateMutation = useMutation({
    mutationFn: (updates: Partial<ContextVariables & BusinessContext & GTMProfile>) =>
      updateBusinessContextAPI(updates),
    onSuccess: (data) => {
      // Update the cache with new data
      queryClient.setQueryData(queryKeys.businessContext.all, data);
    },
    onError: (error, variables) => {
      console.debug('Failed to sync with Supabase, saving to localStorage:', error);
      // Fallback: save context variables to localStorage
      if (typeof window !== 'undefined' && 'tone' in variables) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(variables));
        } catch (e) {
          console.debug('Failed to save to localStorage:', e);
        }
      }
    },
  });

  const updateContext = useCallback(async (updates: Partial<ContextVariables>) => {
    const updated = {
      ...context,
      ...updates,
    };

    // Remove undefined values
    Object.keys(updated).forEach((key) => {
      if (updated[key as keyof ContextVariables] === undefined) {
        delete updated[key as keyof ContextVariables];
      }
    });

    // Optimistically update the cache
    queryClient.setQueryData(queryKeys.businessContext.all, (old: BusinessContextData | undefined) => ({
      contextVariables: updated,
      businessContext: old?.businessContext || businessContext,
      gtmProfile: old?.gtmProfile || gtmProfile,
    }));

    await updateMutation.mutateAsync({
      ...updated,
      ...businessContext,
      ...gtmProfile,
    });
  }, [context, businessContext, gtmProfile, queryClient, updateMutation]);

  const updateBusinessContext = useCallback(async (updates: Partial<BusinessContext>) => {
    const updated = {
      ...businessContext,
      ...updates,
    };

    // Remove undefined values
    Object.keys(updated).forEach((key) => {
      if (updated[key as keyof BusinessContext] === undefined) {
        delete updated[key as keyof BusinessContext];
      }
    });

    // Optimistically update the cache
    queryClient.setQueryData(queryKeys.businessContext.all, (old: BusinessContextData | undefined) => ({
      contextVariables: old?.contextVariables || context,
      businessContext: updated,
      gtmProfile: old?.gtmProfile || gtmProfile,
    }));

    await updateMutation.mutateAsync({
      ...context,
      ...updated,
      ...gtmProfile,
    });
  }, [context, businessContext, gtmProfile, queryClient, updateMutation]);

  const updateGTMProfile = useCallback(async (updates: Partial<GTMProfile>) => {
    const updated = {
      ...gtmProfile,
      ...updates,
    };

    // Remove undefined values
    Object.keys(updated).forEach((key) => {
      if (updated[key as keyof GTMProfile] === undefined) {
        delete updated[key as keyof GTMProfile];
      }
    });

    // Optimistically update the cache
    queryClient.setQueryData(queryKeys.businessContext.all, (old: BusinessContextData | undefined) => ({
      contextVariables: old?.contextVariables || context,
      businessContext: old?.businessContext || businessContext,
      gtmProfile: updated,
    }));

    await updateMutation.mutateAsync({
      ...context,
      ...businessContext,
      ...updated,
    });
  }, [context, businessContext, gtmProfile, queryClient, updateMutation]);

  const clearContext = useCallback(async () => {
    // Optimistically clear the cache
    queryClient.setQueryData(queryKeys.businessContext.all, {
      contextVariables: DEFAULT_CONTEXT,
      businessContext: DEFAULT_BUSINESS_CONTEXT,
      gtmProfile,
    });

    // Clear Supabase (context variables and business context only, GTM profile preserved)
    try {
      await updateBusinessContextAPI(gtmProfile);
    } catch (error) {
      console.debug('Failed to clear Supabase:', error);
    }

    // Clear localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(MIGRATION_FLAG_KEY);
      } catch (error) {
        console.debug('Failed to clear localStorage:', error);
      }
    }
  }, [gtmProfile, queryClient]);

  const hasContext = Object.keys(context).some(
    (key) => context[key as keyof ContextVariables] !== undefined &&
             context[key as keyof ContextVariables] !== ''
  ) || Object.keys(businessContext).some(
    (key) => {
      const value = businessContext[key as keyof BusinessContext];
      return value !== undefined &&
             (Array.isArray(value) ? value.length > 0 : value !== '');
    }
  );

  return {
    context,
    businessContext,
    gtmProfile,
    updateContext,
    updateBusinessContext,
    updateGTMProfile,
    clearContext,
    hasContext,
    isLoading,
    isSyncing: updateMutation.isPending,
  };
}
