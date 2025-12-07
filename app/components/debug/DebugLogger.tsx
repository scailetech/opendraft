/**
 * ABOUTME: Real-time debug logger component for visualizing bulk processing flow
 * ABOUTME: Shows API calls, responses, timings, and errors in an expandable panel
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChevronDown, ChevronUp, Copy, Trash2, Filter } from 'lucide-react'

export type LogLevel = 'info' | 'warn' | 'error' | 'success'

export interface LogEntry {
  id: string
  timestamp: number
  level: LogLevel
  message: string
  data?: unknown
}

interface DebugLoggerProps {
  maxLogs?: number
}

const LOG_STORAGE_KEY = 'bulk-run-debug-logs'

export function DebugLogger({ maxLogs = 100 }: DebugLoggerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'all'>('all')
  const [isMounted, setIsMounted] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Only render on client to avoid hydration errors
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Load logs from localStorage on mount (only on client)
  useEffect(() => {
    if (!isMounted) return
    
    const stored = localStorage.getItem(LOG_STORAGE_KEY)
    if (stored) {
      try {
        setLogs(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to parse stored logs:', e)
      }
    }
  }, [isMounted])

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (isExpanded && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, isExpanded])

  // Listen for custom log events
  useEffect(() => {
    const handleLog = (event: CustomEvent<LogEntry>) => {
      setLogs((prev) => {
        const newLogs = [...prev, event.detail].slice(-maxLogs)
        localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(newLogs))
        return newLogs
      })
    }

    window.addEventListener('debug-log', handleLog as EventListener)
    return () => window.removeEventListener('debug-log', handleLog as EventListener)
  }, [maxLogs])

  const filteredLogs = filterLevel === 'all'
    ? logs
    : logs.filter(log => log.level === filterLevel)

  const copyLogs = async () => {
    const text = filteredLogs.map(log => {
      const time = new Date(log.timestamp).toISOString()
      const data = log.data ? `\n${JSON.stringify(log.data, null, 2)}` : ''
      return `[${time}] [${log.level.toUpperCase()}] ${log.message}${data}`
    }).join('\n\n')

    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy logs:', err)
    }
  }

  const clearLogs = () => {
    setLogs([])
    localStorage.removeItem(LOG_STORAGE_KEY)
  }

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'info': return 'text-blue-600 dark:text-blue-400'
      case 'warn': return 'text-yellow-600 dark:text-yellow-400'
      case 'error': return 'text-red-600 dark:text-red-400'
      case 'success': return 'text-green-600 dark:text-green-400'
    }
  }

  const getLevelBg = (level: LogLevel) => {
    switch (level) {
      case 'info': return 'bg-blue-50 dark:bg-blue-950'
      case 'warn': return 'bg-yellow-50 dark:bg-yellow-950'
      case 'error': return 'bg-red-50 dark:bg-red-950'
      case 'success': return 'bg-green-50 dark:bg-green-950'
    }
  }

  // Don't render until mounted to avoid hydration errors
  if (!isMounted) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]">
      <Card className="shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 p-3 border-b">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Debug Logger</span>
            <span className="text-xs text-muted-foreground">
              ({filteredLogs.length} logs)
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyLogs}
              disabled={filteredLogs.length === 0}
              className="h-8 w-8 p-0"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearLogs}
              disabled={logs.length === 0}
              className="h-8 w-8 p-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        {isExpanded && (
          <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground mr-2">Filter:</span>
            {(['all', 'info', 'warn', 'error', 'success'] as const).map((level) => (
              <Button
                key={level}
                variant={filterLevel === level ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilterLevel(level)}
                className="h-6 px-2 text-xs"
              >
                {level}
              </Button>
            ))}
          </div>
        )}

        {/* Logs */}
        {isExpanded && (
          <div className="max-h-96 overflow-y-auto p-2 space-y-1">
            {filteredLogs.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                No logs yet
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`text-xs p-2 rounded ${getLevelBg(log.level)}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`font-semibold uppercase ${getLevelColor(log.level)}`}>
                      {log.level}
                    </span>
                  </div>
                  <div className="mt-1 break-words">{log.message}</div>
                  {log.data !== undefined && (
                    <pre className="mt-1 text-xs bg-black/5 dark:bg-white/5 p-1 rounded overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        )}
      </Card>
    </div>
  )
}
