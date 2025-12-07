/**
 * ABOUTME: Results table component - displays batch processing results in real-time
 * ABOUTME: Shows status, input data, and AI-generated output for each row
 */

'use client'

import { useState, useEffect, memo, useMemo, useCallback, useRef } from 'react'
import { Sparkles, RotateCcw, Maximize2, CheckCircle, XCircle, Loader2, ChevronRight, FileDown, Table2 } from 'lucide-react'
import { QueueStatusCard } from './QueueStatusCard'
import { formatOutputValue } from '@/lib/utils/format-output'
import { TableColumnToggle, type ColumnConfig } from '@/components/ui/table-column-toggle'
import { DataTable, DataTableHeader, DataTableHead, DataTableBody, DataTableRow } from '@/components/ui/data-table'
import { SimpleDataTable, type TableRow } from '@/components/ui/simple-data-table'
import { Modal } from '@/components/ui/modal'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useMobile } from '@/hooks/useMobile'
import { ToolbarIconButton, ToolbarButtonGroup, ToolbarDivider } from '@/components/ui/toolbar-icon-button'
import type { QueueInfo } from '@/hooks/useBatchProcessor'

interface Result {
  id: string
  input: Record<string, string>
  output: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string
  // Per-row metadata
  input_tokens?: number
  output_tokens?: number
  model?: string
  tools_used?: string[]
}

/**
 * Format error messages to be more user-friendly with context
 */
function formatErrorMessage(error: string): { message: string; hint?: string } {
  const lowerError = error.toLowerCase()
  
  // Known error patterns with helpful hints
  if (lowerError.includes('google_search') || lowerError.includes('functiondeclaration')) {
    return {
      message: 'Tool configuration error',
      hint: 'This is a backend issue. Try refreshing and running a new batch. If it persists, the system may need redeployment.'
    }
  }
  
  if (lowerError.includes('rate limit') || lowerError.includes('429') || lowerError.includes('quota')) {
    return {
      message: 'Rate limit exceeded',
      hint: 'Too many requests. Wait a moment and try again, or reduce batch size.'
    }
  }
  
  if (lowerError.includes('timeout') || lowerError.includes('timed out')) {
    return {
      message: 'Request timed out',
      hint: 'The AI took too long to respond. Try simplifying your prompt or reducing tools.'
    }
  }
  
  if (lowerError.includes('blocked') || lowerError.includes('safety')) {
    return {
      message: 'Content blocked',
      hint: 'The AI declined to process this row due to content policies.'
    }
  }
  
  if (lowerError.includes('invalid') || lowerError.includes('parse')) {
    return {
      message: 'Invalid data format',
      hint: 'Check that your CSV data and prompt are properly formatted.'
    }
  }
  
  // Default: show original error truncated
  return {
    message: error.length > 100 ? error.substring(0, 100) + '...' : error
  }
}

