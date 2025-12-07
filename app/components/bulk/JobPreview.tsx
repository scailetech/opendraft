'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Sparkles, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import type { OutputColumn } from '@/hooks/useManualJobOptimizer'
import { ProgressBar } from '@/components/ui/progress-bar'

interface JobPreviewProps {
  optimizedPrompt?: string
  setOptimizedPrompt: (prompt: string) => void
  outputColumns?: OutputColumn[]
  suggestedInputColumns?: string[]
  suggestedTools?: string[]
  reasoning?: string | null
  isOptimizing: boolean
  onAccept: () => void
  onReject: () => void
  isExiting?: boolean
  /** CSV columns for variable validation highlighting */
  csvColumns?: string[]
}

/**
 * ABOUTME: Displays editable AI-optimized job preview with accept/reject buttons
 * ABOUTME: User can edit the suggestion before accepting it
 * ABOUTME: Mobile-optimized with auto-expanding textarea and collapsible sections
 */
export function JobPreview({
  optimizedPrompt,
  setOptimizedPrompt,
  outputColumns = [],
  suggestedInputColumns = [],
  suggestedTools = [],
  // reasoning - removed verbose reasoning display (too much text)
  isOptimizing,
  onAccept,
  onReject,
  isExiting = false,
  csvColumns = [],
}: JobPreviewProps) {
  const estimatedDuration = 8000 // 8 seconds average (doubled from 4s)
  const [startTime, setStartTime] = useState<number | undefined>(undefined)
  const [isPromptExpanded, setIsPromptExpanded] = useState(true)
  const [isColumnsExpanded, setIsColumnsExpanded] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Set start time when optimization begins
  useEffect(() => {
    if (isOptimizing && !startTime) {
      setStartTime(Date.now())
    } else if (!isOptimizing) {
      setStartTime(undefined)
    }
  }, [isOptimizing, startTime])

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea && optimizedPrompt) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto'
      // Set to scrollHeight, capped at max-height via CSS
      const newHeight = Math.min(textarea.scrollHeight, 200) // Max 200px
      textarea.style.height = `${newHeight}px`
    }
  }, [optimizedPrompt])

  // Highlighted prompt with variable validation colors
  const highlightedPrompt = useMemo(() => {
    if (!optimizedPrompt) return ''
    
    // Escape HTML first
    let result = optimizedPrompt
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    
    // Highlight {{variables}} with colors based on validity
    result = result.replace(/\{\{([^}]+)\}\}/g, (_match, varName) => {
      const trimmedVar = varName.trim()
      const isValid = csvColumns.some(col => col.toLowerCase() === trimmedVar.toLowerCase())
      // Green for valid CSV column, red/orange for invalid
      const colorClass = isValid ? 'text-green-400' : 'text-amber-400'
      return `<span class="${colorClass} font-medium">{{${varName}}}</span>`
    })
    
    // Convert newlines to <br>
    return result.replace(/\n/g, '<br>')
  }, [optimizedPrompt, csvColumns])

  if (isOptimizing) {
    return (
      <div data-testid="job-preview" className="mt-3 p-6 sm:p-8 rounded-lg bg-primary/10 border border-primary/20">
        <div className="w-full max-w-sm mx-auto space-y-6 text-center">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-primary animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-base font-medium text-primary/90">Analyzing your job...</p>
            <p className="text-sm text-muted-foreground">AI is generating optimizations for your prompt and output fields</p>
          </div>
          {/* Animated progress bar */}
          <ProgressBar
            isActive={isOptimizing}
            estimatedDuration={estimatedDuration}
            startTime={startTime}
            height="md"
          />
        </div>
      </div>
    )
  }

  // Show preview if any optimization exists or if tools section should be shown
  if (!optimizedPrompt && outputColumns.length === 0 && suggestedInputColumns.length === 0 && suggestedTools.length === 0) {
    return null
  }

  const hasColumns = suggestedInputColumns.length > 0 || outputColumns.length > 0

  return (
    <div
      data-testid="job-preview"
      className={`mt-3 rounded-lg bg-primary/10 border border-primary/20 overflow-hidden transition-opacity duration-200 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Sticky Header with Actions - Always visible */}
      <div className="sticky top-0 z-10 flex items-center justify-between p-3 sm:p-4 bg-primary/15 border-b border-primary/20 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary/90">AI Suggestion</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onReject}
            className="flex items-center justify-center w-9 h-9 sm:w-8 sm:h-8 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-md transition-all active:scale-95"
            title="Dismiss suggestion"
            aria-label="Dismiss suggestion"
          >
            <X className="h-4 w-4 sm:h-4 sm:w-4" />
          </button>
          <button
            onClick={onAccept}
            className="flex items-center gap-1.5 px-4 py-2 sm:px-3 sm:py-1.5 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-all active:scale-95 shadow-sm"
            aria-label="Apply suggestion"
          >
            <Check className="h-4 w-4" />
            <span>Apply</span>
          </button>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="max-h-[50vh] sm:max-h-none overflow-y-auto p-3 sm:p-4 space-y-4">
        {/* Collapsible Columns Section */}
        {hasColumns && (
          <div className="space-y-2">
            <button
              onClick={() => setIsColumnsExpanded(!isColumnsExpanded)}
              className="flex items-center gap-2 text-sm font-medium text-primary/90 hover:text-primary transition-colors w-full text-left"
              aria-expanded={isColumnsExpanded}
            >
              {isColumnsExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              <span>Suggested Columns</span>
              <span className="text-xs text-muted-foreground font-normal">
                ({suggestedInputColumns.length} input, {outputColumns.length} output)
              </span>
            </button>
            
            {isColumnsExpanded && (
              <div className="space-y-3 pl-6">
                {/* Suggested Input Columns */}
                {suggestedInputColumns.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-primary/80 font-medium">Input Columns:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestedInputColumns.map((column, index) => (
                        <div
                          key={index}
                          data-testid="input-column"
                          className="text-xs bg-primary/20 text-primary/80 px-2.5 py-1.5 rounded-md border border-primary/30"
                        >
                          {column}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Output Columns */}
                {outputColumns.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-primary/80 font-medium">Output Columns:</p>
                    <div className="space-y-1.5">
                      {outputColumns.map((column, index) => (
                        <div
                          key={index}
                          data-testid="output-column"
                          className="text-xs bg-primary/20 text-primary/80 px-2.5 py-2 rounded-md border border-primary/30"
                        >
                          <span className="font-mono font-medium">{column.name}</span>
                          {column.description && (
                            <span className="text-primary/60 ml-1.5">— {column.description}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Editable Optimized Prompt - Auto-expanding */}
        {optimizedPrompt && (
          <div className="space-y-2">
            <button
              onClick={() => setIsPromptExpanded(!isPromptExpanded)}
              className="flex items-center gap-2 text-sm font-medium text-primary/90 hover:text-primary transition-colors w-full text-left"
              aria-expanded={isPromptExpanded}
            >
              {isPromptExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              <span>Optimized Prompt</span>
              <span className="text-xs text-muted-foreground font-normal">(editable)</span>
            </button>
            
            {isPromptExpanded && (
              <div className="pl-6">
                {/* Editable textarea with highlighted overlay */}
                <div className="relative">
                  {/* Highlighted overlay (shows colored variables) */}
                  <div
                    className="absolute inset-0 text-sm font-mono p-3 pointer-events-none whitespace-pre-wrap break-words overflow-hidden text-gray-200"
                    style={{ minHeight: '80px', maxHeight: '200px' }}
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{ __html: highlightedPrompt }}
                  />
                  {/* Actual editable textarea (transparent text, visible caret) */}
                  <textarea
                    ref={textareaRef}
                    data-testid="optimized-prompt"
                    value={optimizedPrompt}
                    onChange={(e) => setOptimizedPrompt(e.target.value)}
                    className="w-full text-sm font-mono bg-secondary/70 p-3 rounded-md border border-primary/20 focus:border-primary/40 focus:ring-1 focus:ring-primary/20 focus:outline-none resize-none overflow-y-auto text-transparent caret-foreground selection:bg-primary/30 selection:text-foreground relative"
                    style={{ minHeight: '80px', maxHeight: '200px' }}
                    placeholder="Your optimized prompt will appear here..."
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Suggested Tools */}
        <div className="space-y-2">
          <p className="text-sm text-primary/90 font-medium flex items-center gap-2">
            <span>Suggested Tools</span>
            {suggestedTools.length > 0 && (
              <span className="text-xs bg-primary/20 text-primary/70 px-1.5 py-0.5 rounded">
                {suggestedTools.length}
              </span>
            )}
          </p>
          {suggestedTools.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {suggestedTools.map((tool, index) => (
                <div
                  key={index}
                  data-testid="suggested-tool"
                  className="text-xs bg-primary/20 text-primary/80 px-2.5 py-1.5 rounded-md border border-primary/30"
                >
                  {tool}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/60 italic">No tools suggested</p>
          )}
        </div>
      </div>
    </div>
  )
}
