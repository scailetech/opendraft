/**
 * ABOUTME: React hook for easy debug logging throughout the application
 * ABOUTME: Dispatches custom events that the DebugLogger component listens to
 */

'use client'

import { useCallback } from 'react'
import type { LogLevel, LogEntry } from '@/components/debug/DebugLogger'

let logCounter = 0

export function useDebugLogger() {
  const log = useCallback((level: LogLevel, message: string, data?: unknown) => {
    const entry: LogEntry = {
      id: `log_${Date.now()}_${logCounter++}`,
      timestamp: Date.now(),
      level,
      message,
      data
    }

    // Dispatch custom event for DebugLogger to catch
    window.dispatchEvent(new CustomEvent('debug-log', { detail: entry }))

    // Also console log for development
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
    console[consoleMethod](`[DEBUG ${level.toUpperCase()}]`, message, data || '')
  }, [])

  const info = useCallback((message: string, data?: unknown) => {
    log('info', message, data)
  }, [log])

  const warn = useCallback((message: string, data?: unknown) => {
    log('warn', message, data)
  }, [log])

  const error = useCallback((message: string, data?: unknown) => {
    log('error', message, data)
  }, [log])

  const success = useCallback((message: string, data?: unknown) => {
    log('success', message, data)
  }, [log])

  return { log, info, warn, error, success }
}
