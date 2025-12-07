/**
 * CSV Demo Animation Component
 * Extracted from home page for code splitting and lazy loading
 */

'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'

interface DemoRow {
  id: number
  name: string
  description: string
  summary?: string
  status: 'pending' | 'processing' | 'completed'
}

interface RecentBatch {
  id: string
  csv_filename: string
  agent_name?: string | null
  agent_icon?: string | null
  agent_id?: string | null
  created_at: string
  status: string
  processed_rows: number
  total_rows: number
}

interface CSVDemoProps {
  hasBatches: boolean
  recentBatches: RecentBatch[]
  onCurrentProcessingChange: (rowId: number | null) => void
  onThroughputChange: (throughput: { rowsPerSecond: number; tokensUsed: number }) => void
}

// Row component with intelligent line clamping
function DataRow({
  row,
  index,
  maxLines,
  typewriterText,
  typewriterRowId,
}: {
  row: DemoRow
  index: number
  maxLines: number
  typewriterText: string
  typewriterRowId: number | null
  currentProcessingRow: number | null
}) {
  const descRef = useRef<HTMLDivElement>(null)
  const summaryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const applyStyles = () => {
      if (descRef.current) {
        descRef.current.style.setProperty('display', '-webkit-box', 'important')
        descRef.current.style.setProperty('-webkit-line-clamp', String(maxLines), 'important')
        descRef.current.style.setProperty('-webkit-box-orient', 'vertical', 'important')
        descRef.current.style.setProperty('overflow', 'hidden', 'important')
        descRef.current.style.setProperty('text-overflow', 'ellipsis', 'important')
      }
      if (summaryRef.current) {
        summaryRef.current.style.setProperty('display', '-webkit-box', 'important')
        summaryRef.current.style.setProperty('-webkit-line-clamp', String(maxLines), 'important')
        summaryRef.current.style.setProperty('-webkit-box-orient', 'vertical', 'important')
        summaryRef.current.style.setProperty('overflow', 'hidden', 'important')
        summaryRef.current.style.setProperty('text-overflow', 'ellipsis', 'important')
      }
    }

    // Apply immediately
    applyStyles()

    // Also apply after a short delay to ensure DOM is ready
    const timeout = setTimeout(applyStyles, 0)

    return () => clearTimeout(timeout)
  }, [maxLines])

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className={`grid grid-cols-[100px_1fr_1fr] sm:grid-cols-[140px_1fr_1fr] border-b border-border/25 last:border-0 transition-colors duration-200 min-w-[600px] touch-pan-x ${
        row.status === 'processing' ? 'bg-primary/7' :
        row.status === 'completed' ? 'bg-green-500/7' :
        'bg-background'
      }`}
    >
      {/* Name */}
      <div className="px-3 sm:px-5 py-3 sm:py-4 text-xs text-foreground border-r border-border/22 font-mono break-words leading-[1.5]" title={row.name}>
        {row.name}
      </div>

      {/* Description - Intelligent line clamping based on available rows */}
      <div
        ref={descRef}
        className="px-3 sm:px-5 py-3 sm:py-4 text-xs text-foreground border-r border-border/22 font-mono break-words leading-[1.5]"
        title={row.description}
      >
        {row.description}
      </div>

      {/* Summary - Intelligent line clamping based on available rows */}
      <div
        ref={summaryRef}
        className="px-3 sm:px-5 py-3 sm:py-4 text-xs font-mono break-words leading-[1.5]"
        title={row.summary}
      >
        {row.status === 'pending' && (
          <span className="text-muted-foreground/50">—</span>
        )}
        {row.status === 'processing' && typewriterRowId === row.id && (
          <span className="text-green-600 break-words block">
            {typewriterText}
            <span className="inline-block w-0.5 h-3 sm:h-3.5 bg-green-600 ml-0.5 animate-pulse" />
          </span>
        )}
        {row.status === 'completed' && row.summary && (
          <span className="text-green-600 break-words block">
            <span className="break-words">{row.summary}</span>
            <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0 inline-block ml-1.5 sm:ml-2 text-green-600" />
          </span>
        )}
        {row.status === 'processing' && typewriterRowId !== row.id && (
          <span className="text-primary flex items-center gap-1.5 sm:gap-2">
            <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full border-2 border-primary/70 border-t-transparent animate-spin flex-shrink-0" />
            <span className="truncate text-xs">Processing...</span>
          </span>
        )}
      </div>
    </motion.div>
  )
}

