/**
 * Batch Processor Hook with Supabase Realtime
 * 
 * Architecture: Submit batch → Supabase Realtime pushes updates → show results instantly.
 * Uses WebSocket connection for instant updates (no polling).
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { createClient } from '@/lib/supabase/client'
import type { ParsedCSV } from '@/lib/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface BatchResult {
  id: string
  input: Record<string, string>
  output: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string
  retryCount?: number
  input_tokens?: number
  output_tokens?: number
  model?: string
  tools_used?: string[]
}

export interface BatchProgress {
  completed: number
  total: number
  totalResults?: number
  percentage: number
}

export interface StartBatchParams {
  csvData: ParsedCSV
  prompt: string
  context?: string
  outputColumns: (string | { name: string; description?: string })[]
  tools?: string[]
  webhookUrl?: string
  testMode?: boolean
  selectedInputColumns?: string[]
}

export interface QueueInfo {
  position: number
  estimatedWaitSeconds: number
  estimatedWaitMinutes: number
  totalPending: number
  processingCount: number
  totalInQueue: number
}

export interface UseBatchProcessorReturn {
  batchId: string | null
  isProcessing: boolean
  isQueued: boolean
  queueInfo: QueueInfo | null
  results: BatchResult[]
  progress: BatchProgress | null
  error: string | null
  startBatch: (params: StartBatchParams) => Promise<void>
  cancelBatch: () => Promise<boolean>
  clearResults: () => void
  elapsedSeconds: number
}

const BATCH_ID_STORAGE_KEY = 'bulk-gpt-current-batch-id'
const BATCH_START_TIME_KEY = 'bulk-gpt-batch-start-time'
const BATCH_TOTAL_ROWS_KEY = 'bulk-gpt-batch-total-rows'
const MAX_PROCESSING_TIME_MS = 30 * 60 * 1000 // 30 minutes max
const POLL_INTERVAL_MS = 3000 // Fallback poll every 3 seconds

function normalizeStatus(status: string): 'completed' | 'failed' | 'pending' {
  if (status === 'completed' || status === 'success') return 'completed'
  if (status === 'failed' || status === 'error') return 'failed'
  return 'pending'
}

export function useBatchProcessor(): UseBatchProcessorReturn {
  const [batchId, setBatchId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isQueued, setIsQueued] = useState(false)
  const [queueInfo, setQueueInfo] = useState<QueueInfo | null>(null)
  const [results, setResults] = useState<BatchResult[]>([])
  const [progress, setProgress] = useState<BatchProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  const batchTotalRef = useRef<number>(0)
  const batchIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<number>(0)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Keep ref in sync
  useEffect(() => {
    batchIdRef.current = batchId
  }, [batchId])

  // Restore batch state on mount (when navigating back to page)
  useEffect(() => {
    const restoreBatch = async () => {
      try {
        console.log('[Restore] Checking for saved batch...')
        const savedBatchId = sessionStorage.getItem(BATCH_ID_STORAGE_KEY)
        console.log('[Restore] Saved batch ID:', savedBatchId)
        if (!savedBatchId) {
          console.log('[Restore] No saved batch found')
          return
        }

        console.log('[Restore] Found saved batch:', savedBatchId)
        
        // Fetch current status
        const statusRes = await fetch(`/api/batch/${savedBatchId}/status?limit=10000`)
        if (!statusRes.ok) {
          sessionStorage.removeItem(BATCH_ID_STORAGE_KEY)
          sessionStorage.removeItem(BATCH_START_TIME_KEY)
          sessionStorage.removeItem(BATCH_TOTAL_ROWS_KEY)
          return
        }

        const statusData = await statusRes.json()
        const { status, processedRows, totalRows } = statusData

        // If already completed or failed, don't restore
        if (status === 'completed' || status === 'completed_with_errors' || status === 'failed') {
          console.log('[Restore] Batch already finished:', status)
          sessionStorage.removeItem(BATCH_ID_STORAGE_KEY)
          sessionStorage.removeItem(BATCH_START_TIME_KEY)
          sessionStorage.removeItem(BATCH_TOTAL_ROWS_KEY)
          return
        }

        // Restore state including start time
        const savedStartTime = sessionStorage.getItem(BATCH_START_TIME_KEY)
        const savedTotalRows = sessionStorage.getItem(BATCH_TOTAL_ROWS_KEY)
        
        console.log('[Restore] Restoring batch progress:', processedRows, '/', totalRows)
        setBatchId(savedBatchId)
        batchIdRef.current = savedBatchId
        batchTotalRef.current = savedTotalRows ? parseInt(savedTotalRows, 10) : (totalRows || 0)
        setIsProcessing(true)
        startTimeRef.current = savedStartTime ? parseInt(savedStartTime, 10) : (Date.now() - 60000)

        setProgress({
          completed: processedRows || 0,
          total: totalRows || 0,
          percentage: totalRows > 0 ? Math.round((processedRows / totalRows) * 100) : 0,
        })

        // Start polling to continue tracking
        const pollForCompletion = async () => {
          if (!batchIdRef.current) return
          
          try {
            const res = await fetch(`/api/batch/${batchIdRef.current}/status?limit=10000`)
            if (!res.ok) return

            const data = await res.json()
            
            setProgress({
              completed: data.processedRows || 0,
              total: data.totalRows || 0,
              percentage: data.totalRows > 0 ? Math.round((data.processedRows / data.totalRows) * 100) : 0,
            })

            if (data.status === 'completed' || data.status === 'completed_with_errors') {
              const formattedResults = data.results?.map((r: Record<string, unknown>, idx: number) => ({
                id: (r.id as string) || `${batchIdRef.current}-row-${idx}`,
                input: (r.input as Record<string, string>) || {},
                output: (r.output as string) || '',
                status: normalizeStatus(r.status as string),
                error: r.error as string | undefined,
                input_tokens: r.input_tokens as number | undefined,
                output_tokens: r.output_tokens as number | undefined,
                model: r.model as string | undefined,
                tools_used: r.tools_used as string[] | undefined,
              })) || []
              
              setResults(formattedResults)
              setIsProcessing(false)
              setProgress({ completed: data.totalRows, total: data.totalRows, percentage: 100 })
              sessionStorage.removeItem(BATCH_ID_STORAGE_KEY)
          sessionStorage.removeItem(BATCH_START_TIME_KEY)
          sessionStorage.removeItem(BATCH_TOTAL_ROWS_KEY)
              return
            }

            if (data.status === 'failed') {
              setError('Batch processing failed')
              setIsProcessing(false)
              sessionStorage.removeItem(BATCH_ID_STORAGE_KEY)
          sessionStorage.removeItem(BATCH_START_TIME_KEY)
          sessionStorage.removeItem(BATCH_TOTAL_ROWS_KEY)
              return
            }

            // Continue polling
            pollTimeoutRef.current = setTimeout(pollForCompletion, POLL_INTERVAL_MS)
          } catch (err) {
            console.error('[Restore] Poll error:', err)
            pollTimeoutRef.current = setTimeout(pollForCompletion, POLL_INTERVAL_MS)
          }
        }

        pollTimeoutRef.current = setTimeout(pollForCompletion, 500)
      } catch (err) {
        console.error('[Restore] Error restoring batch:', err)
        sessionStorage.removeItem(BATCH_ID_STORAGE_KEY)
          sessionStorage.removeItem(BATCH_START_TIME_KEY)
          sessionStorage.removeItem(BATCH_TOTAL_ROWS_KEY)
      }
    }

    restoreBatch()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current)
      }
    }
  }, [])

  const stopAll = useCallback(() => {
    if (channelRef.current) {
      console.log('[Realtime] Unsubscribing from channel')
      channelRef.current.unsubscribe()
      channelRef.current = null
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current)
      pollTimeoutRef.current = null
    }
  }, [])

  const startBatch = useCallback(async (params: StartBatchParams): Promise<void> => {
    const { csvData, prompt, context = '', outputColumns, webhookUrl, tools, testMode = false, selectedInputColumns } = params

    // Reset state
    stopAll()
    setBatchId(null)
    batchIdRef.current = null
    setIsProcessing(true)
    setIsQueued(false)
    setQueueInfo(null)
    setError(null)
    setResults([])
    setProgress(null)
    batchTotalRef.current = 0
    startTimeRef.current = Date.now()
    
    try {
      sessionStorage.removeItem(BATCH_ID_STORAGE_KEY)
          sessionStorage.removeItem(BATCH_START_TIME_KEY)
          sessionStorage.removeItem(BATCH_TOTAL_ROWS_KEY)
    } catch { /* ignore */ }

    try {
      // Filter rows to selected columns
      let filteredRows: Record<string, string>[]
      if (selectedInputColumns && selectedInputColumns.length > 0) {
        filteredRows = csvData.rows.map((row) => {
          const filtered: Record<string, string> = {}
          selectedInputColumns.forEach(col => {
            if (col in row.data) filtered[col] = row.data[col]
          })
          return filtered
        })
      } else {
        filteredRows = csvData.rows.map(r => r.data)
      }

      // Submit batch
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvFilename: csvData.filename,
          rows: filteredRows,
          prompt,
          context,
          outputColumns,
          tools: tools || undefined,
          webhookUrl: webhookUrl || undefined,
          testMode: testMode || undefined,
          selectedInputColumns: selectedInputColumns || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Processing failed')
      }

      const data = await response.json()
      const newBatchId = data.batchId
      setBatchId(newBatchId)
      batchIdRef.current = newBatchId

      const actualRowCount = data.totalRows || filteredRows.length
      batchTotalRef.current = actualRowCount

      // Save batch info to restore progress if user navigates away
      try {
        sessionStorage.setItem(BATCH_ID_STORAGE_KEY, newBatchId)
        sessionStorage.setItem(BATCH_START_TIME_KEY, String(startTimeRef.current))
        sessionStorage.setItem(BATCH_TOTAL_ROWS_KEY, String(actualRowCount))
        console.log('[Batch] Saved batch info to sessionStorage:', newBatchId)
      } catch (e) {
        console.error('[Batch] Failed to save batch info:', e)
      }

      if (data.truncated) {
        toast.info(`Processing first ${data.totalRows.toLocaleString()} rows`, {
          description: `Beta limit applied.`,
          duration: 5000,
        })
      }

      setProgress({
        completed: 0,
        total: actualRowCount,
        percentage: 0,
      })

      trackEvent(ANALYTICS_EVENTS.BATCH_STARTED, {
        batchId: newBatchId,
        rowCount: actualRowCount,
        testMode,
      })

      // ============================================
      // SUPABASE REALTIME + FALLBACK POLLING
      // ============================================
      const supabase = createClient()
      
      // Track results
      const resultsMap = new Map<string, BatchResult>()
      
      // Helper to handle completion
      const handleCompletion = (status: string, dbResults?: BatchResult[]) => {
        console.log(`[Batch] Handling completion: ${status}`)
        
        const allResults = dbResults || Array.from(resultsMap.values())
        const failedCount = allResults.filter(r => r.status === 'failed').length
        const total = batchTotalRef.current

        setResults(allResults)
        setIsProcessing(false)
        setProgress({
          completed: total,
          total,
          percentage: 100,
        })

        stopAll()
        try {
          sessionStorage.removeItem(BATCH_ID_STORAGE_KEY)
          sessionStorage.removeItem(BATCH_START_TIME_KEY)
          sessionStorage.removeItem(BATCH_TOTAL_ROWS_KEY)
        } catch { /* ignore */ }

        trackEvent(ANALYTICS_EVENTS.BATCH_COMPLETED, {
          batchId: newBatchId,
          totalRows: total,
          hasErrors: failedCount > 0,
        })

        if (failedCount > 0) {
          toast.success(`Completed ${total - failedCount} rows`, {
            description: `${failedCount} rows failed`
          })
        } else {
          toast.success(`Completed processing ${total} rows!`)
        }
      }

      // Fallback polling function (in case Realtime doesn't work)
      const pollForStatus = async () => {
        if (!batchIdRef.current || batchIdRef.current !== newBatchId) return
        
        try {
          const statusRes = await fetch(`/api/batch/${newBatchId}/status?limit=10000`)
          if (!statusRes.ok) {
            pollTimeoutRef.current = setTimeout(pollForStatus, POLL_INTERVAL_MS)
            return
          }

          const statusData = await statusRes.json()
          const { status, processedRows, totalRows, results: dbResults } = statusData

          // Update progress
          const total = totalRows || actualRowCount
          const completed = processedRows || 0
          setProgress({
            completed,
            total,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
          })

          if (status === 'completed' || status === 'completed_with_errors') {
            const formattedResults = dbResults?.map((r: Record<string, unknown>, idx: number) => ({
              id: (r.id as string) || `${newBatchId}-row-${idx}`,
              input: (r.input as Record<string, string>) || {},
              output: (r.output as string) || '',
              status: normalizeStatus(r.status as string),
              error: r.error as string | undefined,
              input_tokens: r.input_tokens as number | undefined,
              output_tokens: r.output_tokens as number | undefined,
              model: r.model as string | undefined,
              tools_used: r.tools_used as string[] | undefined,
            })) || []
            handleCompletion(status, formattedResults)
            return
          }

          if (status === 'failed') {
            setError('Batch processing failed')
            setIsProcessing(false)
            stopAll()
            toast.error('Batch processing failed')
            return
          }

          // Continue polling
          pollTimeoutRef.current = setTimeout(pollForStatus, POLL_INTERVAL_MS)
        } catch (err) {
          console.error('[Poll] Error:', err)
          pollTimeoutRef.current = setTimeout(pollForStatus, POLL_INTERVAL_MS)
        }
      }

      // Try Realtime subscription
      if (supabase) {
        console.log(`[Realtime] Setting up subscription for batch: ${newBatchId}`)
        
        const channel = supabase
          .channel(`batch-${newBatchId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'batches',
              filter: `id=eq.${newBatchId}`,
            },
            (payload) => {
              console.log('[Realtime] Batch update received:', payload)
              const { status, processed_rows, total_rows } = payload.new as {
                status: string
                processed_rows?: number
                total_rows?: number
              }

              const total = total_rows || actualRowCount
              const completed = processed_rows || resultsMap.size
              setProgress({
                completed,
                total,
                percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
              })

              if (status === 'completed' || status === 'completed_with_errors') {
                // Fetch final results via API to ensure we have everything
                fetch(`/api/batch/${newBatchId}/status?limit=10000`)
                  .then(res => res.json())
                  .then(data => {
                    const formattedResults = data.results?.map((r: Record<string, unknown>, idx: number) => ({
                      id: (r.id as string) || `${newBatchId}-row-${idx}`,
                      input: (r.input as Record<string, string>) || {},
                      output: (r.output as string) || '',
                      status: normalizeStatus(r.status as string),
                      error: r.error as string | undefined,
                      input_tokens: r.input_tokens as number | undefined,
                      output_tokens: r.output_tokens as number | undefined,
                      model: r.model as string | undefined,
                      tools_used: r.tools_used as string[] | undefined,
                    })) || []
                    handleCompletion(status, formattedResults)
                  })
                  .catch(() => handleCompletion(status))
              } else if (status === 'failed') {
                setError('Batch processing failed')
                setIsProcessing(false)
                stopAll()
                toast.error('Batch processing failed')
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'batch_results',
              filter: `batch_id=eq.${newBatchId}`,
            },
            (payload) => {
              console.log('[Realtime] New result received')
              const r = payload.new as Record<string, unknown>
              const result: BatchResult = {
                id: (r.id as string) || `${newBatchId}-row-${resultsMap.size}`,
                input: (r.input_data as Record<string, string>) || {},
                output: (r.output_data as string) || '',
                status: normalizeStatus(r.status as string),
                error: r.error_message as string | undefined,
                input_tokens: r.input_tokens as number | undefined,
                output_tokens: r.output_tokens as number | undefined,
                model: r.model as string | undefined,
                tools_used: r.tools_used as string[] | undefined,
              }

              resultsMap.set(result.id, result)
              setResults(Array.from(resultsMap.values()))

              const total = batchTotalRef.current
              const completed = resultsMap.size
              setProgress({
                completed,
                total,
                percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
              })
            }
          )
          .subscribe((status) => {
            console.log(`[Realtime] Subscription status: ${status}`)
            if (status === 'SUBSCRIBED') {
              console.log('[Realtime] Successfully subscribed!')
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.warn('[Realtime] Subscription failed, falling back to polling')
              // Start polling as fallback
              pollTimeoutRef.current = setTimeout(pollForStatus, POLL_INTERVAL_MS)
            }
          })

        channelRef.current = channel
        
        // Also start polling as backup (Realtime can be flaky)
        // The first one to detect completion will handle it
        pollTimeoutRef.current = setTimeout(pollForStatus, POLL_INTERVAL_MS * 2)
      } else {
        console.warn('[Realtime] No Supabase client, using polling only')
        pollTimeoutRef.current = setTimeout(pollForStatus, POLL_INTERVAL_MS)
      }

      // Timeout check
      setTimeout(() => {
        if (batchIdRef.current === newBatchId && startTimeRef.current > 0) {
          const elapsed = Date.now() - startTimeRef.current
          if (elapsed > MAX_PROCESSING_TIME_MS) {
            setError('Processing timed out after 30 minutes')
            setIsProcessing(false)
            stopAll()
            toast.error('Processing timed out')
          }
        }
      }, MAX_PROCESSING_TIME_MS)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Processing failed'
      setError(errorMessage)
      setIsProcessing(false)
      toast.error(errorMessage)
      
      trackEvent(ANALYTICS_EVENTS.BATCH_FAILED, {
        error: errorMessage,
      })
    }
  }, [stopAll])

  const cancelBatch = useCallback(async () => {
    stopAll()
    setIsProcessing(false)
    setIsQueued(false)
    setQueueInfo(null)

    const currentBatchId = batchIdRef.current
    let success = false

    if (currentBatchId) {
      try {
        const response = await fetch(`/api/batch/${currentBatchId}/cancel`, {
          method: 'POST',
        })
        success = response.ok
      } catch {
        // Ignore API errors
      }
    }

    setBatchId(null)
    batchTotalRef.current = 0

    try {
      sessionStorage.removeItem(BATCH_ID_STORAGE_KEY)
          sessionStorage.removeItem(BATCH_START_TIME_KEY)
          sessionStorage.removeItem(BATCH_TOTAL_ROWS_KEY)
    } catch { /* ignore */ }

    toast.info('Batch cancelled')
    return success
  }, [stopAll])

  const clearResults = useCallback(() => {
    stopAll()
    setResults([])
    setProgress(null)
    setError(null)
    setBatchId(null)
    setIsProcessing(false)

    try {
      sessionStorage.removeItem(BATCH_ID_STORAGE_KEY)
          sessionStorage.removeItem(BATCH_START_TIME_KEY)
          sessionStorage.removeItem(BATCH_TOTAL_ROWS_KEY)
    } catch { /* ignore */ }
  }, [stopAll])

  // Calculate elapsed seconds for loading screen
  const elapsedSeconds = startTimeRef.current > 0 
    ? Math.floor((Date.now() - startTimeRef.current) / 1000) 
    : 0

  return {
    batchId,
    isProcessing,
    isQueued,
    queueInfo,
    results,
    progress,
    error,
    startBatch,
    cancelBatch,
    clearResults,
    elapsedSeconds, // For loading screen to resume from correct time
  }
}
