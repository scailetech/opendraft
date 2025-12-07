/**
 * ABOUTME: Manual AI job optimizer - user triggers optimization with a button
 * ABOUTME: Allows editing optimized prompts and explicit acceptance before use
 * ABOUTME: Suggests relevant GTM tools based on the prompt
 */

import { useState, useCallback } from 'react'

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
  optimizedPrompt?: string
  outputColumns?: OutputColumn[]
  suggestedTools?: string[]
  suggestedInputColumns?: string[]
  reasoning: string
}

/**
 * Hook return type
 */
export interface UseManualJobOptimizerResult {
  optimizedPrompt: string | null
  setOptimizedPrompt: (prompt: string | null) => void
  outputColumns: OutputColumn[]
  suggestedTools: string[]
  suggestedInputColumns: string[]
  reasoning: string | null
  isOptimizing: boolean
  error: string | null
  triggerOptimization: (options?: {
    optimizeInput?: boolean
    optimizeTask?: boolean
    optimizeOutput?: boolean
    selectedInputColumns?: string[]
    sampleRows?: Array<Record<string, string>>
  }) => void
  clearOptimization: () => void
}

/**
 * Manual job optimizer - user controls when optimization happens
 *
 * @param prompt - User's raw prompt with {{variables}}
 * @param csvColumns - Available CSV column names
 * @param sampleRows - Sample CSV rows (first few rows) to help AI understand data content
 * @returns Optimization controls and results
 */
export function useManualJobOptimizer(
  prompt: string,
  csvColumns: string[],
  sampleRows?: Array<Record<string, string>>
): UseManualJobOptimizerResult {
  const [optimizedPrompt, setOptimizedPrompt] = useState<string | null>(null)
  const [outputColumns, setOutputColumns] = useState<OutputColumn[]>([])
  const [suggestedTools, setSuggestedTools] = useState<string[]>([])
  const [suggestedInputColumns, setSuggestedInputColumns] = useState<string[]>([])
  const [reasoning, setReasoning] = useState<string | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const triggerOptimization = useCallback(async (options?: {
    optimizeInput?: boolean
    optimizeTask?: boolean
    optimizeOutput?: boolean
    selectedInputColumns?: string[]
    sampleRows?: Array<Record<string, string>>
  }) => {
    // Skip if no prompt or no CSV columns available
    if (!prompt || !csvColumns || csvColumns.length === 0) {
      setError('Please enter a prompt and upload a CSV file first')
      return
    }

    // Skip if prompt is too short (less than 5 characters) and optimizing task
    if (options?.optimizeTask !== false && prompt.trim().length < 5) {
      setError('Prompt is too short. Please enter a more detailed prompt.')
      return
    }

    setIsOptimizing(true)
    setError(null)

    try {
      const response = await fetch('/api/optimize-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          csvColumns,
          sampleRows: options?.sampleRows || sampleRows || [],
          optimizeInput: options?.optimizeInput ?? false,
          optimizeTask: options?.optimizeTask ?? false,
          optimizeOutput: options?.optimizeOutput ?? false,
          selectedInputColumns: options?.selectedInputColumns || csvColumns,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // Show specific error message
        const errorMessage = errorData.message || errorData.error || 'Optimization failed'
        throw new Error(errorMessage)
      }

      const result: OptimizationResult = await response.json()

      if (result.optimizedPrompt) setOptimizedPrompt(result.optimizedPrompt)
      if (result.outputColumns) setOutputColumns(result.outputColumns)
      if (result.suggestedTools) setSuggestedTools(result.suggestedTools)
      if (result.suggestedInputColumns) setSuggestedInputColumns(result.suggestedInputColumns)
      setReasoning(result.reasoning)
    } catch (err) {
      console.error('Optimization error:', err)
      setError(err instanceof Error ? err.message : 'Optimization failed')
      setOptimizedPrompt(null)
      setOutputColumns([])
      setSuggestedTools([])
      setSuggestedInputColumns([])
      setReasoning(null)
    } finally {
      setIsOptimizing(false)
    }
  }, [prompt, csvColumns, sampleRows])

  const clearOptimization = useCallback(() => {
    setOptimizedPrompt(null)
    setOutputColumns([])
    setSuggestedTools([])
    setSuggestedInputColumns([])
    setReasoning(null)
    setError(null)
  }, [])

  return {
    optimizedPrompt,
    setOptimizedPrompt,
    outputColumns,
    suggestedTools,
    suggestedInputColumns,
    reasoning,
    isOptimizing,
    error,
    triggerOptimization,
    clearOptimization,
  }
}