export function CSVDemo({ hasBatches, recentBatches, onCurrentProcessingChange, onThroughputChange }: CSVDemoProps) {
  const [demoRows, setDemoRows] = useState<DemoRow[]>([
    { id: 1, name: 'John Doe', description: 'Software engineer with 5 years experience in React and Node.js', status: 'pending' },
    { id: 2, name: 'Jane Smith', description: 'Data scientist specializing in machine learning and Python', status: 'pending' },
    { id: 3, name: 'Mike Johnson', description: 'Product designer with expertise in UX/UI and design systems', status: 'pending' },
  ])
  const [currentProcessingRow, setCurrentProcessingRow] = useState<number | null>(null)
  const [typewriterText, setTypewriterText] = useState('')
  const [typewriterRowId, setTypewriterRowId] = useState<number | null>(null)
  const [throughput, setThroughput] = useState({ rowsPerSecond: 0, tokensUsed: 0 })
  const [replayRows, setReplayRows] = useState<DemoRow[]>([])
  const [replayBatchName, setReplayBatchName] = useState<string>('')
  const [replayBatchAgentIcon, setReplayBatchAgentIcon] = useState<string | null>(null)
  const [isLoadingReplay, setIsLoadingReplay] = useState(false)

  const summaries = useMemo(() => [
    'Experienced full-stack engineer specializing in React and Node.js',
    'ML expert with strong Python skills and data analysis background',
    'Design leader focused on user-centered design and design systems'
  ], [])

  // Sync state changes to parent
  useEffect(() => {
    onCurrentProcessingChange(currentProcessingRow)
  }, [currentProcessingRow, onCurrentProcessingChange])

  useEffect(() => {
    onThroughputChange(throughput)
  }, [throughput, onThroughputChange])

  // Multi-row sequential processing demo
  useEffect(() => {
    const shouldShowDemo = !hasBatches || (hasBatches && replayRows.length === 0 && !isLoadingReplay)

    if (shouldShowDemo) {
      let rowIndex = 0
      let isRunning = true
      let typeInterval: NodeJS.Timeout | null = null
      let processingTimeout: NodeJS.Timeout | null = null
      let completionTimeout: NodeJS.Timeout | null = null
      let nextRowTimeout: NodeJS.Timeout | null = null
      let cycleTimeout: NodeJS.Timeout | null = null

      const cleanup = () => {
        if (typeInterval) clearInterval(typeInterval)
        if (processingTimeout) clearTimeout(processingTimeout)
        if (completionTimeout) clearTimeout(completionTimeout)
        if (nextRowTimeout) clearTimeout(nextRowTimeout)
        if (cycleTimeout) clearTimeout(cycleTimeout)
      }

      const processNextRow = () => {
        if (!isRunning) return

        if (rowIndex >= demoRows.length) {
          // Reset after all rows processed
          cleanup()
          rowIndex = 0
          setDemoRows(prev => prev.map(r => ({ ...r, status: 'pending' as const, summary: undefined })))
          setCurrentProcessingRow(null)
          setTypewriterText('')
          setTypewriterRowId(null)
          setThroughput({ rowsPerSecond: 0, tokensUsed: 0 })

          // Wait 2s before next cycle
          cycleTimeout = setTimeout(() => {
            if (isRunning) processNextRow()
          }, 2000)
          return
        }

        const currentRowIndex = rowIndex
        const row = demoRows[currentRowIndex]
        const summary = summaries[currentRowIndex]

        // Mark as processing
        setCurrentProcessingRow(row.id)
        setDemoRows(prev => prev.map(r =>
          r.id === row.id ? { ...r, status: 'processing' as const } : r
        ))
        setThroughput(prev => ({ rowsPerSecond: 1.2, tokensUsed: prev.tokensUsed + 45 }))

        // Process for 2 seconds
        processingTimeout = setTimeout(() => {
          if (!isRunning) return

          // Start typewriter for this row
          setTypewriterRowId(row.id)
          setTypewriterText('')

          // Typewriter effect (25ms per character)
          let charIndex = 0
          typeInterval = setInterval(() => {
            if (!isRunning) {
              if (typeInterval) clearInterval(typeInterval)
              return
            }

            if (charIndex < summary.length) {
              setTypewriterText(summary.slice(0, charIndex + 1))
              charIndex++
            } else {
              if (typeInterval) clearInterval(typeInterval)
              // Mark as completed
              completionTimeout = setTimeout(() => {
                if (!isRunning) return
                setDemoRows(prev => prev.map(r =>
                  r.id === row.id ? { ...r, status: 'completed' as const, summary: summary } : r
                ))
                setCurrentProcessingRow(null)
                setTypewriterText('')
                setTypewriterRowId(null)
                rowIndex++
                // Process next row after 0.5s
                nextRowTimeout = setTimeout(() => {
                  if (isRunning) processNextRow()
                }, 500)
              }, 500)
            }
          }, 25)
        }, 2000)
      }

      // Start processing after 1s
      const startTimer = setTimeout(() => {
        if (isRunning) processNextRow()
      }, 1000)

      return () => {
        isRunning = false
        cleanup()
        clearTimeout(startTimer)
      }
    } else {
      // Reset when demo shouldn't run (replay is active)
      setDemoRows(prev => prev.map(r => ({ ...r, status: 'pending' as const, summary: undefined })))
      setCurrentProcessingRow(null)
      setTypewriterText('')
      setTypewriterRowId(null)
      setThroughput({ rowsPerSecond: 0, tokensUsed: 0 })
      return undefined
    }
  }, [demoRows, hasBatches, summaries, replayRows.length, isLoadingReplay])

  const completedBatches = useMemo(() =>
    recentBatches.filter(b =>
      b.status === 'completed' || b.status === 'completed_with_errors'
    ),
    [recentBatches]
  )

  // Fetch replay data when we have completed batches
  useEffect(() => {
    const fetchReplayData = async () => {
      if (replayRows.length > 0 || isLoadingReplay) {
        return
      }

      if (!hasBatches) {
        return
      }

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const recentBatch = completedBatches.find(b => {
        const batchDate = new Date(b.created_at)
        return batchDate >= sevenDaysAgo && (b.status === 'completed' || b.status === 'completed_with_errors')
      }) || (completedBatches.length > 0 ? completedBatches[0] : null)

      if (!recentBatch) {
        return
      }

      setIsLoadingReplay(true)
      setReplayBatchName(recentBatch.csv_filename || `${recentBatch.agent_name || 'Agent'} Run`)
      setReplayBatchAgentIcon(recentBatch.agent_icon || null)

      try {
        const supabase = createClient()
        if (!supabase) return

        const { data: results, error } = await supabase
          .from('batch_results')
          .select('input_data, output_data, status')
          .eq('batch_id', recentBatch.id)
          .order('created_at', { ascending: true })
          .limit(15)

        if (error) throw error

        if (!results || results.length === 0) {
          let outputType: string | null = null
          if (recentBatch.agent_id) {
            const { data: agentDef } = await supabase
              .from('agent_definitions')
              .select('output_type')
              .eq('id', recentBatch.agent_id)
              .single()

            outputType = agentDef?.output_type || null
          }

          const resourceTypeMap: Record<string, string> = {
            'leads': 'lead',
            'keywords': 'keyword',
            'content': 'content',
            'campaign': 'campaign',
          }

          const resourceType = outputType ? resourceTypeMap[outputType] : null

          const resourceQuery = supabase
            .from('resources')
            .select('data, type')
            .eq('batch_id', recentBatch.id)
            .order('created_at', { ascending: true })
            .limit(15)

          if (resourceType) {
            resourceQuery.eq('type', resourceType)
          }

          const { data: resources, error: resourcesError } = await resourceQuery

          if (resourcesError) {
            setIsLoadingReplay(false)
            return
          }

          if (resources && resources.length > 0) {
            const transformedRows: DemoRow[] = resources.map((resource, index) => {
              const data = resource.data || {}
              const resourceType = resource.type

              let name = ''
              let description = ''
              let summary = ''

              if (resourceType === 'lead') {
                name = data.name || data.Name || data['Full Name'] || data.email || data.Email || data.company || data.Company || `Lead ${index + 1}`
                description = data.title || data.Title || data.job_title || data.company || data.Company || data.description || ''
                summary = data.summary || data.bio || data.enriched_data?.summary || data.notes || ''
              } else if (resourceType === 'keyword') {
                name = data.keyword || data.Keyword || data.term || data.phrase || `Keyword ${index + 1}`
                description = data.category || data.Category || data.intent || data.search_volume?.toString() || ''
                summary = data.analysis || data.summary || data.recommendations || data.insights || ''
              } else if (resourceType === 'content') {
                name = data.title || data.Title || data.name || data.subject || `Content ${index + 1}`
                description = data.type || data.format || data.category || data.description || ''
                summary = data.content?.substring(0, 200) || data.body?.substring(0, 200) || data.text?.substring(0, 200) || data.summary || ''
              } else if (resourceType === 'campaign') {
                name = data.name || data.Name || data.campaign_name || `Campaign ${index + 1}`
                description = data.type || data.status || data.channel || ''
                summary = data.description || data.summary || data.metrics?.summary || ''
              } else {
                name = data.name || data.Name || data.title || data.id || `Item ${index + 1}`
                description = data.description || data.type || data.category || ''
                summary = data.summary || data.output || data.result || data.analysis || ''
              }

              return {
                id: index + 1,
                name: String(name),
                description: String(description).substring(0, 200),
                summary: String(summary).substring(0, 200),
                status: 'pending' as const
              }
            })

            setReplayRows(transformedRows)
            setIsLoadingReplay(false)
            return
          }

          setIsLoadingReplay(false)
          return
        }

        const transformedRows: DemoRow[] = results.map((result, index) => {
          let input = result.input_data || {}
          let output = result.output_data || {}
          
          try {
            if (typeof result.input_data === 'string') {
              input = JSON.parse(result.input_data)
            }
          } catch {
            input = {}
          }
          
          try {
            if (typeof result.output_data === 'string') {
              output = JSON.parse(result.output_data)
            }
          } catch {
            output = {}
          }

          const inputValues = typeof input === 'object' && input !== null ? Object.values(input) : []
          const firstStringValue = inputValues.find((v: unknown) => typeof v === 'string' && v.length > 0 && v.length < 100) as string | undefined

          const name = input.name || input.Name || input.NAME || input['Full Name'] ||
                      input.subreddit || input.Subreddit || input.title || input.Title ||
                      input.email || input.Email || input.id || input.ID ||
                      firstStringValue ||
                      `Row ${index + 1}`

          const description = input.description || input.Description || input.DESCRIPTION ||
                            input['Job Description'] || input.generated_bio || input.bio ||
                            input.key_themes_identified || input.content || input.text ||
                            input.summary || input.Summary || ''

          const summary = output.summary || output.Summary || output.generated_subreddit_bio ||
                         output.output || output.result || output.generated_content ||
                         (Object.keys(output).length > 0 ? String(output[Object.keys(output)[0]]) : '')

          return {
            id: index + 1,
            name: String(name),
            description: String(description).substring(0, 200),
            summary: String(summary).substring(0, 200),
            status: 'pending' as const
          }
        })

        setReplayRows(transformedRows)
      } catch (error) {
        console.error('Failed to fetch replay data:', error)
        setIsLoadingReplay(false)
      } finally {
        setIsLoadingReplay(false)
      }
    }

    fetchReplayData()
  }, [hasBatches, recentBatches, completedBatches, isLoadingReplay, replayRows.length, demoRows])

  // Replay animation
  const replayAnimationStartedRef = useRef(false)
  const replayRowsRef = useRef<DemoRow[]>([])

  useEffect(() => {
    replayRowsRef.current = replayRows
  }, [replayRows])

  useEffect(() => {
    if (replayRows.length === 0) {
      replayAnimationStartedRef.current = false
      return
    }

    if (replayAnimationStartedRef.current) return
    replayAnimationStartedRef.current = true

    let rowIndex = 0
    let isRunning = true
    let typeInterval: NodeJS.Timeout | null = null
    let processingTimeout: NodeJS.Timeout | null = null
    let nextRowTimeout: NodeJS.Timeout | null = null

    const cleanup = () => {
      if (typeInterval) clearInterval(typeInterval)
      if (processingTimeout) clearTimeout(processingTimeout)
      if (nextRowTimeout) clearTimeout(nextRowTimeout)
    }

    const processNextRow = () => {
      if (!isRunning) return

      const currentRows = replayRowsRef.current
      const currentReplayRowsLength = currentRows.length

      if (rowIndex >= currentReplayRowsLength) {
        cleanup()
        rowIndex = 0
        setReplayRows(prev => prev.map(r => ({ ...r, status: 'completed' as const })))
        setCurrentProcessingRow(null)
        setTypewriterText('')
        setTypewriterRowId(null)
        setThroughput({ rowsPerSecond: 0, tokensUsed: 0 })
        return
      }

      const currentRowIndex = rowIndex
      const row = currentRows[currentRowIndex]
      const summary = row?.summary || ''

      if (!summary || summary.trim() === '') {
        setReplayRows(prev => prev.map(r =>
          r.id === row.id ? { ...r, status: 'completed' as const } : r
        ))
        setCurrentProcessingRow(null)
        rowIndex++
        nextRowTimeout = setTimeout(() => {
          if (isRunning) processNextRow()
        }, 300)
        return
      }

      setCurrentProcessingRow(row.id)
      setReplayRows(prev => prev.map(r =>
        r.id === row.id ? { ...r, status: 'processing' as const } : r
      ))
      setThroughput(prev => ({ rowsPerSecond: 1.2, tokensUsed: prev.tokensUsed + 45 }))

      processingTimeout = setTimeout(() => {
        if (!isRunning) {
          setReplayRows(prev => prev.map(r =>
            r.id === row.id ? { ...r, status: 'completed' as const } : r
          ))
          return
        }

        setTypewriterRowId(row.id)
        setTypewriterText('')

        let charIndex = 0
        typeInterval = setInterval(() => {
          if (!isRunning) {
            if (typeInterval) clearInterval(typeInterval)
            setReplayRows(prev => prev.map(r =>
              r.id === row.id ? { ...r, status: 'completed' as const } : r
            ))
            return
          }

          if (charIndex < summary.length) {
            setTypewriterText(summary.slice(0, charIndex + 1))
            charIndex++
          } else {
            if (typeInterval) {
              clearInterval(typeInterval)
              typeInterval = null
            }
            setReplayRows(prev => prev.map(r =>
              r.id === row.id ? { ...r, status: 'completed' as const, summary: summary } : r
            ))
            setCurrentProcessingRow(null)
            setTypewriterText('')
            setTypewriterRowId(null)
            setThroughput({ rowsPerSecond: 0, tokensUsed: 0 })
            rowIndex++
            nextRowTimeout = setTimeout(() => {
              if (isRunning) processNextRow()
            }, 500)
          }
        }, 15)
      }, 500)
    }

    const startTimer = setTimeout(() => {
      if (isRunning) processNextRow()
    }, 1000)

    return () => {
      isRunning = false
      cleanup()
      clearTimeout(startTimer)
      replayAnimationStartedRef.current = false
    }
  }, [replayRows.length])

  const showReplay = hasBatches && replayRows.length > 0
  const displayRows = showReplay ? replayRows : demoRows

  return (
    <motion.div
      initial={{ opacity: 0, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.998 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="border border-border/80 rounded-xl sm:rounded-2xl overflow-hidden bg-card shadow-2xl"
      >
        {/* Demo Header - Cursor Style */}
        <div className="border-b border-border/50 px-4 sm:px-6 py-2.5 xs:py-2.5 sm:py-3 md:py-3.5 lg:py-4 bg-background/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            {/* Cursor-style traffic light dots */}
            <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
              <div className="h-2.5 w-2.5 rounded-full bg-[#FF5F57] border border-black/10" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E] border border-black/10" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#28C840] border border-black/10" />
            </div>
            <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
              {showReplay && replayBatchAgentIcon && (
                <span className="text-xs sm:text-sm leading-none flex-shrink-0 inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5">{replayBatchAgentIcon}</span>
              )}
              <span className="text-xs sm:text-sm font-medium text-foreground font-mono leading-[1.25] truncate opacity-80">
                {showReplay ? replayBatchName : 'csv-transformation.csv'}
              </span>
              {showReplay && (
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-primary/20 text-primary border border-primary/40 rounded sm:rounded-md text-xs font-medium leading-tight flex-shrink-0 shadow-sm">
                  REPLAY
                </span>
              )}
              {/* Cursor-style activity indicator */}
              {throughput.rowsPerSecond > 0 && currentProcessingRow && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full border-2 border-primary border-t-transparent"
                  />
                  <span className="text-primary font-mono">Processing...</span>
                </motion.div>
              )}
            </div>
          </div>
          {throughput.rowsPerSecond > 0 && currentProcessingRow && (
            <div className="flex items-center gap-2 sm:gap-4 text-xs text-muted-foreground font-mono flex-shrink-0">
              <span className="tabular-nums">{throughput.rowsPerSecond.toFixed(1)} rows/sec</span>
              <span className="tabular-nums hidden sm:inline">{throughput.tokensUsed} tokens</span>
            </div>
          )}
        </div>

        {/* CSV Table */}
        <div className="p-4 sm:p-6">
          <div className="mb-3 sm:mb-4">
            <div className="text-xs text-muted-foreground/80 font-semibold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0">
              <span className="uppercase tracking-wider">Input CSV</span>
              {throughput.rowsPerSecond > 0 && currentProcessingRow && (
                <span className="text-primary text-xs font-mono tabular-nums">Processing row {currentProcessingRow}...</span>
              )}
            </div>
          </div>

          <div className="border border-border/35 rounded-lg sm:rounded-md overflow-x-auto bg-background/50">
            {/* Header Row */}
            <div className="grid grid-cols-[100px_1fr_1fr] sm:grid-cols-[140px_1fr_1fr] bg-secondary/12 border-b border-border/30 min-w-[600px]">
              <div className="px-3 sm:px-5 py-3 sm:py-4 text-xs font-semibold text-muted-foreground border-r border-border/30 uppercase tracking-wider leading-[1.25]">name</div>
              <div className="px-3 sm:px-5 py-3 sm:py-4 text-xs font-semibold text-muted-foreground border-r border-border/30 uppercase tracking-wider leading-[1.25]">description</div>
              <div className="px-3 sm:px-5 py-3 sm:py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-[1.25]">summary</div>
            </div>

            {/* Data Rows */}
            <div className="bg-background">
              <AnimatePresence>
                {displayRows.slice(0, 4).map((row, index) => {
                  const totalRows = Math.min(displayRows.length, 4)
                  const maxLines = totalRows === 1 ? 8 : totalRows === 2 ? 6 : totalRows === 3 ? 4 : 3

                  return (
                    <DataRow
                      key={row.id}
                      row={row}
                      index={index}
                      maxLines={maxLines}
                      typewriterText={typewriterText}
                      typewriterRowId={typewriterRowId}
                      currentProcessingRow={currentProcessingRow}
                    />
                  )
                })}
              </AnimatePresence>

              {displayRows.length > 4 && (
                <div className="px-3 sm:px-5 py-2.5 sm:py-3.5 text-center text-xs text-muted-foreground border-t border-border/35 bg-secondary/12 uppercase tracking-wider min-w-[600px]">
                  +{displayRows.length - 4} more rows
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
