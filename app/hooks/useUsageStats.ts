import useSWR, { preload } from 'swr'

export interface UsageStats {
  batchesToday: number
  rowsToday: number
  batchesThisMonth: number
  rowsThisMonth: number
  totalBatches: number
  totalRows: number
  dailyBatchLimit: number
  dailyRowLimit: number
  planType: string
  // Token usage
  totalInputTokens: number
  totalOutputTokens: number
  inputTokensToday: number
  outputTokensToday: number
  inputTokensThisMonth: number
  outputTokensThisMonth: number
  // Model breakdown
  tokensByModel: { model: string; inputTokens: number; outputTokens: number; count: number }[]
  // Tool usage
  toolUsage: { tool: string; callCount: number }[]
}

const USAGE_CACHE_KEY = 'usage-stats'

const fetcher = async (): Promise<UsageStats> => {
  const response = await fetch('/api/usage')
  if (!response.ok) {
    // Return default stats instead of throwing to prevent page crash
    console.warn('Failed to load usage stats, using defaults')
    return {
      batchesToday: 0,
      rowsToday: 0,
      batchesThisMonth: 0,
      rowsThisMonth: 0,
      totalBatches: 0,
      totalRows: 0,
      dailyBatchLimit: 999999,
      dailyRowLimit: 999999999,
      planType: 'beta',
      totalInputTokens: 0,
      totalOutputTokens: 0,
      inputTokensToday: 0,
      outputTokensToday: 0,
      inputTokensThisMonth: 0,
      outputTokensThisMonth: 0,
      tokensByModel: [],
      toolUsage: [],
    }
  }
  return await response.json()
}

// Prefetch usage stats - call this early (e.g., on login or app load)
export function prefetchUsageStats() {
  preload(USAGE_CACHE_KEY, fetcher)
}

export function useUsageStats() {
  const { data: usage, isLoading, error, mutate } = useSWR<UsageStats>(
    USAGE_CACHE_KEY,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false, // Don't refetch if we have data
      revalidateOnMount: true, // Fetch on mount
      dedupingInterval: 120000, // 2 minutes - longer cache
      keepPreviousData: true, // Keep showing old data while fetching
      fallbackData: undefined, // Will show loading state initially
      // Add timeout to prevent hanging
      onErrorRetry: (_error, _key, _config, revalidate, { retryCount }) => {
        if (retryCount >= 2) return
        setTimeout(() => revalidate({ retryCount }), 1000)
      },
    }
  )

  return {
    usage,
    isLoading: isLoading && !usage, // Only show loading if no cached data
    error,
    refreshUsage: mutate,
  }
}

