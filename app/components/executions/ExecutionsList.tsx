/**
 * Executions List Component
 * Extracted from analytics/executions pages for lazy loading
 * Contains batch table with filtering, sorting, and export functionality
 */

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Plus, TrendingUp, Download, Search, RefreshCw, AlertCircle, X, ArrowUp, ArrowDown, HelpCircle, Activity, CheckCircle2, XCircle, ChevronRight, CheckCircle, Zap, Calendar, Trash2, FileDown, Table2 } from 'lucide-react'
import { logError } from '@/lib/errors'
import { toast } from 'sonner'
import { flattenBatchResultsForExport, downloadCSV, downloadXLSX } from '@/lib/export'
import { formatRelativeTime } from '@/lib/utils/date'
import { EmptyState } from '@/components/ui/empty-state'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { StatusBadgeWrapper } from '@/components/integration/StatusBadgeWrapper'
import { TruncatedText } from '@/components/ui/truncated-text'
import { ProgressDisplay } from '@/components/integration/ProgressDisplay'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { cn } from '@/lib/utils'

interface Batch {
  id: string
  csv_filename: string
  status: 'pending' | 'processing' | 'completed' | 'completed_with_errors' | 'failed'
  total_rows: number
  processed_rows: number
  created_at: string
  updated_at: string
  total_input_tokens?: number
  total_output_tokens?: number
  model_used?: string
  scheduled_run_name?: string
  is_scheduled?: boolean
}

interface DashboardStats {
  totalBatches: number
  completedBatches: number
  failedBatches: number
  successRate: number
}

export function ExecutionsList() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { user, loading: authLoading } = useAuth()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<Batch['status'] | 'all'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'name'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [isInitialized, setIsInitialized] = useState(false)
  const [visibleColumns] = useState<string[]>(['filename', 'status', 'progress', 'model', 'created', 'actions'])
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [batchToDelete, setBatchToDelete] = useState<Batch | null>(null)

  // Fetch batches with React Query - cached for 30s, instant on repeat visits
  const { data: batches = [], isLoading: queryLoading, error: queryError } = useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      // DEV MODE: Skip Supabase and show empty state
      if (process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
        return []
      }

      const supabase = createClient()
      if (!supabase) {
        throw new Error('Supabase client not configured')
      }

      // Get current user for filtering
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      let query = supabase
        .from('batches')
        .select('id, csv_filename, status, total_rows, processed_rows, created_at, updated_at, total_input_tokens, total_output_tokens')
        .order('created_at', { ascending: false })
        .limit(100)
      
      // Filter by user_id if authenticated (RLS backup)
      if (currentUser?.id) {
        query = query.eq('user_id', currentUser.id)
      }
      
      const { data, error: fetchError } = await query
      
      console.log('[LOG] Fetched batches:', { 
        userId: currentUser?.id, 
        count: data?.length, 
        error: fetchError?.message 
      })

      if (fetchError) throw fetchError
      return (data || []) as Batch[]
    },
    enabled: !!user && !authLoading,
    staleTime: 30_000, // Consider fresh for 30 seconds
  })

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [authLoading, user, router])

  // Compute stats from batches
  const stats = useMemo<DashboardStats>(() => {
    const completedCount = batches.filter(b =>
      b.status === 'completed' || b.status === 'completed_with_errors'
    ).length
    const failedCount = batches.filter(b => b.status === 'failed').length
    const successRate = batches.length > 0
      ? Math.round((completedCount / batches.length) * 100)
      : 0

    return {
      totalBatches: batches.length,
      completedBatches: completedCount,
      failedBatches: failedCount,
      successRate,
    }
  }, [batches])

  const isLoading = authLoading || queryLoading
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load dashboard data') : null

  // Read URL params after mount to avoid hydration mismatch - UX issue #27
  useEffect(() => {
    const urlStatus = searchParams.get('status') as Batch['status'] | 'all'
    const urlSort = searchParams.get('sort') as 'date' | 'status' | 'name'
    const urlOrder = searchParams.get('order') as 'asc' | 'desc'
    const urlSearch = searchParams.get('q')
    
    if (urlStatus && ['all', 'pending', 'processing', 'completed', 'completed_with_errors', 'failed'].includes(urlStatus)) {
      setStatusFilter(urlStatus)
    }
    if (urlSort && ['date', 'status', 'name'].includes(urlSort)) {
      setSortBy(urlSort)
    }
    if (urlOrder && ['asc', 'desc'].includes(urlOrder)) {
      setSortOrder(urlOrder)
    }
    if (urlSearch) {
      setSearchQuery(urlSearch)
    }
    setIsInitialized(true)
  }, [searchParams])

  // Update URL when filters change (only after initial load)
  useEffect(() => {
    if (!isInitialized) return
    
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (sortBy !== 'date') params.set('sort', sortBy)
    if (sortOrder !== 'desc') params.set('order', sortOrder)
    if (searchQuery) params.set('q', searchQuery)
    
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname
    window.history.replaceState(null, '', newUrl)
  }, [statusFilter, sortBy, sortOrder, searchQuery, isInitialized])

  const filteredBatches = useMemo(() => {
    let filtered = [...batches]

    if (statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === statusFilter)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(b =>
        b.csv_filename.toLowerCase().includes(query) ||
        b.status.toLowerCase().includes(query) ||
        (b.scheduled_run_name && b.scheduled_run_name.toLowerCase().includes(query))
      )
    }

    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
      } else if (sortBy === 'status') {
        return sortOrder === 'desc'
          ? b.status.localeCompare(a.status)
          : a.status.localeCompare(b.status)
      } else {
        return sortOrder === 'desc'
          ? b.csv_filename.localeCompare(a.csv_filename)
          : a.csv_filename.localeCompare(b.csv_filename)
      }
    })

    return filtered
  }, [batches, statusFilter, searchQuery, sortBy, sortOrder])

  const handleDownloadCSV = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (filteredBatches.length === 0) {
      toast.error('No batches to export')
      return
    }

    const csvData = filteredBatches.map(batch => ({
      filename: batch.csv_filename,
      status: batch.status,
      total_rows: batch.total_rows,
      processed_rows: batch.processed_rows,
      created_at: new Date(batch.created_at).toLocaleString(),
      model: batch.model_used || 'N/A',
      input_tokens: batch.total_input_tokens || 0,
      output_tokens: batch.total_output_tokens || 0,
    }))

    try {
      downloadCSV(csvData, 'batches-export.csv')
      toast.success('CSV downloaded')
    } catch (error) {
      toast.error('Failed to download CSV')
      logError(error instanceof Error ? error : new Error('CSV download failed'), { source: 'ExecutionsList/handleDownloadCSV' })
    }
  }, [filteredBatches])