// Engaging batch preparation loader with rotating messages and animations
function BatchPreparationLoader({ enabledTools = [] }: { enabledTools?: string[] }) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [dots, setDots] = useState('')
  
  // Different messages based on whether tools are enabled
  const hasWebSearch = enabledTools.includes('web-search')
  const hasUrlContext = enabledTools.includes('scrape-page')
  const hasTools = enabledTools.length > 0
  
  const messages = hasTools ? [
    hasWebSearch ? '🔍 Searching the web' : 'Initializing AI engine',
    hasUrlContext ? '🌐 Fetching URL content' : 'Loading your data',
    'Gathering research data',
    'Processing with AI tools',
    hasWebSearch ? 'Analyzing search results' : 'Preparing response',
    'Almost ready',
  ] : [
    'Initializing AI engine',
    'Loading your data',
    'Preparing context',
    'Warming up models',
    'Almost ready',
  ]
  
  useEffect(() => {
    // Rotate messages every 2 seconds
    const messageTimer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length)
    }, 2000)
    
    // Animate dots
    const dotTimer = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
    }, 400)
    
    return () => {
      clearInterval(messageTimer)
      clearInterval(dotTimer)
    }
  }, [messages.length])
  
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-8 w-full" role="status" aria-live="polite">
      {/* Animated icon */}
      <div className="relative w-14 h-14">
        {/* Outer ring - slow rotation */}
        <div className="absolute inset-0 w-14 h-14 rounded-full border-2 border-primary/20 animate-[spin_3s_linear_infinite]" />
        
        {/* Middle ring - medium rotation */}
        <div className="absolute inset-1 w-12 h-12 rounded-full border-2 border-t-primary/40 border-r-primary/40 border-b-transparent border-l-transparent animate-[spin_2s_linear_infinite_reverse]" />
        
        {/* Inner pulsing sparkle */}
        <div className="w-14 h-14 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-primary animate-pulse" />
        </div>
        
        {/* Orbiting dots */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-primary/60"
            style={{
              top: '50%',
              left: '50%',
              transform: `rotate(${i * 120}deg) translateX(24px) translateY(-50%)`,
              animation: 'spin 2s linear infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      
      {/* Message with fade transition */}
      <div className="text-center space-y-1.5">
        <div className="h-5 flex items-center justify-center">
          <span 
            key={messageIndex}
            className="text-sm font-medium text-foreground animate-[fadeIn_0.3s_ease-in-out]"
          >
            {messages[messageIndex]}{dots}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          This usually takes a few seconds
        </p>
      </div>
      
      {/* Progress bar - sliding animation */}
      <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full"
          style={{
            animation: 'slideProgress 1.5s ease-in-out infinite',
          }}
        />
      </div>
      
      {/* Add keyframes via style tag */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideProgress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  )
}

interface Progress {
  completed: number
  total: number
  totalResults?: number // Actual total (for large batches where displayed results < actual total)
}

interface ResultsTableProps {
  results: Result[]
  columns: string[]
  outputColumns?: string[]
  progress?: Progress
  onExport: (format: 'csv' | 'xlsx', visibleColumns?: string[]) => void // Now accepts visible columns
  onRetry?: (result: Result) => Promise<void>
  isTesting?: boolean
  testStartTime?: number
  testEstimatedSeconds?: number
  totalInputTokens?: number
  totalOutputTokens?: number
  isQueued?: boolean
  queueInfo?: QueueInfo | null
  isStarting?: boolean // Immediate feedback when batch is being created
  forceTableView?: boolean // Force table view even on mobile (for desktop layout)
  enabledTools?: string[] // Tools enabled for processing (web-search, scrape-page)
}

export const ResultsTable = memo(function ResultsTable({
  results,
  columns,
  outputColumns = [],
  progress,
  onExport,
  onRetry,
  isTesting = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  testStartTime: _testStartTime,
  enabledTools = [],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  testEstimatedSeconds: _testEstimatedSeconds,
  totalInputTokens,
  totalOutputTokens,
  isQueued = false,
  queueInfo = null,
  isStarting = false,
  forceTableView = false
}: ResultsTableProps) {
  // Mobile detection - can be overridden by forceTableView prop
  const { isMobile: isMobileDetected } = useMobile()
  const isMobile = forceTableView ? false : isMobileDetected
  
  // Check if we have actual processed results (not just pending placeholders)
  // This is used to show the loader until Modal actually processes rows
  const hasActualResults = useMemo(() => {
    return results.some(r => r.status === 'completed' || r.status === 'failed')
  }, [results])
  
  // Mobile expanded rows state
  const [mobileExpandedRows, setMobileExpandedRows] = useState<Set<string>>(new Set())
  
  const toggleMobileRow = useCallback((rowId: string) => {
    setMobileExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(rowId)) {
        next.delete(rowId)
      } else {
        next.add(rowId)
      }
      return next
    })
  }, [])

  // Column configuration for TableColumnToggle
  const columnConfigs = useMemo<ColumnConfig[]>(() => {
    const configs: ColumnConfig[] = [
      { key: 'status', label: 'Status', defaultVisible: true, hideable: false },
      ...columns.map(col => ({ key: col, label: col, defaultVisible: true })),
      ...outputColumns.map(col => ({ key: col, label: col, defaultVisible: true })),
    ]
    // If no output columns specified, add a generic "output" column
    if (outputColumns.length === 0) {
      configs.push({ key: 'output', label: 'Output', defaultVisible: true })
    }
    // Metadata columns - tokens visible by default, model/tools hidden
    configs.push(
      { key: 'input_tokens', label: 'In 🎟️', defaultVisible: true },
      { key: 'output_tokens', label: 'Out 🎟️', defaultVisible: true },
      { key: 'model', label: 'Model', defaultVisible: false },
      { key: 'tools_used', label: 'Tools Used', defaultVisible: false },
    )
    return configs
  }, [columns, outputColumns])

  // Column visibility state - initialize with all columns visible
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set())

  // Initialize and update visible columns when column configs change (e.g., new CSV uploaded)
  useEffect(() => {
    const defaultVisible = columnConfigs
      .filter(col => col.defaultVisible !== false)
      .map(col => col.key)
    setVisibleColumns(new Set(defaultVisible))
  }, [columnConfigs])

  const handleVisibilityChange = useCallback((visible: string[]) => {
    setVisibleColumns(new Set(visible))
  }, [])

  // Get array of visible columns for export (respects user selection)
  const getVisibleColumnsArray = useCallback(() => {
    return Array.from(visibleColumns)
  }, [visibleColumns])

  // Export handler that passes visible columns
  const handleExportWithColumns = useCallback((format: 'csv' | 'xlsx') => {
    onExport(format, getVisibleColumnsArray())
  }, [onExport, getVisibleColumnsArray])
  
  // Track max completed count to prevent flickering from polling race conditions
  const maxCompletedRef = useRef<number>(0)
  const lastTotalRef = useRef<number>(0)
  
  const [retryingRowId, setRetryingRowId] = useState<string | null>(null)
  const [showFullscreenModal, setShowFullscreenModal] = useState(false)
  const fullscreenModalScrollRef = useRef<HTMLDivElement | null>(null)
  
  // Table container ref for scrolling
  const tableContainerRef = useRef<HTMLDivElement>(null)
  
  // Transform results to shared TableRow format (for SimpleDataTable)
  const tableRows = useMemo<TableRow[]>(() => {
    return results.map(result => {
      // Parse output data
      const outputData: Record<string, string> = {}
      if (result.output) {
        try {
          if (typeof result.output === 'string' && result.output.trim()) {
            const parsed = JSON.parse(result.output)
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              // Convert all values to strings
              for (const [key, value] of Object.entries(parsed)) {
                outputData[key] = value !== null && value !== undefined 
                  ? (typeof value === 'object' ? formatOutputValue(value) : String(value))
                  : ''
              }
            }
          } else if (typeof result.output === 'object') {
            for (const [key, value] of Object.entries(result.output)) {
              outputData[key] = value !== null && value !== undefined 
                ? (typeof value === 'object' ? formatOutputValue(value) : String(value))
                : ''
            }
          }
        } catch {
          // If parse failed, put raw output in first column
          if (outputColumns.length > 0) {
            outputData[outputColumns[0]] = formatOutputValue(result.output)
          }
        }
      }
      
      return {
        id: result.id,
        data: result.input,
        status: result.status,
        outputData,
        error: result.error,
        // Metadata columns
        input_tokens: result.input_tokens,
        output_tokens: result.output_tokens,
        model: result.model,
        tools_used: result.tools_used,
      }
    })
  }, [results, outputColumns])
  
  // Render a single table row - extracted for reuse in virtualized and non-virtualized rendering
  const renderTableRow = useCallback((result: Result, index: number) => {
    return (
      <>
        {/* Row number */}
        <td className="px-3 py-2.5 text-center text-muted-foreground font-medium">
          {index + 1}
        </td>
        {/* Status indicator */}
        {visibleColumns.has('status') && (
          <td className="px-4 py-2.5 text-center">
            {result.status === 'completed' ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500 inline" aria-hidden="true" />
                <span className="sr-only">Completed</span>
              </>
            ) : result.status === 'failed' ? (
              <div className="flex items-center justify-center gap-1">
                <XCircle className="h-4 w-4 text-red-500" aria-hidden="true" />
                <span className="sr-only">Failed</span>
                {onRetry && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation()
                      setRetryingRowId(result.id)
                      try {
                        await onRetry(result)
                      } finally {
                        setRetryingRowId(null)
                      }
                    }}
                    disabled={retryingRowId === result.id}
                    className="p-0.5 text-red-500 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                    title="Retry"
                  >
                    <RotateCcw className={`h-3 w-3 ${retryingRowId === result.id ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>
            ) : result.status === 'processing' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground inline" aria-hidden="true" />
                <span className="sr-only">Processing</span>
              </>
            ) : (
              <>
                <div className="h-4 w-4 rounded-full border border-border/50 inline-block" aria-hidden="true" />
                <span className="sr-only">Pending</span>
              </>
            )}
          </td>
        )}
        {/* Input columns - matches CSVUploadTab styling exactly */}
        {columns.filter(col => visibleColumns.has(col)).map(col => {
          const cellValue = result.input[col]
          const isEmpty = !cellValue || !String(cellValue).trim()
          return (
            <td
              key={col}
              className={`px-4 py-2.5 ${isEmpty ? 'text-muted-foreground/50 italic' : 'text-foreground'}`}
            >
              {isEmpty ? (
                <span className="text-muted-foreground/40">—</span>
              ) : (
                <span className="block max-w-[300px] truncate" title={cellValue}>
                    {cellValue}
                </span>
              )}
            </td>
          )
        })}
        {/* Output columns - with subtle background to distinguish from input */}
        {outputColumns.length > 0 ? (
          outputColumns.filter(col => visibleColumns.has(col)).map((col, idx) => {
            const isFirstOutput = idx === 0
            const baseClass = `px-4 py-2.5 bg-primary/5 ${isFirstOutput ? 'border-l border-primary/30' : ''}`

            if (result.error) {
              const formatted = formatErrorMessage(result.error)
              return (
                <td key={col} className={`${baseClass}`}>
                  <div className="max-w-2xl">
                    <div className="text-xs text-red-600 dark:text-red-400 leading-relaxed" title={result.error}>
                      <span className="font-medium">{formatted.message}</span>
                      {formatted.hint && (
                        <span className="block text-red-500/70 dark:text-red-400/70 mt-0.5 text-[10px]">{formatted.hint}</span>
                      )}
                    </div>
                  </div>
                </td>
              )
            }
            if (!result.output) {
              // Show shimmer for pending/processing rows, "Empty" for completed rows with no output
              const isPending = result.status === 'pending' || result.status === 'processing'
              return (
                <td key={col} className={`${baseClass} text-muted-foreground/40`}>
                  {isPending ? (
                    <div 
                      className="h-3.5 bg-muted/40 rounded"
                      style={{ 
                        width: `${50 + Math.random() * 30}%`,
                        animation: 'gentleShimmer 2s ease-in-out infinite',
                        animationDelay: `${idx * 0.1}s`
                      }}
                    />
                  ) : (
                    <span className="text-xs italic text-muted-foreground/50">Empty</span>
                  )}
                </td>
              )
            }

            // Parse output and get value
            let displayValue = ''
            try {
              let outputData: Record<string, unknown> = {}
              if (typeof result.output === 'string' && result.output.trim()) {
                const parsed = JSON.parse(result.output)
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                  outputData = parsed as Record<string, unknown>
                }
              } else if (result.output && typeof result.output === 'object') {
                outputData = result.output as Record<string, unknown>
              }

              let value = outputData[col]
              if (value === null || value === undefined) {
                const keys = Object.keys(outputData)
                const matchedKey = keys.find(k => k.toLowerCase() === col.toLowerCase())
                if (matchedKey) value = outputData[matchedKey]
              }

              if (value !== null && value !== undefined) {
                displayValue = typeof value === 'object' ? formatOutputValue(value) : String(value)
              }
            } catch {
              // If first column and parse failed, show raw output
              if (col === outputColumns[0]) {
                displayValue = formatOutputValue(result.output)
              }
            }

            const isEmpty = !displayValue.trim()
            // Detect if this is a parse error message
            const isParseError = displayValue.includes('[Parse Error')

            return (
              <td key={col} className={baseClass}>
                {isEmpty ? (
                  <span className="text-xs italic text-muted-foreground/50">Empty</span>
                ) : (
                  <div className={isParseError ? 'max-w-2xl' : 'max-w-xl'}>
                    <div
                      className={`${isParseError ? 'line-clamp-3 text-xs font-mono text-orange-600 dark:text-orange-400' : 'line-clamp-3 text-foreground'} leading-relaxed`}
                      title={displayValue}
                    >
                      {displayValue}
                    </div>
                  </div>
                )}
              </td>
            )
          })
        ) : (
          visibleColumns.has('output') && (
            <td className="px-4 py-2.5 text-xs font-medium bg-primary/5 border-l border-primary/30 border-r border-border/30">
              {result.error ? (
                <div className="max-w-2xl">
                  {(() => {
                    const formatted = formatErrorMessage(result.error)
                    return (
                      <div className="text-xs text-red-600 dark:text-red-400 leading-relaxed" title={result.error}>
                        <span className="font-medium">{formatted.message}</span>
                        {formatted.hint && (
                          <span className="block text-red-500/70 dark:text-red-400/70 mt-0.5 text-[10px]">{formatted.hint}</span>
                        )}
                      </div>
                    )
                  })()}
                </div>
              ) : result.output ? (
                <div className="max-w-xl">
                  <div className="line-clamp-3 text-foreground leading-relaxed" title={formatOutputValue(result.output)}>
                    {formatOutputValue(result.output)}
                  </div>
                </div>
              ) : (
                <span className="text-xs italic text-muted-foreground/50">Empty</span>
              )}
            </td>
          )
        )}
      </>
    )
  }, [visibleColumns, columns, outputColumns, retryingRowId, onRetry])
  
  const successCount = results.filter(r => r.status === 'completed').length
  const errorCount = results.filter(r => r.status === 'failed').length
  
  // For real-time progress, use progress prop ONLY (single source of truth)
  // Don't fallback to results.length - it's paginated and causes flickering
  // Memoized to prevent dependency changes on every render
  const effectiveProgress = useMemo(() => {
    if (!progress) return null
    return {
      ...progress,
      // Always use progress.total - it's the actual batch total
      total: progress.total
    }
  }, [progress])

  // Calculate stable progress values - memoized to prevent re-calculation
  const progressData = useMemo(() => {
    const rawTotal = effectiveProgress?.total || 0
    const rawCompleted = effectiveProgress?.completed ?? 0
    
    // SANITY CHECK: If results count exceeds progress total, use results count
    // This handles race conditions where progress is from old batch but results are from new batch
    const completedResultsCount = results.filter(r => r.status === 'completed' || r.status === 'failed').length
    const total = Math.max(rawTotal, results.length, completedResultsCount)
    
    // CRITICAL: Reset when batch changes (detected by total changing significantly)
    // This prevents stale data from previous batch affecting new batch
    if (total !== lastTotalRef.current) {
      maxCompletedRef.current = 0
      lastTotalRef.current = total
    }
    
    // Use actual completed results count if it's higher than progress says
    const adjustedCompleted = Math.max(rawCompleted, completedResultsCount)
    
    // Track max completed to prevent flickering from polling race conditions
    if (adjustedCompleted > maxCompletedRef.current) {
      maxCompletedRef.current = adjustedCompleted
    }
    // Also reset when rawCompleted goes to 0 (new batch starting)
    if (rawCompleted === 0 && completedResultsCount === 0) {
      maxCompletedRef.current = 0
    }
    
    const completed = Math.max(adjustedCompleted, maxCompletedRef.current)
    
    // Detect active processing from results if progress prop isn't set
    const pendingCount = results.filter(r => r.status === 'pending' || r.status === 'processing').length
    const hasActiveProcessing = pendingCount > 0
    
    // isComplete only if we have progress data AND completed >= total, OR no pending items and we have results
    const isComplete = (total > 0 && completed >= total) || (!hasActiveProcessing && results.length > 0 && rawTotal === 0)
    // isProcessing if progress shows incomplete OR we have pending items in results
    const isProcessing = (total > 0 && completed < total) || hasActiveProcessing
    const totalTokens = (totalInputTokens || 0) + (totalOutputTokens || 0)
    
    return { total, completed, isComplete, isProcessing, totalTokens }
  }, [effectiveProgress, results, totalInputTokens, totalOutputTokens])

  return (
    <div className="flex flex-col h-full min-h-0 sm:p-4">
      {/* Screen reader announcements for dynamic updates */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        {effectiveProgress && effectiveProgress.completed > 0 && (
          <span>
            Processing: {effectiveProgress.completed} of {effectiveProgress.total} rows completed.
            {successCount > 0 && ` ${successCount} successful.`}
            {errorCount > 0 && ` ${errorCount} failed.`}
          </span>
        )}
        {isTesting && results.length === 0 && 'Testing prompt with first row...'}
        {results.length > 0 && !effectiveProgress && `${results.length} results ready.`}
      </div>

      {/* Results Card - matches left panel section styling */}
      <div className="flex-1 flex flex-col min-h-0 sm:rounded-lg sm:border sm:border-border/40 bg-card overflow-hidden">
        {/* Header - simple, status is shown in bottom toolbar */}
        <div className="flex items-center px-4 py-3 border-b border-border/40 bg-secondary/5 flex-shrink-0">
          <span className="text-sm font-medium text-foreground">Results</span>
        </div>

        {/* Queue Status Card - Show when batch is queued */}
        {isQueued && queueInfo ? (
          <QueueStatusCard
            queueInfo={queueInfo}
            isQueued={isQueued}
          />
        ) : null}

        {/* Mobile Card View OR Desktop Table - MAIN SCROLLABLE AREA */}
      {isMobile ? (
        <div className={`flex-1 px-3 pt-3 pb-3 space-y-2 ${
          (isStarting || (effectiveProgress && effectiveProgress.total > 0 && !hasActualResults))
            ? 'overflow-hidden'  // Prevent scroll when loader is showing
            : 'overflow-auto'
        }`}>
          {/* Mobile skeleton loading */}
          {isTesting && results.length === 0 && !isStarting && (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={`skeleton-${i}`} className="p-3 rounded-lg border border-border/50 bg-secondary/20">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 bg-muted rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
          
          {/* Mobile loading state - show when starting OR when processing with no actual results yet */}
          {(isStarting || (effectiveProgress && effectiveProgress.total > 0 && !hasActualResults)) && (
            <div className="flex-1 flex items-center justify-center min-h-[200px]">
              <BatchPreparationLoader enabledTools={enabledTools} />
            </div>
          )}
          
          {/* Mobile result cards */}
          {results.map((result, index) => {
            const isExpanded = mobileExpandedRows.has(result.id)
            const firstInputCol = columns[0]
            const firstInputValue = firstInputCol ? result.input[firstInputCol] : ''
            
            // Get output preview - show key output columns
            let outputPreview = ''
            if (result.output) {
              try {
                  const parsed = typeof result.output === 'string' ? JSON.parse(result.output) : result.output
                if (outputColumns.length > 0 && typeof parsed === 'object') {
                  // Build preview from all output columns (e.g., "is_icp: true, reason: ...")
                  const parts = outputColumns
                    .map(col => {
                      const val = parsed[col]
                      if (val === undefined || val === null || val === '') return null
                      const shortVal = String(val).length > 40 ? String(val).substring(0, 40) + '...' : String(val)
                      return `${col}: ${shortVal}`
                    })
                    .filter(Boolean)
                  outputPreview = parts.join(' ')
                } else {
                  outputPreview = formatOutputValue(result.output)
                }
              } catch {
                outputPreview = formatOutputValue(result.output)
              }
            }
            
            return (
              <button
                key={result.id}
                onClick={() => toggleMobileRow(result.id)}
                className="w-full text-left p-3 rounded-lg border border-border/50 bg-secondary/10 hover:bg-secondary/20 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/30"
              >
                {/* Card Header - Status + Primary Value */}
                <div className="flex items-start gap-3">
                  {/* Status Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {result.status === 'completed' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : result.status === 'failed' ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : result.status === 'processing' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-border/50" />
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Row number and first input */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">#{index + 1}</span>
                      {firstInputValue && (
                        <span className="text-sm font-medium text-foreground truncate">
                          {firstInputValue}
                        </span>
                      )}
                    </div>
                    
                    {/* Output preview or error */}
                    {result.error ? (
                      <p className="text-xs text-red-500 line-clamp-2" title={result.error}>
                        {formatErrorMessage(result.error).message}
                      </p>
                    ) : outputPreview ? (
                      <p className="text-xs text-muted-foreground line-clamp-2">{outputPreview}</p>
                    ) : result.status === 'processing' ? (
                      <p className="text-xs text-muted-foreground">Processing...</p>
                    ) : result.status === 'pending' ? (
                      <p className="text-xs text-muted-foreground">Waiting...</p>
                    ) : null}
                  </div>
                  
                  {/* Expand indicator */}
                  <ChevronRight className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
                
                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-border/30 space-y-2" onClick={(e) => e.stopPropagation()}>
                    {/* All input columns */}
                    {columns.map(col => {
                      const value = result.input[col]
                      if (!value) return null
                      return (
                        <div key={col} className="flex justify-between gap-2 text-xs">
                          <span className="text-muted-foreground">{col}</span>
                          <span className="text-foreground text-right truncate max-w-[60%]">{value}</span>
                        </div>
                      )
                    })}
                    
                    {/* Output columns - show ALL output columns like desktop */}
                    {result.output && (
                      <div className="pt-2 border-t border-border/30 space-y-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Sparkles className="h-3 w-3" />
                          <span>Output</span>
                        </div>
                        {(() => {
                          try {
                            const parsed = typeof result.output === 'string' ? JSON.parse(result.output) : result.output
                            if (outputColumns.length > 0 && typeof parsed === 'object') {
                              // Show each output column individually
                              return outputColumns.map(col => {
                                const value = parsed[col]
                                if (value === undefined || value === null || value === '') return null
                                return (
                                  <div key={col} className="flex justify-between gap-2 text-xs">
                                    <span className="text-muted-foreground">{col}</span>
                                    <span className="text-foreground text-right max-w-[60%] break-words">{String(value)}</span>
                                  </div>
                                )
                              })
                            }
                            // Fallback to raw output
                            return <p className="text-xs text-foreground whitespace-pre-wrap break-words">{formatOutputValue(result.output)}</p>
                          } catch {
                            return <p className="text-xs text-foreground whitespace-pre-wrap break-words">{formatOutputValue(result.output)}</p>
                          }
                        })()}
                      </div>
                    )}
                    
                    {/* Token usage - mobile */}
                    {(result.input_tokens || result.output_tokens) && (
                      <div className="pt-2 border-t border-border/30 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>🎟️ {(result.input_tokens || 0).toLocaleString()} in</span>
                        <span>{(result.output_tokens || 0).toLocaleString()} out</span>
                        {result.model && <span className="opacity-60">{result.model}</span>}
                      </div>
                    )}
                    
                    {/* Retry button for failed */}
                    {result.status === 'failed' && onRetry && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          setRetryingRowId(result.id)
                          try {
                            await onRetry(result)
                          } finally {
                            setRetryingRowId(null)
                          }
                        }}
                        disabled={retryingRowId === result.id}
                        className="mt-2 flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 disabled:opacity-50"
                      >
                        <RotateCcw className={`h-3 w-3 ${retryingRowId === result.id ? 'animate-spin' : ''}`} />
                        Retry
                      </button>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      ) : (
        /* Desktop Table View */
        <div
          ref={tableContainerRef}
          className={`flex-1 relative min-h-[200px] ${
            (isStarting || (effectiveProgress && effectiveProgress.total > 0 && !hasActualResults))
              ? 'overflow-hidden'  // Prevent scroll when loader is showing
              : 'overflow-x-auto overflow-y-auto'
          }`}
        >
        {/* Show loader overlay when starting OR processing with no actual results yet */}
        {(isStarting || (effectiveProgress && effectiveProgress.total > 0 && !hasActualResults)) && (
          <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
            <BatchPreparationLoader enabledTools={enabledTools} />
          </div>
        )}
        
        {/* ALL tables use shared SimpleDataTable component for guaranteed alignment */}
        {/* Table is always rendered to prevent layout shift - shows skeleton rows when empty */}
        <SimpleDataTable
          columns={columns.filter(col => visibleColumns.has(col))}
          rows={tableRows.length > 0 ? tableRows : (effectiveProgress?.total ? 
            // Show placeholder rows during loading
            Array.from({ length: Math.min(effectiveProgress.total, 10) }, (_, i) => ({
              id: `placeholder-${i}`,
              data: Object.fromEntries(columns.map(col => [col, ''])),
              status: 'pending' as const,
            })) : []
          )}
          showStatus={visibleColumns.has('status')}
          showRowNumbers={true}
          outputColumns={outputColumns.filter(col => visibleColumns.has(col))}
          showInputTokens={visibleColumns.has('input_tokens')}
          showOutputTokens={visibleColumns.has('output_tokens')}
          showModel={visibleColumns.has('model')}
          showToolsUsed={visibleColumns.has('tools_used')}
          className="text-xs"
        />
        </div>
      )}

        {/* Bottom Toolbar - inside card, matches left panel button bar styling */}
        <div className="flex-shrink-0 border-t border-border/40 bg-secondary/5">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          {/* Left side: Status info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {progressData.isComplete ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500/10 flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
                </div>
                <span className="font-medium tabular-nums text-green-600 dark:text-green-400 text-sm">
                  {(progressData.total || results.length) - errorCount} rows complete
                </span>
                {errorCount > 0 && <span className="text-red-500 text-sm">· {errorCount} failed</span>}
              </div>
            ) : progressData.isProcessing || isTesting ? (
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Progress bar inline */}
                <div className="flex-1 max-w-[200px] h-1.5 bg-secondary/60 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full progress-bar-fill" 
                    style={{ 
                      width: `${progressData.total > 0 ? Math.round((progressData.completed / progressData.total) * 100) : 0}%`,
                      willChange: 'width',
                      transform: 'translateZ(0)',
                    }} 
                  />
                </div>
                <span className="text-sm tabular-nums text-muted-foreground whitespace-nowrap">
                  {progressData.total > 0
                    ? `${progressData.completed}/${progressData.total}`
                    : `${successCount + errorCount} processed`
                  }
                </span>
                {progressData.total > 0 && (
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {Math.round((progressData.completed / progressData.total) * 100)}%
                  </span>
                )}
                {/* Show message when finishing last few rows - hide on small screens to prevent overlap */}
                {progressData.total > 0 && 
                 progressData.completed >= progressData.total * 0.95 && 
                 progressData.completed < progressData.total && (
                  <span className="hidden sm:inline text-xs text-amber-500 animate-pulse ml-1 whitespace-nowrap">
                    Finishing {progressData.total - progressData.completed} row{progressData.total - progressData.completed > 1 ? 's' : ''}...
                  </span>
                )}
              </div>
            ) : results.length > 0 ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="font-medium tabular-nums text-sm">{results.length} rows</span>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">Ready to process</span>
            )}
          </div>

          {/* Right side: Action buttons - all in one group for consistent styling */}
          <div className="flex items-center flex-shrink-0">
            <ToolbarButtonGroup>
              {/* Column toggle */}
              {(columns.length > 0 || outputColumns.length > 0) && (
                <>
                  <TableColumnToggle 
                    columns={columnConfigs} 
                    onVisibilityChange={handleVisibilityChange}
                  />
                  <ToolbarDivider />
                </>
              )}
              
              {/* Fullscreen button */}
              {results.length > 0 && !isMobile && (
                <>
                  <ToolbarIconButton
                    icon={<Maximize2 className="h-4 w-4" />}
                    tooltip="Fullscreen view"
                    onClick={() => setShowFullscreenModal(true)}
                  />
                  <ToolbarDivider />
                </>
              )}
              
              {/* Export CSV */}
              <ToolbarIconButton
                icon={<FileDown className="h-4 w-4" />}
                tooltip="Export CSV"
                onClick={() => handleExportWithColumns('csv')}
                disabled={results.length === 0}
              />
              <ToolbarDivider />
              
              {/* Export XLSX */}
              <ToolbarIconButton
                icon={<Table2 className="h-4 w-4" />}
                tooltip="Export Excel"
                onClick={() => handleExportWithColumns('xlsx')}
                disabled={results.length === 0}
              />
            </ToolbarButtonGroup>
          </div>
        </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      <Modal
        isOpen={showFullscreenModal}
        onClose={() => setShowFullscreenModal(false)}
        title="All Results"
        size="lg"
        ariaLabelledBy="fullscreen-results-modal-title"
        className="max-w-[90vw]"
      >
        <div className="space-y-4">
          {/* Minimal header */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <span className="text-sm text-muted-foreground">
              {results.length} rows
              {errorCount > 0 && <span className="text-red-500 ml-2">· {errorCount} failed</span>}
            </span>
            <TooltipProvider delayDuration={0}>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                <button
                      onClick={() => handleExportWithColumns('csv')}
                  disabled={results.length === 0}
                      className="h-8 w-8 flex items-center justify-center border border-border rounded-md hover:bg-secondary transition-colors disabled:opacity-50"
                      aria-label="Export CSV"
                    >
                      <FileDown className="h-4 w-4" />
                </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Export CSV</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleExportWithColumns('xlsx')}
                      disabled={results.length === 0}
                      className="h-8 w-8 flex items-center justify-center border border-border rounded-md hover:bg-secondary transition-colors disabled:opacity-50"
                      aria-label="Export XLSX"
                    >
                      <Table2 className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Export Excel</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>

          {/* Table - using shared DataTable components */}
          <div className="border border-border/60 rounded-lg overflow-hidden bg-background">
            <div ref={fullscreenModalScrollRef} className="overflow-auto max-h-[70vh]">
              <DataTable className="text-xs">
                <DataTableHeader>
                  <tr>
                    {/* Row number column */}
                    <DataTableHead className="text-center w-12 text-muted-foreground font-medium">#</DataTableHead>
                    {visibleColumns.has('status') && (
                      <DataTableHead className="text-center w-12" aria-label="Status" />
                    )}
                    {columns.filter(col => visibleColumns.has(col)).map(col => (
                      <DataTableHead key={col}>{col}</DataTableHead>
                    ))}
                    {outputColumns.length > 0 ? (
                      outputColumns.filter(col => visibleColumns.has(col)).map((col, idx) => (
                        <DataTableHead key={col} isOutput isFirstOutput={idx === 0}>
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="h-3 w-3 text-primary/60" aria-hidden="true" />
                            {col}
                          </span>
                        </DataTableHead>
                      ))
                    ) : (
                      visibleColumns.has('output') && (
                        <DataTableHead isOutput isFirstOutput>
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="h-3 w-3 text-primary/60" aria-hidden="true" />
                            output
                          </span>
                        </DataTableHead>
                      )
                    )}
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {results.map((result, i) => (
                    <DataTableRow key={result.id} isEven={i % 2 === 0}>
                      {renderTableRow(result, i)}
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
})
