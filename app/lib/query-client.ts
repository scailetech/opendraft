/**
 * React Query (TanStack Query) configuration
 * Provides request deduplication, caching, and automatic refetching
 */

import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: How long until data is considered stale
      staleTime: 1000 * 60 * 5, // 5 minutes

      // Cache time: How long to keep unused data in cache
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)

      // Retry failed requests
      retry: 1,

      // Refetch on window focus (useful for keeping data fresh)
      refetchOnWindowFocus: false,

      // Refetch on mount
      refetchOnMount: true,

      // Don't refetch on reconnect automatically
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
})

/**
 * Query keys factory for consistent key management
 */
export const queryKeys = {
  // Browser info queries
  browserInfo: ['browser-info'] as const,

  // Business context queries
  businessContext: {
    all: ['business-context'] as const,
    detail: (userId: string) => ['business-context', userId] as const,
  },

  // Add more query keys as needed
}
