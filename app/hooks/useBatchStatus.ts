/**
 * Hook for polling batch status
 * Provides real-time updates for batch processing
 */

import { useState, useEffect, useRef } from 'react'

export interface BatchStatus {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'completed_with_errors' | 'failed'
  total_rows: number
  processed_rows: number
  created_at: string
  updated_at: string
}

interface UseBatchStatusOptions {
  batchId: string | null
  enabled?: boolean
  pollInterval?: number // milliseconds
  onStatusChange?: (status: BatchStatus) => void
}

export function useBatchStatus({
  batchId,
  enabled = true,
  pollInterval = 3000, // 3 seconds default
  onStatusChange,
}: UseBatchStatusOptions) {
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const onStatusChangeRef = useRef(onStatusChange)

  // Keep callback ref up to date
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange
  }, [onStatusChange])

  const fetchBatchStatus = async () => {
    if (!batchId) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/batch/${batchId}/status`)
      if (!response.ok) {
        throw new Error('Failed to fetch batch status')
      }

      const data = await response.json()
      const status: BatchStatus = {
        id: data.batchId || batchId,
        status: data.status,
        total_rows: data.totalRows || 0,
        processed_rows: data.processedRows || 0,
        created_at: data.createdAt,
        updated_at: data.updatedAt,
      }

      setBatchStatus(status)

      // Call callback if status changed
      if (onStatusChangeRef.current) {
        onStatusChangeRef.current(status)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      console.error('Error fetching batch status:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!batchId || !enabled) {
      setBatchStatus(null)
      return
    }

    // Fetch immediately
    fetchBatchStatus()

    // Set up polling
    intervalRef.current = setInterval(() => {
      fetchBatchStatus()
    }, pollInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [batchId, enabled, pollInterval])

  // Stop polling when batch is complete
  useEffect(() => {
    if (
      batchStatus &&
      (batchStatus.status === 'completed' ||
        batchStatus.status === 'completed_with_errors' ||
        batchStatus.status === 'failed')
    ) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [batchStatus?.status])

  return {
    batchStatus,
    isLoading,
    error,
    refetch: fetchBatchStatus,
  }
}

