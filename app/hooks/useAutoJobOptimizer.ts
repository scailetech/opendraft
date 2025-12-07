/**
 * ABOUTME: Auto-optimize job prompts using AI to improve clarity and detect output columns
 * ABOUTME: Triggers automatically with debounce when user enters or changes prompts
 *
 * Usage:
 * ```tsx
 * const { optimizedPrompt, outputColumns, reasoning, isOptimizing, error } =
 *   useAutoJobOptimizer(prompt, csvColumns)
 *
 * // Show optimized version in preview UI
 * {optimizedPrompt && <JobPreview prompt={optimizedPrompt} columns={outputColumns} />}
 * ```
 */

import { useEffect, useState } from 'react'
import { useDebounce } from './useDebounce'

/**
 * Output column structure from API
 */
export interface OutputColumn {
  name: string
  description: string
}

/**
 * Optimization result from API
 */
export interface OptimizationResult {
  optimizedPrompt: string
  outputColumns: OutputColumn[]
  reasoning: string
}

/**
 * Hook return type
 */
export interface UseAutoJobOptimizerResult {
  optimizedPrompt: string | null
  outputColumns: OutputColumn[]
  reasoning: string | null
  isOptimizing: boolean
  error: string | null
}

/**
 * Auto-optimize job prompts using AI
 *
 * @param prompt - User's raw prompt with {{variables}}
 * @param csvColumns - Available CSV column names
 * @returns Optimization result with loading and error states
 */
export function useAutoJobOptimizer(
  prompt: string,
  csvColumns: string[]
): UseAutoJobOptimizerResult {
  const [optimizedPrompt, setOptimizedPrompt] = useState<string | null>(null)
  const [outputColumns, setOutputColumns] = useState<OutputColumn[]>([])
  const [reasoning, setReasoning] = useState<string | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounce prompt to avoid excessive API calls while user is typing
  const debouncedPrompt = useDebounce(prompt, 500)

  useEffect(() => {
    // Skip if no prompt or no CSV columns available
    if (!debouncedPrompt || !csvColumns || csvColumns.length === 0) {
      setOptimizedPrompt(null)
      setOutputColumns([])
      setReasoning(null)
      setError(null)
      return
    }

    // Skip if prompt is too short (less than 5 characters)
    if (debouncedPrompt.trim().length < 5) {
      return
    }

    const optimizeJob = async () => {
      setIsOptimizing(true)
      setError(null)

      try {
        const response = await fetch('/api/optimize-job', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: debouncedPrompt,
            csvColumns,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))

          // If API returns fallback flag, silently fail (don't show error to user)
          if (errorData.fallback) {
            setOptimizedPrompt(null)
            setOutputColumns([])
            setReasoning(null)
            return
          }

          throw new Error(errorData.message || 'Optimization failed')
        }

        const result: OptimizationResult = await response.json()

        setOptimizedPrompt(result.optimizedPrompt)
        setOutputColumns(result.outputColumns)
        setReasoning(result.reasoning)
      } catch (err) {
        console.error('Auto-optimization error:', err)
        setError(err instanceof Error ? err.message : 'Optimization failed')
        setOptimizedPrompt(null)
        setOutputColumns([])
        setReasoning(null)
      } finally {
        setIsOptimizing(false)
      }
    }

    optimizeJob()
  }, [debouncedPrompt, csvColumns])

  return {
    optimizedPrompt,
    outputColumns,
    reasoning,
    isOptimizing,
    error,
  }
}
