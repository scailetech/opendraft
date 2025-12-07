/**
 * ABOUTME: Custom hook for persisting job configuration to localStorage
 * ABOUTME: Saves prompt, output fields, tools, and other job settings
 * ABOUTME: Restores context when user returns to /agents page
 */

import { useState, useCallback, useEffect } from 'react'

export interface JobContext {
  prompt: string
  outputFields: string[]
  selectedTools: string[]
  selectedInputColumns: string[]
  optimizeInput: boolean
  optimizeTask: boolean
  optimizeOutput: boolean
  csvFilename?: string
  csvColumnCount?: number
  googleSheetsUrl?: string
  googleSheetsId?: string
  inputSource?: 'csv' | 'google_sheets'
  savedAt: number
}

const STORAGE_KEY = 'bulk-gpt-job-context'

const DEFAULT_CONTEXT: Omit<JobContext, 'savedAt'> = {
  prompt: 'Write a bio for {{name}} at {{company}}',
  outputFields: ['bio'],
  selectedTools: [],
  selectedInputColumns: [],
  optimizeInput: true,
  optimizeTask: true,
  optimizeOutput: true,
}

export interface UseJobContextReturn {
  context: JobContext | null
  saveContext: (updates: Partial<Omit<JobContext, 'savedAt'>>) => void
  loadContext: () => JobContext | null
  clearContext: () => void
  restoreContext: (csvFilename?: string, csvColumnCount?: number) => Partial<Omit<JobContext, 'savedAt'>>
}

/**
 * Manages job configuration persistence to localStorage
 * 
 * Automatically saves context changes and provides restoration logic
 * SSR-safe with graceful fallbacks
 * 
 * @returns Context management functions
 * 
 * @example
 * const { saveContext, restoreContext, clearContext } = useJobContext()
 * 
 * // Save context when state changes
 * saveContext({ prompt: 'New prompt', selectedTools: ['web-search'] })
 * 
 * // Restore context on mount
 * const restored = restoreContext(fileUpload.file?.name, csvParser.csvData?.columns.length)
 */
export function useJobContext(): UseJobContextReturn {
  const [context, setContext] = useState<JobContext | null>(null)

  // Load context from localStorage on mount (SSR-safe)
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as JobContext
        // Validate structure
        if (parsed && typeof parsed === 'object' && 'prompt' in parsed) {
          setContext(parsed)
        }
      }
    } catch (error) {
      // Corrupted data or localStorage disabled - silently fail
      console.debug('Failed to load job context from localStorage:', error)
    }
  }, [])

  // Save context to localStorage
  const saveContext = useCallback((updates: Partial<Omit<JobContext, 'savedAt'>>) => {
    if (typeof window === 'undefined') return

    try {
      const currentContext = context || {
        ...DEFAULT_CONTEXT,
        savedAt: Date.now(),
      } as JobContext

      const updated: JobContext = {
        ...currentContext,
        ...updates,
        savedAt: Date.now(),
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      setContext(updated)
    } catch (error) {
      // LocalStorage might be disabled or full - silently fail
      console.debug('Failed to save job context to localStorage:', error)
    }
  }, [context])

  // Load context from localStorage
  const loadContext = useCallback((): JobContext | null => {
    if (typeof window === 'undefined') return null

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as JobContext
        if (parsed && typeof parsed === 'object' && 'prompt' in parsed) {
          return parsed
        }
      }
    } catch (error) {
      console.debug('Failed to load job context:', error)
    }

    return null
  }, [])

  // Clear context from localStorage
  const clearContext = useCallback(() => {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(STORAGE_KEY)
      setContext(null)
    } catch (error) {
      console.debug('Failed to clear job context:', error)
    }
  }, [])

  // Restore context with CSV validation
  const restoreContext = useCallback(
    (csvFilename?: string, csvColumnCount?: number): Partial<Omit<JobContext, 'savedAt'>> => {
      const saved = loadContext()
      if (!saved) {
        return {}
      }

      // Always restore: prompt, outputFields, selectedTools, optimization flags
      const restored: Partial<Omit<JobContext, 'savedAt'>> = {
        prompt: saved.prompt,
        outputFields: saved.outputFields,
        selectedTools: saved.selectedTools,
        optimizeInput: saved.optimizeInput,
        optimizeTask: saved.optimizeTask,
        optimizeOutput: saved.optimizeOutput,
      }

      // Only restore selectedInputColumns if CSV matches
      if (
        csvFilename &&
        csvColumnCount &&
        saved.csvFilename === csvFilename &&
        saved.csvColumnCount === csvColumnCount
      ) {
        restored.selectedInputColumns = saved.selectedInputColumns
      }
      // If CSV doesn't match or not uploaded yet, don't restore selectedInputColumns
      // Let existing logic handle it (defaults to all columns)

      return restored
    },
    [loadContext]
  )

  return {
    context,
    saveContext,
    loadContext,
    clearContext,
    restoreContext,
  }
}

