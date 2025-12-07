import useSWR from 'swr'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export interface HomeStats {
  totalBatches: number
  completedBatches: number
  totalRowsProcessed: number
  successRate: number
  averageProcessingTime: number // seconds
  totalTokens: number
  rowsPerSecond: number
  resourceCounts?: {
    leads: number
    keywords: number
    content: number
    campaigns: number
  }
  recentBatches: Array<{
    id: string
    csv_filename: string
    status: string
    created_at: string
    total_rows: number
    processed_rows: number
    agent_id?: string | null
    agent_name?: string | null
    agent_icon?: string | null
  }>
}

const fetcher = async (): Promise<HomeStats> => {
  const supabase = createClient()
  if (!supabase) {
    throw new Error('Supabase client not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Fetch stats from API route (includes recent batches now)
  const statsResponse = await fetch('/api/dashboard/stats')
  if (!statsResponse.ok) {
    throw new Error('Failed to fetch dashboard stats')
  }
  const statsData = await statsResponse.json()

  return {
    totalBatches: statsData.totalBatches || 0,
    completedBatches: statsData.completedBatches || 0,
    totalRowsProcessed: statsData.totalRowsProcessed || 0,
    successRate: statsData.successRate || 0,
    averageProcessingTime: statsData.averageProcessingTime || 0,
    totalTokens: statsData.totalTokens || 0,
    rowsPerSecond: statsData.rowsPerSecond || 0,
    resourceCounts: statsData.resourceCounts,
    recentBatches: statsData.recentBatches || [],
  }
}

export function useHomeStats() {
  const router = useRouter()
  const [errorCount, setErrorCount] = useState(0)
  const pollingIntervalRef = useRef(10000) // Start at 10s

  const { data: stats, isLoading, error, mutate } = useSWR<HomeStats>(
    'home-stats',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      dedupingInterval: 30000, // 30 seconds (increased from 10s)
      keepPreviousData: true,
      errorRetryCount: 3, // Retry 3 times before giving up
      errorRetryInterval: 2000, // 2s between retries
      onError: () => {
        setErrorCount(prev => prev + 1)
        // Only redirect after 3 failed attempts
        if (errorCount >= 2) {
          router.push('/auth')
        }
      },
      onSuccess: () => {
        setErrorCount(0) // Reset error count on success
      },
    }
  )

  // Poll with exponential backoff when batches are processing
  useEffect(() => {
    if (!stats) return

    const hasProcessingBatches = stats.recentBatches.some(
      (batch) => batch.status === 'processing' || batch.status === 'pending'
    )

    if (!hasProcessingBatches) {
      pollingIntervalRef.current = 10000 // Reset to 10s when no processing
      return
    }

    const poll = () => {
      mutate()
      // Exponential backoff: 10s → 20s → 30s (max)
      pollingIntervalRef.current = Math.min(pollingIntervalRef.current * 1.5, 30000)
    }

    const interval = setInterval(poll, pollingIntervalRef.current)

    return () => clearInterval(interval)
  }, [stats, mutate])

  return {
    stats,
    isLoading,
    error,
    refreshStats: mutate,
  }
}