const handleDownloadXLSX = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (filteredBatches.length === 0) {
      toast.error('No batches to export')
      return
    }

    const xlsxData = filteredBatches.map(batch => ({
      filename: batch.csv_filename,
      status: batch.status,
      total_rows: batch.total_rows,
      processed_rows: batch.processed_rows,
      created_at: new Date(batch.created_at).toLocaleString(),
      model: batch.model_used || 'N/A',
      input_tokens: batch.total_input_tokens || 0,
      output_tokens: batch.total_output_tokens || 0,
    }))

    try {
      await downloadXLSX(xlsxData, 'batches-export.xlsx', 'Batches')
      toast.success('XLSX file downloaded')
    } catch (error) {
      toast.error('Failed to download XLSX file')
      logError(error instanceof Error ? error : new Error('XLSX download failed'), { source: 'ExecutionsList/handleDownloadXLSX' })
    }
  }, [filteredBatches])

  const exportBatch = useCallback(async (batchId: string, format: 'csv' | 'xlsx') => {
    try {
      const supabase = createClient()
      if (!supabase) throw new Error('Supabase not configured')

      const { data: batch } = await supabase
        .from('batches')
        .select('*')
        .eq('id', batchId)
        .single()

      if (!batch) throw new Error('Batch not found')

      const { data: results, error } = await supabase
        .from('batch_results')
        .select('*')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: true })

      if (error) throw error
      if (!results || results.length === 0) {
        toast.error('No results to export')
        return
      }

      const flattenedResults = flattenBatchResultsForExport(results)

      if (format === 'csv') {
        downloadCSV(flattenedResults, `${batch.csv_filename}-results.csv`)
      } else {
        await downloadXLSX(flattenedResults, `${batch.csv_filename}-results.xlsx`, 'Results')
      }

      toast.success(`${format.toUpperCase()} exported successfully`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed'
      toast.error(errorMessage)
      logError(err instanceof Error ? err : new Error(errorMessage), { source: 'ExecutionsList/exportBatch', batchId, format })
    }
  }, [])

  const deleteBatch = useCallback(async (batchId: string) => {
    try {
      const response = await fetch(`/api/batch/${batchId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete batch')
      }

      // Invalidate cache to refetch batches
      queryClient.invalidateQueries({ queryKey: ['batches'] })
      setSelectedBatch(null)

      toast.success('Batch deleted successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Delete failed'
      toast.error(errorMessage)
      logError(err instanceof Error ? err : new Error(errorMessage), { source: 'ExecutionsList/deleteBatch', batchId })
    }
  }, [queryClient])

// Note: Column configuration available for future column toggle feature
  // See TableColumnToggle component for implementation

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full bg-secondary/40 border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
            <h2 className="text-sm font-medium text-red-400">Failed to Load Dashboard</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            {error}
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => window.location.reload()}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              aria-label="Retry loading dashboard"
            >
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Retry
            </Button>
            <Button
              onClick={() => router.push('/agents')}
              variant="outline"
              className="w-full bg-secondary border-border text-foreground hover:bg-accent"
              aria-label="Go to agents"
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Go to Agents
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-8 pb-4 sm:px-6 sm:pt-6 sm:pb-5 max-w-full overflow-hidden">
      <div className="space-y-5">
        {/* Stats Bar - Integrated within parent card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-secondary/20 rounded-lg transition-colors hover:bg-secondary/30">
            <Activity className="h-4 w-4 text-blue-400 flex-shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-xl font-bold text-foreground tabular-nums">{stats.totalBatches.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-secondary/20 rounded-lg transition-colors hover:bg-secondary/30">
            <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-xl font-bold text-foreground tabular-nums">{stats.completedBatches.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Completed</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-secondary/20 rounded-lg transition-colors hover:bg-secondary/30">
            <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-xl font-bold text-foreground tabular-nums">{stats.failedBatches.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Failed</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-secondary/20 rounded-lg transition-colors hover:bg-secondary/30">
            <TrendingUp className="h-4 w-4 text-green-400 flex-shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-xl font-bold text-foreground tabular-nums">{stats.successRate}%</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Success</div>
            </div>
          </div>
        </div>

        {/* Batch Table - Flows within parent card */}
        <div className="min-w-0">
          {/* Header - Clean layout */}
          <div className="pb-4 border-b border-border/30">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              {/* Title and count */}
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-foreground">Executions</h2>
                {batches.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className="font-medium">{filteredBatches.length}</span> {filteredBatches.length === 1 ? 'execution' : 'executions'}
                    {filteredBatches.length !== batches.length && (
                      <span className="text-muted-foreground/70"> of {batches.length} total</span>
                    )}
                  </p>
                )}
              </div>

              {/* Export buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadCSV}
                  disabled={filteredBatches.length === 0}
                  className="h-8 px-3 bg-secondary/80 border-border/60 text-foreground text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-50"
                  aria-label="Download all executions as CSV"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                  <span>CSV</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadXLSX}
                  disabled={filteredBatches.length === 0}
                  className="h-8 px-3 bg-secondary/80 border-border/60 text-foreground text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-50"
                  aria-label="Download all executions as XLSX"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                  <span>XLSX</span>
                </Button>
              </div>
            </div>
            {batches.length > 0 && (
              <div className="mt-4 space-y-3">
                {/* Search */}
                {batches.length > 5 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
                    <Input
                      placeholder="Search by filename or status..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-10 h-9 bg-background/50 border-border/60 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-border transition-all"
                      aria-label="Search batches by filename or status"
                      title="Search batches by filename or status"
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="absolute right-8 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-secondary/50"
                            aria-label="Search help"
                          >
                            <HelpCircle className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-medium mb-1">Search Scope</p>
                          <p className="text-xs">
                            Searches through batch filenames and status. Use status filters below for more precise filtering.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors rounded p-1 hover:bg-secondary/50"
                        aria-label="Clear search"
                        title="Clear search (Esc)"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Filters and Sort - Cleaner layout */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-start sm:items-center pt-2 border-t border-border/40">
                  {/* Status Filter */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {['all', 'completed', 'processing', 'failed'].map((status) => (
                        <Badge
                          key={status}
                          variant="outline"
                          className={cn(
                            "cursor-pointer text-xs px-3 py-1.5 transition-all font-medium",
                            statusFilter === status
                              ? status === 'completed'
                                ? "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/40 hover:bg-green-500/25"
                                : status === 'processing'
                                ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/40 hover:bg-blue-500/25"
                                : status === 'failed'
                                ? "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/40 hover:bg-red-500/25"
                                : "bg-primary/20 text-primary border-primary/40 hover:bg-primary/25"
                              : "bg-background/50 border-border/60 text-muted-foreground hover:bg-background/70 hover:border-border hover:text-foreground"
                          )}
                          onClick={() => setStatusFilter(status as Batch['status'] | 'all')}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Sort */}
                  <div className="flex items-center gap-2 ml-0 sm:ml-auto flex-wrap">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sort:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (sortBy === 'date') {
                          setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                        } else {
                          setSortBy('date')
                          setSortOrder('desc')
                        }
                      }}
                      className={cn(
                        "h-8 px-3 text-xs transition-all",
                        sortBy === 'date' 
                          ? "bg-primary/10 text-primary hover:bg-primary/15" 
                          : "hover:bg-accent/50"
                      )}
                    >
                      Date
                      {sortBy === 'date' && (
                        sortOrder === 'desc' ? <ArrowDown className="h-3 w-3 ml-1.5" /> : <ArrowUp className="h-3 w-3 ml-1.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (sortBy === 'name') {
                          setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                        } else {
                          setSortBy('name')
                          setSortOrder('asc')
                        }
                      }}
                      className={cn(
                        "h-8 px-3 text-xs transition-all",
                        sortBy === 'name' 
                          ? "bg-primary/10 text-primary hover:bg-primary/15" 
                          : "hover:bg-accent/50"
                      )}
                    >
                      Name
                      {sortBy === 'name' && (
                        sortOrder === 'desc' ? <ArrowDown className="h-3 w-3 ml-1.5" /> : <ArrowUp className="h-3 w-3 ml-1.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (sortBy === 'status') {
                          setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                        } else {
                          setSortBy('status')
                          setSortOrder('desc')
                        }
                      }}
                      className={cn(
                        "h-8 px-3 text-xs transition-all",
                        sortBy === 'status' 
                          ? "bg-primary/10 text-primary hover:bg-primary/15" 
                          : "hover:bg-accent/50"
                      )}
                    >
                      Status
                      {sortBy === 'status' && (
                        sortOrder === 'desc' ? <ArrowDown className="h-3 w-3 ml-1.5" /> : <ArrowUp className="h-3 w-3 ml-1.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6 mt-4">
            {batches.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  emoji="🏟️"
                  title="Ready to start running"
                  description="Complete your first batch to see it logged here"
                  action={{
                    label: "Start Running",
                    onClick: () => router.push('/go'),
                    variant: 'default'
                  }}
                  size="md"
                  variant="default"
                />
              </div>
            ) : filteredBatches.length === 0 ? (
              <div className="p-8 text-center">
                <div className="flex flex-col items-center gap-3">
                  <span className="text-4xl" role="img" aria-hidden="true">🔍</span>
                  <p className="text-sm font-medium text-foreground">No batches match your filters</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Try adjusting your search query or status filters to see more results.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStatusFilter('all')
                      setSearchQuery('')
                    }}
                    className="mt-2"
                  >
                    <X className="h-3 w-3 mr-2" />
                    Clear Filters
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Mobile Card View - Visible only on mobile */}
                <div className="md:hidden px-3 pb-4 space-y-3">
                  {filteredBatches.map((batch) => (
                    <button
                      key={batch.id}
                      onClick={() => setSelectedBatch(batch)}
                      className="w-full p-4 rounded-lg border border-border/60 bg-gradient-to-br from-secondary/20 to-secondary/10 hover:bg-secondary/30 hover:border-border/80 transition-all text-left"
                    >
                      {/* Card Header - Filename and Status */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-foreground">
                            <TruncatedText text={batch.csv_filename} maxLength={35} />
                          </h3>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      </div>

                      {/* Status Badge */}
                      <div className="mb-3">
                        <StatusBadgeWrapper status={batch.status} size="sm" />
                      </div>

                      {/* Progress */}
                      <div className="mb-3">
                        <ProgressDisplay
                          processed={batch.processed_rows}
                          total={batch.total_rows}
                        />
                      </div>

                      {/* Created Date */}
                      <div className="text-xs text-muted-foreground">
                        {formatRelativeTime(batch.created_at)}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Desktop Table View - Hidden on mobile */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[700px] animate-row-stagger">
                  {/* Table Header - Standardized style */}
                  <thead className="sticky top-0 bg-secondary border-b border-border/50 z-10">
                    <tr>
                      {visibleColumns.includes('filename') && (
                        <th className="px-4 sm:px-6 py-2.5 text-left">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filename</span>
                        </th>
                      )}
                      {visibleColumns.includes('status') && (
                        <th className="px-4 sm:px-6 py-2.5 text-left">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</span>
                        </th>
                      )}
                      {visibleColumns.includes('progress') && (
                        <th className="px-4 sm:px-6 py-2.5 text-left">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progress</span>
                        </th>
                      )}
                      {visibleColumns.includes('model') && (
                        <th className="px-4 sm:px-6 py-2.5 text-left">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Model & Tokens</span>
                        </th>
                      )}
                      {visibleColumns.includes('created') && (
                        <th className="px-4 sm:px-6 py-2.5 text-left">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created</span>
                        </th>
                      )}
                      {visibleColumns.includes('actions') && (
                        <th className="px-4 sm:px-6 py-2.5 text-right">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</span>
                        </th>
                      )}
                    </tr>
                  </thead>

                  {/* Table Body - Better visual separation */}
                  <tbody className="divide-y divide-border/40">
                    {filteredBatches.map((batch) => (
                      <tr
                        key={batch.id}
                        className="cursor-pointer transition-colors hover:bg-secondary/20"
                        onClick={() => setSelectedBatch(batch)}
                      >
                        {visibleColumns.includes('filename') && (
                          <td className="px-4 sm:px-6 py-3 text-sm font-medium text-foreground">
                            <TruncatedText text={batch.csv_filename} maxLength={50} />
                          </td>
                        )}
                        {visibleColumns.includes('status') && (
                          <td className="px-4 sm:px-6 py-3">
                            <StatusBadgeWrapper status={batch.status} size="sm" />
                          </td>
                        )}
                        {visibleColumns.includes('progress') && (
                          <td className="px-4 sm:px-6 py-3">
                            <ProgressDisplay
                              processed={batch.processed_rows}
                              total={batch.total_rows}
                            />
                          </td>
                        )}
                        {visibleColumns.includes('model') && (
                          <td className="px-4 sm:px-6 py-3 text-xs whitespace-nowrap min-w-[200px]">
                            {(batch.model_used || batch.total_input_tokens || batch.total_output_tokens) ? (
                              <div className="space-y-0.5">
                                {batch.model_used && (
                                  <div className="font-mono font-medium text-foreground truncate max-w-[180px]" title={batch.model_used}>{batch.model_used}</div>
                                )}
                                {(batch.total_input_tokens || batch.total_output_tokens) ? (
                                  <div className="text-muted-foreground text-xs whitespace-nowrap">
                                    <span className="text-foreground/70">{(batch.total_input_tokens || 0).toLocaleString()}</span> in /
                                    <span className="text-foreground/70 ml-1">{(batch.total_output_tokens || 0).toLocaleString()}</span> out
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                        {visibleColumns.includes('created') && (
                          <td className="px-4 sm:px-6 py-3 text-xs text-muted-foreground">
                            {formatRelativeTime(batch.created_at)}
                          </td>
                        )}
                        {visibleColumns.includes('actions') && (
                          <td className="px-4 sm:px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        exportBatch(batch.id, 'csv')
                                      }}
                                      disabled={batch.status === 'pending' || batch.status === 'processing'}
                                      aria-label="Export CSV"
                                    >
                                      <FileDown className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Export CSV</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        exportBatch(batch.id, 'xlsx')
                                      }}
                                      disabled={batch.status === 'pending' || batch.status === 'processing'}
                                      aria-label="Export XLSX"
                                    >
                                      <Table2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Export XLSX</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setBatchToDelete(batch)
                                      }}
                                      aria-label="Delete batch"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>

                {/* Details Modal - For mobile card clicks */}
                <Modal
                  isOpen={!!selectedBatch}
                  onClose={() => setSelectedBatch(null)}
                  title={selectedBatch?.csv_filename || 'Execution Details'}
                  size="md"
                  ariaLabelledBy="execution-details-title"
                  footer={
                    <div className="flex items-center gap-3 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedBatch(null)}
                        className="flex-1"
                      >
                        Close
                      </Button>
                      {selectedBatch && selectedBatch.status !== 'pending' && selectedBatch.status !== 'processing' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              selectedBatch && exportBatch(selectedBatch.id, 'csv')
                              setSelectedBatch(null)
                            }}
                            className="flex-1"
                          >
                            <FileDown className="h-4 w-4 mr-2" />
                            CSV
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              selectedBatch && exportBatch(selectedBatch.id, 'xlsx')
                              setSelectedBatch(null)
                            }}
                            className="flex-1"
                          >
                            <Table2 className="h-4 w-4 mr-2" />
                            XLSX
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (selectedBatch) {
                            setBatchToDelete(selectedBatch)
                          }
                        }}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  }
                >
                  {selectedBatch && (
                    <div className="space-y-3">
                      {/* Status Section */}
                      <div className="rounded-lg bg-gradient-to-br from-secondary/25 to-secondary/10 p-3 border border-border/40">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</p>
                        </div>
                        <StatusBadgeWrapper status={selectedBatch.status} size="sm" />
                      </div>

                      {/* Progress Section */}
                      <div className="rounded-lg bg-gradient-to-br from-secondary/25 to-secondary/10 p-3 border border-border/40">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Progress</p>
                        </div>
                        <ProgressDisplay
                          processed={selectedBatch.processed_rows}
                          total={selectedBatch.total_rows}
                        />
                      </div>

                      {/* Model & Tokens Section */}
                      {selectedBatch.model_used && (
                        <div className="rounded-lg bg-gradient-to-br from-secondary/25 to-secondary/10 p-3 border border-border/40">
                          <div className="flex items-center gap-2 mb-2">
                            <Zap className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Model</p>
                          </div>
                          <div className="font-mono text-xs font-semibold text-foreground mb-2 px-2 py-1.5 bg-background/60 rounded truncate" title={selectedBatch.model_used}>{selectedBatch.model_used}</div>
                          {(selectedBatch.total_input_tokens || selectedBatch.total_output_tokens) && (
                            <div className="grid grid-cols-2 gap-2">
                              <div className="rounded bg-background/40 p-2">
                                <p className="text-xs text-muted-foreground font-medium mb-0.5">Input</p>
                                <p className="font-mono font-bold text-foreground text-xs">
                                  {(selectedBatch.total_input_tokens || 0).toLocaleString()}
                                </p>
                              </div>
                              <div className="rounded bg-background/40 p-2">
                                <p className="text-xs text-muted-foreground font-medium mb-0.5">Output</p>
                                <p className="font-mono font-bold text-foreground text-xs">
                                  {(selectedBatch.total_output_tokens || 0).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Timestamps Section */}
                      <div className="rounded-lg bg-gradient-to-br from-secondary/25 to-secondary/10 p-3 border border-border/40">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Timeline</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded bg-background/40 p-2">
                            <p className="text-xs text-muted-foreground font-medium mb-0.5">Created</p>
                            <p className="text-xs font-semibold text-foreground">{formatRelativeTime(selectedBatch.created_at)}</p>
                          </div>
                          <div className="rounded bg-background/40 p-2">
                            <p className="text-xs text-muted-foreground font-medium mb-0.5">Updated</p>
                            <p className="text-xs font-semibold text-foreground">{formatRelativeTime(selectedBatch.updated_at)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Modal>
              </>
            )}
          </div>
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!batchToDelete}
        onClose={() => setBatchToDelete(null)}
        title="Delete batch?"
        titleEmoji="🗑️"
        size="sm"
        ariaLabelledBy="delete-batch-title"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBatchToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (batchToDelete) {
                  deleteBatch(batchToDelete.id)
                  setBatchToDelete(null)
                }
              }}
            >
              Delete
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <span className="font-mono text-foreground">&quot;{batchToDelete?.csv_filename}&quot;</span>?
          </p>
          <p className="text-xs text-muted-foreground">
            This will permanently remove the batch and all its results. This action cannot be undone.
          </p>
        </div>
      </Modal>
    </div>
  )
}

