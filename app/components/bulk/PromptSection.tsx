'use client'

import { useState, useMemo, useRef, useCallback, memo } from 'react'
import { HelpCircle, Eye, EyeOff } from 'lucide-react'
import type { ParsedCSV } from '@/lib/types'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useContextStorage } from '@/hooks/useContextStorage'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface PromptSectionProps {
  prompt: string
  onPromptChange: (value: string) => void
  csvData: ParsedCSV | null
  selectedInputColumns?: string[]
  variableValidation?: {
    missing: string[]
    isValid: boolean
    suggestions?: Record<string, string>
  }
}

export const PromptSection = memo(function PromptSection({
  prompt,
  onPromptChange,
  csvData,
  selectedInputColumns = [],
  variableValidation
}: PromptSectionProps) {
  const [previewMode, setPreviewMode] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const { context } = useContextStorage()
  const errorMessageId = 'prompt-error-message'

  // Sync overlay scroll with textarea scroll
  const handleTextareaScroll = useCallback(() => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }, [])

  // Filter available columns based on selectedInputColumns
  const availableColumns = useMemo(() => {
    if (!csvData) return []
    if (selectedInputColumns.length === 0) return csvData.columns
    return csvData.columns.filter(col => selectedInputColumns.includes(col))
  }, [csvData, selectedInputColumns])

  // Extract variables from prompt (trimmed and normalized)
  const promptVariables = useMemo(() => {
    if (!prompt) return []
    const variablePattern = /\{\{([^}]+)\}\}/g
    const matches = Array.from(prompt.matchAll(variablePattern))
    // Trim each variable name to handle whitespace in {{  name  }}
    return Array.from(new Set(matches.map(m => m[1].trim())))
  }, [prompt])

  // Helper: case-insensitive variable matching with trimming
  const matchesVariable = useCallback((promptVar: string, colName: string) => {
    return promptVar.toLowerCase().trim() === colName.toLowerCase().trim()
  }, [])

  // Get context variable names that are set
  const contextVariableNames = useMemo(() => {
    const names: string[] = []
    if (context.tone) names.push('context.tone')
    if (context.targetCountries) names.push('context.targetCountries')
    if (context.productDescription) names.push('context.productDescription')
    if (context.competitors) names.push('context.competitors')
    if (context.targetIndustries) names.push('context.targetIndustries')
    if (context.complianceFlags) names.push('context.complianceFlags')
    return names
  }, [context])

  // Fill variables with first row data and context variables
  const filledPrompt = useMemo(() => {
    if (!prompt) return prompt
    
    let filled = prompt
    
    // Helper to escape regex special characters in column names
    // Prevents regex injection when column name contains $()*+.?[\]^{|}
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    
    // Fill CSV variables (case-insensitive with whitespace tolerance)
    if (csvData && csvData.rows.length > 0) {
      availableColumns.forEach(col => {
        const value = csvData.rows[0].data[col] || ''
        const escapedCol = escapeRegex(col.trim())
        // Case-insensitive match with optional whitespace around variable name
        const pattern = new RegExp(`\\{\\{\\s*${escapedCol}\\s*\\}\\}`, 'gi')
        filled = filled.replace(pattern, value)
      })
    }
    
    // Fill context variables
    const contextMap: Record<string, string> = {
      'context.tone': context.tone || '',
      'context.targetCountries': context.targetCountries || '',
      'context.productDescription': context.productDescription || '',
      'context.competitors': context.competitors || '',
      'context.targetIndustries': context.targetIndustries || '',
      'context.complianceFlags': context.complianceFlags || '',
    }
    
    Object.entries(contextMap).forEach(([varName, value]) => {
      if (value) {
        const escapedVar = escapeRegex(varName)
        // Case-insensitive match with optional whitespace
        const pattern = new RegExp(`\\{\\{\\s*${escapedVar}\\s*\\}\\}`, 'gi')
        filled = filled.replace(pattern, value)
      }
    })
    
    return filled
  }, [prompt, csvData, availableColumns, context])

  // Highlighted HTML for preview mode (highlight filled values)
  const highlightedFilledPrompt = useMemo(() => {
    if (!previewMode || !prompt) return ''
    
    // If no CSV data and no context values, return empty
    const hasData = (csvData && csvData.rows.length > 0) || Object.values(context).some(v => v && v.trim())
    if (!hasData) return ''
    
    // In preview mode, we want to highlight the filled values
    let result = filledPrompt
    
    // Escape HTML first
    result = result
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    
    // Find original variables in prompt
    const variablePattern = /\{\{([^}]+)\}\}/g
    const matches = Array.from(prompt.matchAll(variablePattern))
    
    // Sort by position (reverse order to avoid index shifting)
    const sortedMatches = matches.sort((a, b) => (b.index || 0) - (a.index || 0))
    
    // Replace filled values with highlighted versions
    sortedMatches.forEach(match => {
      const variableName = match[1].trim()
      const isContextVar = variableName.startsWith('context.')
      const isMissing = (variableValidation?.missing || []).some(m => m.toLowerCase().trim() === variableName.toLowerCase().trim())
      const isValid = availableColumns.some(col => col.toLowerCase().trim() === variableName.toLowerCase().trim())
      
      if (isContextVar) {
        // Context variable - find the filled value
        const contextKey = variableName.replace('context.', '')
        const contextValue = context[contextKey as keyof typeof context] as string | undefined
        
        if (contextValue && contextValue.trim()) {
          // Escape and highlight the filled context value in blue
          const escapedValue = contextValue
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
          const highlighted = `<span class="text-blue-400 font-medium">${escapedValue}</span>`
          // Replace all occurrences of this value (but be careful with partial matches)
          result = result.replace(new RegExp(escapedValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), highlighted)
        } else {
          // Context variable not set - keep placeholder in red
          const escapedVar = match[0]
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
          const highlighted = `<span class="text-red-400">${escapedVar}</span>`
          result = result.replace(match[0], highlighted)
        }
      } else if (isValid && csvData?.rows[0]) {
        const value = csvData.rows[0].data[variableName] || ''
        if (value) {
          // Escape the value for HTML
          const escapedValue = value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
          const colorClass = 'text-green-400 font-medium'
          const highlighted = `<span class="${colorClass}">${escapedValue}</span>`
          // Replace the first occurrence (be careful with partial matches)
          const regex = new RegExp(escapedValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
          result = result.replace(regex, highlighted)
        }
      } else if (isMissing) {
        // Keep the variable placeholder highlighted in red
        const escapedVar = match[0]
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
        const colorClass = 'text-red-400'
        const highlighted = `<span class="${colorClass}">${escapedVar}</span>`
        result = result.replace(match[0], highlighted)
      }
    })
    
    // Convert newlines to <br>
    return result.replace(/\n/g, '<br>')
  }, [previewMode, filledPrompt, prompt, csvData, availableColumns, variableValidation?.missing, context])

  // Check if preview is available (has CSV data or context variables that can be filled)
  const hasPreview = prompt && (
    (csvData && csvData.rows.length > 0) || 
    Object.values(context).some(v => v && v.trim())
  ) && filledPrompt !== prompt

  // Highlighted HTML for edit mode (highlight {{variables}} with colors)
  const highlightedEditPrompt = useMemo(() => {
    if (!prompt) return ''
    
    // Escape HTML first
    let result = prompt
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    
    // Highlight all {{variables}} with appropriate colors
    result = result.replace(/\{\{([^}]+)\}\}/g, (_match, varName) => {
      const trimmedVar = varName.trim()
      const isContextVar = trimmedVar.startsWith('context.')
      const isMissing = (variableValidation?.missing || []).some(m => m.toLowerCase().trim() === trimmedVar.toLowerCase())
      const isValid = availableColumns.some(col => col.toLowerCase().trim() === trimmedVar.toLowerCase())
      
      let colorClass = 'text-muted-foreground' // default
      
      if (isMissing) {
        colorClass = 'text-red-400' // missing/invalid variable
      } else if (isContextVar) {
        const contextKey = trimmedVar.replace('context.', '')
        const hasValue = !!(context[contextKey as keyof typeof context] as string | undefined)
        colorClass = hasValue ? 'text-blue-400' : 'text-red-400'
      } else if (isValid) {
        colorClass = 'text-green-400' // valid CSV variable
      }
      
      return `<span class="${colorClass} font-medium">{{${varName}}}</span>`
    })
    
    // Convert newlines to <br>
    return result.replace(/\n/g, '<br>')
  }, [prompt, availableColumns, variableValidation?.missing, context])

  // Insert variable at cursor position
  const insertVariable = useCallback((variableName: string) => {
    if (previewMode) return
    
    const textarea = textareaRef.current
    if (!textarea) return
    
    const variable = `{{${variableName}}}`
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const textBefore = prompt.substring(0, start)
    const textAfter = prompt.substring(end)
    const newPrompt = textBefore + variable + textAfter
    
    onPromptChange(newPrompt)
    
    // Set cursor position after inserted variable
    setTimeout(() => {
      if (textarea) {
        const newCursorPos = start + variable.length
        textarea.setSelectionRange(newCursorPos, newCursorPos)
        textarea.focus()
      }
    }, 0)
  }, [prompt, previewMode, onPromptChange])

  // Check if context variable is used in prompt (case-insensitive)
  const isContextVariableUsed = useCallback((varName: string) => {
    return promptVariables.some(v => v.toLowerCase().trim() === varName.toLowerCase().trim())
  }, [promptVariables])


  // Fallback for preview mode when highlightedFilledPrompt is empty
  const previewContent = useMemo(() => {
    if (highlightedFilledPrompt) return highlightedFilledPrompt
    // Fallback: escape HTML and convert newlines
    return filledPrompt
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
  }, [filledPrompt, highlightedFilledPrompt])

  return (
    <div className="space-y-4 px-4 sm:px-6 py-4 sm:py-5">
      {/* Header with help and action buttons */}
      <TooltipProvider delayDuration={300}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-accent/50"
                  aria-label="Learn about writing prompts and using variables"
                >
                  <HelpCircle className="h-4 w-4 cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <div className="space-y-1.5 text-xs">
                  <p className="font-medium">Writing Your Prompt</p>
                  <p className="text-muted-foreground">
                    Write your prompt below. Click variables in the &quot;Available Variables&quot; section to insert them.
                  </p>
                  <p className="text-muted-foreground mt-2 pt-2 border-t border-border">
                    <strong>Variable Syntax:</strong> Use <span className="font-mono text-primary">{'{{column_name}}'}</span> to reference CSV columns.
                  </p>
                  <p className="text-muted-foreground mt-1">
                    <strong>Example:</strong> <span className="font-mono">{'{{name}}'}</span> will be replaced with the value from the &quot;name&quot; column.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
            <span
              className={cn(
                "tabular-nums text-xs font-medium px-2 py-1 rounded-md bg-muted/50 border border-border/50",
                prompt.length >= 8000 && prompt.length < 10000 && "text-yellow-500 border-yellow-500/30 bg-yellow-500/10",
                prompt.length >= 10000 && "text-red-500 border-red-500/30 bg-red-500/10"
              )}
            >
              {prompt.length.toLocaleString()}/10,000
            </span>
          </div>
        </div>
      </TooltipProvider>

      {/* Textarea with syntax highlighting */}
      <div className="relative bg-secondary/30 rounded-lg border border-border/50 p-1 transition-all hover:border-border focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/10">
        {previewMode ? (
          /* Preview mode - scrollable div with highlighted content */
          <div
            className={cn(
              "w-full min-h-[120px] sm:min-h-[140px] max-h-[400px] bg-transparent border border-transparent font-mono resize-y overflow-auto text-sm text-foreground",
              "px-3 py-2 sm:px-4 sm:py-3 rounded-md whitespace-pre-wrap break-words"
            )}
            style={{ resize: 'vertical' }}
            dangerouslySetInnerHTML={{ __html: previewContent }}
          />
        ) : (
          /* Edit mode - textarea with highlight overlay for variables */
          <div className="relative">
            {/* Highlight overlay for edit mode - shows colored variables */}
            <div
              ref={overlayRef}
              className={cn(
                "absolute inset-0 w-full min-h-[120px] sm:min-h-[140px] max-h-[400px] bg-transparent border border-transparent font-mono overflow-auto pointer-events-none text-sm",
                "px-3 py-2 sm:px-4 sm:py-3 rounded-md whitespace-pre-wrap break-words"
              )}
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: highlightedEditPrompt }}
            />
            {/* Actual textarea - transparent text so highlight shows through */}
            <Textarea
              ref={textareaRef}
              id="prompt"
              value={prompt}
              onChange={(e) => {
                // Limit to 10,000 characters
                const value = e.target.value.slice(0, 10000)
                onPromptChange(value)
              }}
              onScroll={handleTextareaScroll}
              maxLength={10000}
              className={cn(
                "w-full min-h-[120px] sm:min-h-[140px] max-h-[400px] bg-transparent border font-mono resize-y text-sm overflow-auto",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-border",
                "caret-foreground transition-colors text-transparent",
                "px-3 py-2 sm:px-4 sm:py-3",
                "selection:bg-primary/30 selection:text-transparent",
                variableValidation && !variableValidation.isValid && "border-red-500/50",
                prompt.length >= 10000 && "border-yellow-500/50",
                prompt.length >= 8000 && prompt.length < 10000 && "border-yellow-500/30"
              )}
              placeholder="Write a bio for {{name}} at {{company}}"
              data-testid="prompt-textarea"
              aria-invalid={variableValidation && !variableValidation.isValid}
              aria-describedby={variableValidation && !variableValidation.isValid ? errorMessageId : undefined}
              onBlur={() => {
                // Trigger validation feedback on blur
                if (variableValidation && !variableValidation.isValid) {
                  // Ensure error message is visible
                  const errorElement = document.getElementById(errorMessageId)
                  if (errorElement) {
                    errorElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                  }
                }
              }}
            />
          </div>
        )}
        
        {/* Preview Mode Toggle and Validation Status */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
          {/* Real-time validation indicator */}
          {prompt && variableValidation && (
            <div 
              className={cn(
                "flex items-center justify-center h-6 w-6 rounded-md transition-colors",
                variableValidation.isValid 
                  ? "bg-green-500/15" 
                  : "bg-red-500/15"
              )}
              title={variableValidation.isValid ? 'All variables valid' : `${variableValidation.missing.length} missing variable(s)`}
            >
              <div 
                className={cn(
                  "h-2 w-2 rounded-full",
                  variableValidation.isValid 
                    ? "bg-green-500" 
                    : "bg-red-500"
                )} 
                aria-hidden="true" 
              />
            </div>
          )}
          {hasPreview && (
            <button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              className={cn(
                "flex items-center justify-center h-6 w-6 rounded-md transition-colors",
                previewMode 
                  ? "bg-primary/15 text-primary" 
                  : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title={previewMode ? 'Exit preview (edit mode)' : 'Preview with sample data'}
              aria-label={previewMode ? 'Exit preview mode' : 'Preview prompt with sample data'}
            >
              {previewMode ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error Message for missing variables with suggestions */}
      {variableValidation && !variableValidation.isValid && variableValidation.missing.length > 0 && (
        <div
          id={errorMessageId}
          className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded text-xs"
          role="alert"
        >
          <div className="text-red-400 font-medium mb-2">
            Missing variables: {variableValidation.missing.map(v => `{{${v}}}`).join(', ')}
          </div>
          {/* Show suggestions if any */}
          {variableValidation.suggestions && Object.keys(variableValidation.suggestions).length > 0 && (
            <div className="space-y-1.5">
              {variableValidation.missing.map(missingVar => {
                const suggestion = variableValidation.suggestions?.[missingVar]
                if (!suggestion) return null
                return (
                  <div key={missingVar} className="flex items-center gap-2 text-amber-400">
                    <span>Did you mean <code className="bg-amber-500/20 px-1 rounded">{`{{${suggestion}}}`}</code>?</span>
                    <button
                      type="button"
                      onClick={() => {
                        // Replace the incorrect variable with the suggested one
                        const newPrompt = prompt.replace(
                          new RegExp(`\\{\\{${missingVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g'),
                          `{{${suggestion}}}`
                        )
                        onPromptChange(newPrompt)
                      }}
                      className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 rounded text-amber-300 transition-colors"
                    >
                      Fix it
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Variables section */}
      <div className="text-xs pt-1">
        {(csvData || contextVariableNames.length > 0) && (
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground text-xs font-medium">Variables:</span>
              
              {/* CSV Variables */}
              {csvData && csvData.rows.length > 0 && availableColumns.map(col => {
                const isUsedInPrompt = promptVariables.some(v => matchesVariable(v, col))
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => insertVariable(col.trim())}
                    disabled={previewMode}
                    className={cn(
                      "font-mono text-xs px-1.5 py-0.5 rounded transition-colors cursor-pointer",
                      "hover:opacity-80 active:scale-95",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                      "max-w-[200px] truncate",
                      // Highlight in green when used in prompt, grey otherwise
                      isUsedInPrompt
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                        : 'bg-muted/50 text-muted-foreground border border-border hover:bg-muted/70'
                    )}
                    title={`{{${col.trim()}}}`}
                    aria-label={`Insert variable ${col.trim()} into prompt`}
                  >
                    {`{{${col.trim()}}}`}
                  </button>
                )
              })}
                  
              {/* Context Variables */}
              {contextVariableNames.length > 0 && (
                <>
                  {csvData && csvData.rows.length > 0 && availableColumns.length > 0 && (
                    <span className="text-muted-foreground/50 mx-1">•</span>
                  )}
                  {contextVariableNames.map(varName => {
                    const isUsed = isContextVariableUsed(varName)
                    const contextKey = varName.replace('context.', '')
                    const hasValue = !!(context[contextKey as keyof typeof context] as string | undefined)

                    return (
                      <button
                        key={varName}
                        type="button"
                        onClick={() => insertVariable(varName)}
                        disabled={previewMode}
                        className={cn(
                          "font-mono text-xs px-1.5 py-0.5 rounded transition-colors cursor-pointer",
                          "hover:opacity-80 active:scale-95",
                          "disabled:cursor-not-allowed disabled:opacity-50",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                          // Red when used but missing value (warning)
                          // Blue when used and has value
                          // Grey when not used
                          isUsed && !hasValue
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                            : isUsed && hasValue
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30'
                              : 'bg-muted/50 text-muted-foreground border border-border hover:bg-muted/70'
                        )}
                        title={
                          isUsed && !hasValue
                            ? 'Context variable used but not set - Set it in Context tab'
                            : isUsed
                              ? 'Variable is used in prompt'
                              : 'Click to insert variable'
                        }
                        aria-label={
                          isUsed && !hasValue
                            ? `Context variable ${varName} is used in prompt but not set. Set it in Context tab or click to insert`
                            : `Insert variable ${varName} into prompt`
                        }
                      >
                        {`{{${varName}}}`}
                      </button>
                    )
                  })}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

